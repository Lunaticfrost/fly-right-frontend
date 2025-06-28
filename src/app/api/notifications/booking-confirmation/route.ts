import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { sendBookingConfirmation, BookingConfirmationData } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { bookingId } = await request.json()

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      )
    }

    // Fetch booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
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
      .eq('id', bookingId)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    // Prepare email data
    const emailData: BookingConfirmationData = {
      bookingId: booking.id,
      passengerName: booking.users?.name || booking.passengers[0]?.name || 'Passenger',
      passengerEmail: booking.users?.email || '',
      flightNumber: booking.flights?.flight_number || '',
      airline: booking.flights?.airline || '',
      origin: booking.flights?.origin || '',
      destination: booking.flights?.destination || '',
      departureTime: booking.flights?.departure_time || '',
      arrivalTime: booking.flights?.arrival_time || '',
      cabinClass: booking.cabin_class || booking.flights?.cabin_class || '',
      totalPrice: booking.total_price || 0,
      passengers: booking.passengers || [],
      bookingDate: booking.created_at || new Date().toISOString(),
    }

    // Send email
    const emailSent = await sendBookingConfirmation(emailData)

    if (!emailSent) {
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      )
    }

    // Log the notification
    await supabase
      .from('email_notifications')
      .insert({
        booking_id: bookingId,
        type: 'booking_confirmation',
        recipient_email: emailData.passengerEmail,
        sent_at: new Date().toISOString(),
        status: 'sent',
      })

    return NextResponse.json({
      success: true,
      message: 'Booking confirmation email sent successfully',
    })
  } catch (error) {
    console.error('Error sending booking confirmation email:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 