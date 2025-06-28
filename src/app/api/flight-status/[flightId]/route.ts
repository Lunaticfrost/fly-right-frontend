import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { Notifications } from '@/lib/notifications';

interface Flight {
  id: string;
  status?: string;
  flight_number?: string;
  airline?: string;
  origin?: string;
  destination?: string;
  departure_time?: string;
  arrival_time?: string;
  price?: number;
  cabin_class?: string;
  available_seats?: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { flightId: string } }
) {
  const flightId = params.flightId;
  console.log('SSE API called for flightId:', flightId);

  // Set up SSE headers
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Send initial status
      try {
        console.log('Fetching flight status for:', flightId);
        
        const { data: flight, error } = await supabase
          .from('flights')
          .select('*')
          .eq('id', flightId)
          .single();

        console.log('Supabase response:', { flight, error });

        if (error) {
          console.error('Error fetching flight status:', error);
          controller.enqueue(encoder.encode(`data: Error: ${error.message}\n\n`));
        } else if (!flight) {
          console.error('Flight not found:', flightId);
          controller.enqueue(encoder.encode(`data: Flight not found\n\n`));
        } else {
          // Check if flightStatus field exists, otherwise use a default
          const status = (flight as Flight).status || 'Scheduled';
          console.log('Sending initial status:', status, 'Available fields:', Object.keys(flight));
          controller.enqueue(encoder.encode(`data: ${status}\n\n`));
        }
      } catch (error) {
        console.error('Error in SSE:', error);
        controller.enqueue(encoder.encode(`data: Error: ${error instanceof Error ? error.message : 'Unknown error'}\n\n`));
      }

      // Set up real-time subscription
      try {
        console.log('Setting up real-time subscription for flight:', flightId);
        
        let previousStatus = 'Scheduled';
        
        const subscription = supabase
          .channel(`flight-status-${flightId}`)
          .on(
            'postgres_changes',
            {
              event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
              schema: 'public',
              table: 'flights',
              filter: `id=eq.${flightId}`,
            },
            async (payload) => {
              console.log('Real-time payload received:', payload);
              const newStatus = (payload.new as Flight)?.status || 'Scheduled';
              console.log('Flight status updated via real-time:', newStatus);
              
              // Send email notification if status changed
              if (newStatus !== previousStatus) {
                try {
                  await Notifications.onFlightStatusChanged(flightId, previousStatus, newStatus);
                  console.log('Flight status change notification sent');
                } catch (notificationError) {
                  console.error('Failed to send flight status notification:', notificationError);
                }
                previousStatus = newStatus;
              }
              
              controller.enqueue(encoder.encode(`data: ${newStatus}\n\n`));
            }
          )
          .subscribe((status, error) => {
            console.log('Subscription status:', status);
            if (error) {
              console.error('Subscription error:', error);
              controller.enqueue(encoder.encode(`data: Subscription Error: ${error.message}\n\n`));
            }
          });

        // Keep connection alive
        const keepAlive = setInterval(() => {
          controller.enqueue(encoder.encode(`data: ping\n\n`));
        }, 30000); // Send ping every 30 seconds

        // Manual polling fallback (in case real-time doesn't work)
        let lastStatus = 'Scheduled';
        const pollStatus = setInterval(async () => {
          try {
            const { data: currentFlight, error } = await supabase
              .from('flights')
              .select('status')
              .eq('id', flightId)
              .single();
            
            if (!error && currentFlight && (currentFlight as Flight).status !== lastStatus) {
              console.log('Status changed via polling:', (currentFlight as Flight).status);
              
              // Send email notification if status changed
              try {
                await Notifications.onFlightStatusChanged(flightId, lastStatus, (currentFlight as Flight).status || 'Scheduled');
                console.log('Flight status change notification sent via polling');
              } catch (notificationError) {
                console.error('Failed to send flight status notification:', notificationError);
              }
              
              lastStatus = (currentFlight as Flight).status || 'Scheduled';
              controller.enqueue(encoder.encode(`data: ${(currentFlight as Flight).status}\n\n`));
            }
          } catch (pollError) {
            console.error('Polling error:', pollError);
          }
        }, 10000); // Check every 10 seconds

        // Cleanup function
        return () => {
          console.log('Cleaning up SSE connection for flight:', flightId);
          clearInterval(keepAlive);
          clearInterval(pollStatus);
          subscription.unsubscribe();
        };
      } catch (subscriptionError) {
        console.error('Error setting up subscription:', subscriptionError);
        controller.enqueue(encoder.encode(`data: Subscription Error\n\n`));
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
} 