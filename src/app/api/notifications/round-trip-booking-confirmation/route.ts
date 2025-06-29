import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { sendRoundTripBookingConfirmation, RoundTripBookingConfirmationData } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { departureBookingId, returnBookingId } = await request.json()

    if (!departureBookingId || !returnBookingId) {
      return NextResponse.json(
        { error: 'Both departure and return booking IDs are required' },
        { status: 400 }
      )
    }

    // Fetch departure booking details
    const { data: departureBooking, error: departureError } = await supabase
      .from("bookings")
      .select(`
        *,
        flights (
          flight_number,
          airline,
          origin,
          destination,
          departure_time,
          arrival_time,
          cabin_class
        ),
        users (
          email,
          name
        )
      `)
      .eq('id', departureBookingId)
      .single()

    if (departureError || !departureBooking) {
      return NextResponse.json(
        { error: 'Departure booking not found' },
        { status: 404 }
      )
    }

    // Fetch return booking details
    const { data: returnBooking, error: returnError } = await supabase
      .from("bookings")
      .select(`
        *,
        flights (
          flight_number,
          airline,
          origin,
          destination,
          departure_time,
          arrival_time,
          cabin_class
        ),
        users (
          email,
          name
        )
      `)
      .eq('id', returnBookingId)
      .single()

    if (returnError || !returnBooking) {
      return NextResponse.json(
        { error: 'Return booking not found' },
        { status: 404 }
      )
    }

    // Prepare email data
    const emailData: RoundTripBookingConfirmationData = {
      departureBookingId: departureBooking.id,
      returnBookingId: returnBooking.id,
      passengerName: departureBooking.users?.name || departureBooking.passengers[0]?.name || 'Passenger',
      passengerEmail: departureBooking.users?.email || '',
      
      // Departure flight details
      departureFlightNumber: departureBooking.flights?.flight_number || '',
      departureAirline: departureBooking.flights?.airline || '',
      departureOrigin: departureBooking.flights?.origin || '',
      departureDestination: departureBooking.flights?.destination || '',
      departureTime: departureBooking.flights?.departure_time || '',
      departureArrivalTime: departureBooking.flights?.arrival_time || '',
      departureCabinClass: departureBooking.cabin_class || departureBooking.flights?.cabin_class || '',
      departurePrice: departureBooking.total_price || 0,
      
      // Return flight details
      returnFlightNumber: returnBooking.flights?.flight_number || '',
      returnAirline: returnBooking.flights?.airline || '',
      returnOrigin: returnBooking.flights?.origin || '',
      returnDestination: returnBooking.flights?.destination || '',
      returnTime: returnBooking.flights?.departure_time || '',
      returnArrivalTime: returnBooking.flights?.arrival_time || '',
      returnCabinClass: returnBooking.cabin_class || returnBooking.flights?.cabin_class || '',
      returnPrice: returnBooking.total_price || 0,
      
      passengers: departureBooking.passengers || [],
      totalPrice: (departureBooking.total_price || 0) + (returnBooking.total_price || 0),
      bookingDate: departureBooking.created_at || new Date().toISOString(),
    }

    // Send email
    const emailSent = await sendRoundTripBookingConfirmation(emailData)

    if (!emailSent) {
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      )
    }

    // Log the notification for departure booking
    await supabase
      .from('email_notifications')
      .insert({
        booking_id: departureBookingId,
        type: 'round_trip_booking_confirmation',
        recipient_email: emailData.passengerEmail,
        sent_at: new Date().toISOString(),
        status: 'sent',
        metadata: {
          returnBookingId,
          totalPrice: emailData.totalPrice,
        },
      })

    // Log the notification for return booking
    await supabase
      .from('email_notifications')
      .insert({
        booking_id: returnBookingId,
        type: 'round_trip_booking_confirmation',
        recipient_email: emailData.passengerEmail,
        sent_at: new Date().toISOString(),
        status: 'sent',
        metadata: {
          departureBookingId,
          totalPrice: emailData.totalPrice,
        },
      })

    return NextResponse.json({
      success: true,
      message: 'Round-trip booking confirmation email sent successfully',
    })
  } catch (error) {
    console.error('Error sending round-trip booking confirmation email:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 