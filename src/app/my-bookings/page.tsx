'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState<any[]>([])
  const [flights, setFlights] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const fetchBookings = async () => {
      const user = (await supabase.auth.getUser()).data.user
      if (!user) {
        router.push('/auth/login?redirectTo=/my-bookings')
        return
      }

      const { data: bookingData } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', user.id)
        .order('booking_date', { ascending: false })

      setBookings(bookingData || [])

      // Fetch related flights
      const flightIds = [...new Set((bookingData || []).map(b => b.flight_id))]
      const { data: flightData } = await supabase
        .from('flights')
        .select('*')
        .in('id', flightIds)

      const flightMap = {}
      for (const flight of flightData || []) {
        flightMap[flight.id] = flight
      }

      setFlights(flightMap)
      setLoading(false)
    }

    fetchBookings()
  }, [])

  if (loading) return <p className="p-6">Loading your bookings...</p>
  if (bookings.length === 0) return <p className="p-6">You have no bookings yet.</p>

  return (
    <div className="p-6 space-y-4 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">My Bookings</h1>
      {bookings.map((booking) => {
        const flight = flights[booking.flight_id]
        const passenger = booking.passengers?.[0] || {}

        return (
          <div key={booking.id} className="border rounded p-4 shadow-sm space-y-1">
            <p className="font-semibold">
              {flight?.airline} – {flight?.flight_number} | {flight?.origin} → {flight?.destination}
            </p>
            <p>Departure: {new Date(flight?.departure_time).toLocaleString()}</p>
            <p>Passenger: {passenger.name}, {passenger.age} yrs, {passenger.gender}</p>
            <p>Total: ₹{booking.total_price}</p>
            <p>Status: ✅ {booking.status}</p>
            <button
              className="text-blue-600 underline text-sm mt-2"
              onClick={() => router.push(`/booking-success?bookingId=${booking.id}`)}
            >
              View E-Ticket
            </button>
          </div>
        )
      })}
    </div>
  )
}
