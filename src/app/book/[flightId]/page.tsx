"use client"
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'

export default function BookingPage() {
  const params = useParams()
  const flightId = params.flightId as string
  const router = useRouter()

  const [flight, setFlight] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [passengerName, setPassengerName] = useState('')
  const [passengerAge, setPassengerAge] = useState('')
  const [passengerGender, setPassengerGender] = useState('')

  useEffect(() => {
    const fetchFlightAndUser = async () => {
      // Fetch flight
      const { data: flightData } = await supabase.from('flights').select('*').eq('id', flightId).single()
      setFlight(flightData)
  
      // Fetch logged-in user ID
      const { data: authData } = await supabase.auth.getUser()
      const userId = authData.user?.id
  
      if (userId) {
        const { data: userProfile } = await supabase.from('users').select('name').eq('id', userId).single()
        if (userProfile?.name) {
          setPassengerName(userProfile.name) // ✅ Autofill name
        }
      }
  
      setLoading(false)
    }
  
    fetchFlightAndUser()
  }, [flightId])

  const handleBooking = async () => {
    const user = (await supabase.auth.getUser()).data.user
    if (!user) {
      alert('Not logged in.')
      return
    }

    const booking = {
      user_id: user.id,
      flight_id: flightId,
      passengers: [
        {
          name: passengerName,
          age: passengerAge,
          gender: passengerGender,
        },
      ],
      cabin_class: flight.cabin_class,
      total_price: flight.price,
      trip_type: 'one-way',
      status: 'confirmed',
      payment_method: 'card',
      payment_status: 'success',
      transaction_id: `txn_${Date.now()}`,
      paid_at: new Date().toISOString(),
    }

    const { error } = await supabase.from('bookings').insert([booking])
    if (error) {
      alert(`Booking failed: ${error.message}`)
    } else {
      alert('Booking confirmed!')
      router.push('/')
    }
  }

  if (loading) return <p className="p-6">Loading flight...</p>
  if (!flight) return <p className="p-6 text-red-500">Flight not found.</p>

  return (
    <div className="p-6 space-y-6">
      <div className="p-4 border rounded shadow">
        <h2 className="text-xl font-bold">{flight.airline} – {flight.flight_number}</h2>
        <p>{flight.origin} → {flight.destination}</p>
        <p>Departure: {new Date(flight.departure_time).toLocaleString()}</p>
        <p>Arrival: {new Date(flight.arrival_time).toLocaleString()}</p>
        <p>Cabin Class: {flight.cabin_class}</p>
        <p className="font-bold">Price: ₹{flight.price}</p>
      </div>

      <div className="p-4 border rounded shadow space-y-4">
        <h3 className="text-lg font-semibold">Passenger Information</h3>
        <input
          className="w-full p-2 border rounded"
          placeholder="Name"
          value={passengerName}
          onChange={(e) => setPassengerName(e.target.value)}
        />
        <input
          className="w-full p-2 border rounded"
          placeholder="Age"
          type="number"
          value={passengerAge}
          onChange={(e) => setPassengerAge(e.target.value)}
        />
        <select
          className="w-full p-2 border rounded"
          value={passengerGender}
          onChange={(e) => setPassengerGender(e.target.value)}
        >
          <option value="">Select Gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </select>
        <button
          onClick={handleBooking}
          className="w-full bg-green-600 text-white py-2 rounded"
        >
          Book Now
        </button>
      </div>
    </div>
  )
}
