import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { sendFlightUpdate, FlightUpdateData } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { flightId, oldStatus, newStatus } = await request.json()

    if (!flightId || !oldStatus || !newStatus) {
      return NextResponse.json(
        { error: 'Flight ID, old status, and new status are required' },
        { status: 400 }
      )
    }

    // Fetch all bookings for this flight
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        *,
        flights (
          flight_number,
          airline,
          origin,
          destination,
          departure_time,
          arrival_time
        ),
        users (
          email,
          name
        )
      `)
      .eq('flight_id', flightId)

    if (bookingsError || !bookings || bookings.length === 0) {
      return NextResponse.json(
        { error: 'No bookings found for this flight' },
        { status: 404 }
      )
    }

    const updateTime = new Date().toISOString()
    const emailPromises = []

    // Send emails to all passengers
    for (const booking of bookings) {
      const emailData: FlightUpdateData = {
        bookingId: booking.id,
        passengerName: booking.users?.name || booking.passengers[0]?.name || 'Passenger',
        passengerEmail: booking.users?.email || '',
        flightNumber: booking.flights?.flight_number || '',
        airline: booking.flights?.airline || '',
        origin: booking.flights?.origin || '',
        destination: booking.flights?.destination || '',
        departureTime: booking.flights?.departure_time || '',
        arrivalTime: booking.flights?.arrival_time || '',
        oldStatus,
        newStatus,
        updateTime,
      }

      // Only send if we have an email address
      if (emailData.passengerEmail) {
        emailPromises.push(
          sendFlightUpdate(emailData).then(async (success) => {
            // Log the notification
            await supabase
              .from('email_notifications')
              .insert({
                booking_id: booking.id,
                type: 'flight_update',
                recipient_email: emailData.passengerEmail,
                sent_at: updateTime,
                status: success ? 'sent' : 'failed',
                metadata: {
                  oldStatus,
                  newStatus,
                  flightId,
                },
              })
            return success
          })
        )
      }
    }

    // Wait for all emails to be sent
    const results = await Promise.all(emailPromises)
    const successCount = results.filter(Boolean).length
    const totalCount = emailPromises.length

    return NextResponse.json({
      success: true,
      message: `Flight update emails sent: ${successCount}/${totalCount} successful`,
      sent: successCount,
      total: totalCount,
    })
  } catch (error) {
    console.error('Error sending flight update emails:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 