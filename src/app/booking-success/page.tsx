'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function BookingSuccessPage() {
  const searchParams = useSearchParams()
  const bookingId = searchParams.get('bookingId')

  const [booking, setBooking] = useState<any>(null)
  const [flight, setFlight] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchBooking = async () => {
      if (!bookingId) return

      const { data: bookingData, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single()

      if (bookingData) {
        setBooking(bookingData)

        // Get flight info
        const { data: flightData } = await supabase
          .from('flights')
          .select('*')
          .eq('id', bookingData.flight_id)
          .single()

        setFlight(flightData)
      }

      setLoading(false)
    }

    fetchBooking()
  }, [bookingId])

  if (loading) return <p className="p-6">Loading your ticket...</p>
  if (!booking || !flight) return <p className="p-6 text-red-500">Booking not found.</p>

  const passenger = booking.passengers?.[0] || {}

  return (
    <div className="p-6 max-w-xl mx-auto space-y-6 border rounded shadow">
      <h1 className="text-2xl font-bold text-green-700">🎉 Booking Confirmed!</h1>

      <div className="space-y-1">
        <p><strong>E-Ticket ID:</strong> {booking.id}</p>
        <p><strong>Transaction:</strong> {booking.transaction_id}</p>
        <p><strong>Status:</strong> ✅ {booking.status}</p>
        <p><strong>Paid At:</strong> {new Date(booking.paid_at).toLocaleString()}</p>
      </div>

      <div className="border-t pt-4 space-y-2">
        <h2 className="font-semibold">Flight Details</h2>
        <p>{flight.airline} – {flight.flight_number}</p>
        <p>{flight.origin} → {flight.destination}</p>
        <p>Departure: {new Date(flight.departure_time).toLocaleString()}</p>
        <p>Arrival: {new Date(flight.arrival_time).toLocaleString()}</p>
        <p>Cabin Class: {booking.cabin_class}</p>
        <p>Total Paid: ₹{booking.total_price}</p>
      </div>

      <div className="border-t pt-4 space-y-2">
        <h2 className="font-semibold">Passenger</h2>
        <p>{passenger.name}, {passenger.age} yrs, {passenger.gender}</p>
      </div>
    </div>
  )
}
