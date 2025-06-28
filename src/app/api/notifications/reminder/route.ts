import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { sendReminder, ReminderData } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { daysUntilFlight = 1 } = await request.json()

    // Calculate the target date range for flights
    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() + daysUntilFlight)
    
    const startOfDay = new Date(targetDate)
    startOfDay.setHours(0, 0, 0, 0)
    
    const endOfDay = new Date(targetDate)
    endOfDay.setHours(23, 59, 59, 999)

    // Fetch all bookings for flights departing on the target date
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
          arrival_time,
          cabin_class
        ),
        users (
          email,
          name
        )
      `)
      .gte('flights.departure_time', startOfDay.toISOString())
      .lte('flights.departure_time', endOfDay.toISOString())

    if (bookingsError) {
      return NextResponse.json(
        { error: 'Failed to fetch bookings' },
        { status: 500 }
      )
    }

    if (!bookings || bookings.length === 0) {
      return NextResponse.json({
        success: true,
        message: `No flights found departing in ${daysUntilFlight} day${daysUntilFlight === 1 ? '' : 's'}`,
        sent: 0,
        total: 0,
      })
    }

    const emailPromises = []

    // Send reminder emails to all passengers
    for (const booking of bookings) {
      const emailData: ReminderData = {
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
        daysUntilFlight,
      }

      // Only send if we have an email address
      if (emailData.passengerEmail) {
        emailPromises.push(
          sendReminder(emailData).then(async (success) => {
            // Log the notification
            await supabase
              .from('email_notifications')
              .insert({
                booking_id: booking.id,
                type: 'reminder',
                recipient_email: emailData.passengerEmail,
                sent_at: new Date().toISOString(),
                status: success ? 'sent' : 'failed',
                metadata: {
                  daysUntilFlight,
                  flightId: booking.flight_id,
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
      message: `Reminder emails sent: ${successCount}/${totalCount} successful`,
      sent: successCount,
      total: totalCount,
      daysUntilFlight,
    })
  } catch (error) {
    console.error('Error sending reminder emails:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 