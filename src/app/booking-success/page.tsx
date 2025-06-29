"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import LoadingButton from '@/components/LoadingButton'
import { useRouter } from "next/navigation";

interface Passenger {
  name: string;
  age: number;
  gender: string;
}

interface Flight {
  id: string;
  airline: string;
  flight_number: string;
  origin: string;
  destination: string;
  departure_time: string;
  arrival_time: string;
  price: number;
  cabin_class: string;
  available_seats: number;
  status: string;
}

interface Booking {
  id: string;
  flight_id: string;
  passengers: Passenger[];
  cabin_class: string;
  total_price: number;
  payment_method: string;
  payment_status: string;
  transaction_id: string;
  paid_at: string;
  trip_type: string;
  user_id: string;
  booking_date: string;
}

function BookingSuccessContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("bookingId");
  const isRoundTrip = searchParams.get("roundTrip") === "true";

  const [booking, setBooking] = useState<Booking | null>(null);
  const [flight, setFlight] = useState<Flight | null>(null);
  const [returnBooking, setReturnBooking] = useState<Booking | null>(null);
  const [returnFlight, setReturnFlight] = useState<Flight | null>(null);
  const [loading, setLoading] = useState(true);
  const [flightStatus, setFlightStatus] = useState('Loading...')
  const [isRoundTripBooking, setIsRoundTripBooking] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchBooking = async () => {
      if (!bookingId) return;

      const { data: bookingData, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", bookingId)
        .single();

      if (error) {
        console.error('Error fetching booking:', error);
        setLoading(false);
        return;
      }

      if (bookingData) {
        setBooking(bookingData);

        // Get flight info
        const { data: flightData } = await supabase
          .from("flights")
          .select("*")
          .eq("id", bookingData.flight_id)
          .single();

        setFlight(flightData);

        // Check if this is a round-trip booking (either from URL param or booking data)
        const isRoundTripBooking = isRoundTrip || bookingData.trip_type === "round-trip";
        setIsRoundTripBooking(isRoundTripBooking);
        
        console.log('Round trip detection:', { 
          isRoundTrip, 
          tripType: bookingData.trip_type, 
          isRoundTripBooking,
          transactionId: bookingData.transaction_id,
          bookingId: bookingData.id,
          userId: bookingData.user_id
        });
        
        if (isRoundTripBooking) {
          // Debug: Check all round-trip bookings for this user
          const { data: allRoundTripBookings } = await supabase
            .from("bookings")
            .select("*")
            .eq("user_id", bookingData.user_id)
            .eq("trip_type", "round-trip");
            
          console.log('All round-trip bookings for user:', allRoundTripBookings);
          
          // Find the return booking for this user with round-trip type
          // Use transaction ID pattern to link departure and return bookings
          const currentTransactionId = bookingData.transaction_id;
          const isDeparture = currentTransactionId?.includes('_dep');
          
          console.log('Transaction analysis:', {
            currentTransactionId,
            isDeparture
          });
          
          let returnBookingData = null;
          
          if (isDeparture) {
            // This is departure booking, find the return booking
            const returnTransactionId = currentTransactionId.replace('_dep', '_ret');
            
            console.log('Looking for return booking with transaction ID:', returnTransactionId);
            
            const { data: returnData } = await supabase
              .from("bookings")
              .select("*")
              .eq("user_id", bookingData.user_id)
              .eq("transaction_id", returnTransactionId)
              .single();
              
            returnBookingData = returnData;
          } else {
            // This is return booking, find the departure booking
            const departureTransactionId = currentTransactionId?.replace('_ret', '_dep');
            
            console.log('Looking for departure booking with transaction ID:', departureTransactionId);
            
            const { data: departureData } = await supabase
              .from("bookings")
              .select("*")
              .eq("user_id", bookingData.user_id)
              .eq("transaction_id", departureTransactionId)
              .single();
              
            returnBookingData = departureData;
          }

          console.log('Return booking data:', returnBookingData);

          if (returnBookingData) {
            setReturnBooking(returnBookingData);

            // Get return flight info
            const { data: returnFlightData } = await supabase
              .from("flights")
              .select("*")
              .eq("id", returnBookingData.flight_id)
              .single();

            console.log('Return flight data:', returnFlightData);
            setReturnFlight(returnFlightData);
          } else {
            // Fallback: try to find by booking date proximity
            console.log('Trying fallback method to find return booking...');
            
            const bookingDate = new Date(bookingData.booking_date);
            const timeWindow = 5 * 60 * 1000; // 5 minutes window
            
            const { data: nearbyBookings } = await supabase
              .from("bookings")
              .select("*")
              .eq("user_id", bookingData.user_id)
              .eq("trip_type", "round-trip")
              .neq("id", bookingId)
              .gte("booking_date", new Date(bookingDate.getTime() - timeWindow).toISOString())
              .lte("booking_date", new Date(bookingDate.getTime() + timeWindow).toISOString());

            console.log('Nearby bookings:', nearbyBookings);
            
            if (nearbyBookings && nearbyBookings.length > 0) {
              const returnBooking = nearbyBookings[0];
              setReturnBooking(returnBooking);

              const { data: returnFlightData } = await supabase
                .from("flights")
                .select("*")
                .eq("id", returnBooking.flight_id)
                .single();

              console.log('Return flight data (fallback):', returnFlightData);
              setReturnFlight(returnFlightData);
            }
          }
        }
      }

      setLoading(false);
    };

    fetchBooking();
  }, [bookingId, isRoundTrip]);

  useEffect(() => {
    if (!booking?.flight_id) return
  
    const eventSource = new EventSource(`/api/flight-status/${booking.flight_id}`)
    console.log("Connecting to SSE for flight:", booking.flight_id)
  
    eventSource.onmessage = (event) => {
      console.log("SSE message received:", event.data)
      if (event.data !== 'ping') {
        setFlightStatus(event.data)
      }
    }

    eventSource.onerror = (error) => {
      console.error("SSE connection error:", error)
      setFlightStatus('Connection Error')
    }

    eventSource.onopen = () => {
      console.log("SSE connection opened")
    }
  
    return () => {
      console.log("Closing SSE connection")
      eventSource.close()
    }
  }, [booking])

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  // Calculate flight duration in hours and minutes
  const calculateFlightDuration = (departureTime: string, arrivalTime: string) => {
    const departure = new Date(departureTime);
    const arrival = new Date(arrivalTime);
    const durationMs = arrival.getTime() - departure.getTime();
    const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
    const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (durationHours > 0) {
      return `${durationHours}h ${durationMinutes}m`;
    } else {
      return `${durationMinutes}m`;
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading your ticket...</p>
          </div>
        </div>
      </>
    );
  }

  if (!booking || !flight) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
          <div className="text-center bg-white rounded-2xl shadow-xl p-12">
            <div className="text-6xl mb-6">❌</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Booking Not Found
            </h1>
            <p className="text-gray-600 mb-8">
              The booking you&apos;re looking for doesn&apos;t exist.
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* Success Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
              <span className="text-4xl">🎉</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              {isRoundTripBooking ? 'Round Trip' : 'Booking'} Confirmed!
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Your {isRoundTripBooking ? 'round trip flights have been' : 'flight has been'} successfully booked. Your e-ticket is ready
              below.
            </p>
          </div>

          {/* E-Ticket */}
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100 print:shadow-none print:border-2 print:border-gray-300">
            {/* Ticket Header */}
            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-8 print:bg-green-600">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold mb-2">E-Ticket</h2>
                  <p className="text-green-100">Booking ID: {booking.id}</p>
                  {isRoundTripBooking && (
                    <p className="text-green-100 mt-1">Round Trip Booking</p>
                  )}
                </div>
                <div className="text-right">
                  <div className="bg-white/20 rounded-full px-4 py-2 text-sm font-medium">
                    ✅ Confirmed
                  </div>
                </div>
              </div>
            </div>

            {/* Flight Details */}
            <div className="p-8 print:p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8 print:grid-cols-1 print:gap-6">
                {/* Flight Info */}
                <div className="space-y-6 print:space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center print:text-base">
                      <span className="mr-2">✈️</span>
                      Departure Flight Details
                    </h3>
                    <div className="bg-blue-50 rounded-lg p-4 print:bg-white print:border print:border-blue-200">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-bold text-lg text-gray-900 print:text-base">
                          {flight.airline} - {flight.flight_number}
                        </h4>
                        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                          {booking.cabin_class}
                        </span>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          flightStatus === 'Delayed' || flightStatus === 'Cancelled'
                            ? 'bg-red-100 text-red-800'
                            : flightStatus === 'Boarding' || flightStatus === 'Departed'
                            ? 'bg-yellow-100 text-yellow-800'
                            : flightStatus === 'On Time' || flightStatus === 'Scheduled'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {flightStatus}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-gray-900 print:text-xl">
                            {formatTime(flight.departure_time)}
                          </p>
                          <p className="text-sm text-gray-600">
                            {flight.origin}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDate(flight.departure_time)}
                          </p>
                        </div>

                        <div className="flex-1 mx-4">
                          <div className="flex items-center">
                            <div className="flex-1 h-0.5 bg-gray-300"></div>
                            <div className="mx-2 text-gray-400">✈️</div>
                            <div className="flex-1 h-0.5 bg-gray-300"></div>
                          </div>
                        </div>

                        <div className="text-center">
                          <p className="text-2xl font-bold text-gray-900 print:text-xl">
                            {formatTime(flight.arrival_time)}
                          </p>
                          <p className="text-sm text-gray-600">
                            {flight.destination}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDate(flight.arrival_time)}
                          </p>
                        </div>
                      </div>

                      {/* Flight Duration */}
                      <div className="mt-4 pt-3 border-t border-blue-200">
                        <div className="flex items-center justify-center space-x-2">
                          <span className="text-blue-600">⏱️</span>
                          <span className="text-sm font-medium text-gray-700">
                            Flight Duration: {calculateFlightDuration(flight.departure_time, flight.arrival_time)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Return Flight Info (for round-trip) */}
                  {isRoundTripBooking && returnFlight && (
                    <div className="print:break-inside-avoid">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center print:text-base">
                        <span className="mr-2">🔄</span>
                        Return Flight Details
                      </h3>
                      <div className="bg-green-50 rounded-lg p-4 print:bg-white print:border print:border-green-200">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-bold text-lg text-gray-900 print:text-base">
                            {returnFlight.airline} - {returnFlight.flight_number}
                          </h4>
                          <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                            {returnBooking?.cabin_class || returnFlight.cabin_class}
                          </span>
                          <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                            Scheduled
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="text-center">
                            <p className="text-2xl font-bold text-gray-900 print:text-xl">
                              {formatTime(returnFlight.departure_time)}
                            </p>
                            <p className="text-sm text-gray-600">
                              {returnFlight.origin}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatDate(returnFlight.departure_time)}
                            </p>
                          </div>

                          <div className="flex-1 mx-4">
                            <div className="flex items-center">
                              <div className="flex-1 h-0.5 bg-gray-300"></div>
                              <div className="mx-2 text-gray-400">✈️</div>
                              <div className="flex-1 h-0.5 bg-gray-300"></div>
                            </div>
                          </div>

                          <div className="text-center">
                            <p className="text-2xl font-bold text-gray-900 print:text-xl">
                              {formatTime(returnFlight.arrival_time)}
                            </p>
                            <p className="text-sm text-gray-600">
                              {returnFlight.destination}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatDate(returnFlight.arrival_time)}
                            </p>
                          </div>
                        </div>

                        {/* Flight Duration */}
                        <div className="mt-4 pt-3 border-t border-green-200">
                          <div className="flex items-center justify-center space-x-2">
                            <span className="text-green-600">⏱️</span>
                            <span className="text-sm font-medium text-gray-700">
                              Flight Duration: {calculateFlightDuration(returnFlight.departure_time, returnFlight.arrival_time)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Passenger Info */}
                  <div className="print:break-inside-avoid">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center print:text-base">
                      <span className="mr-2">👥</span>
                      Passenger Information
                    </h3>
                    <div className="space-y-3">
                      {booking.passengers?.map((passenger: Passenger, index: number) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-4 print:bg-white print:border print:border-gray-200">
                          <h4 className="font-medium text-gray-900 mb-2">
                            Passenger {index + 1}
                          </h4>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-gray-500">Name</p>
                              <p className="font-semibold text-gray-900">
                                {passenger.name}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-500">Age</p>
                              <p className="font-semibold text-gray-900">
                                {passenger.age} years
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-500">Gender</p>
                              <p className="font-semibold text-gray-900">
                                {passenger.gender}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Payment & Booking Info */}
                <div className="space-y-6 print:space-y-4">
                  <div className="print:break-inside-avoid">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center print:text-base">
                      <span className="mr-2">💳</span>
                      Payment Details
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3 print:bg-white print:border print:border-gray-200">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Transaction ID:</span>
                        <span className="font-mono text-sm text-gray-900">
                          {booking.transaction_id}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Payment Method:</span>
                        <span className="font-medium text-gray-900">
                          {booking.payment_method}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Payment Status:</span>
                        <span className="font-medium text-green-600">
                          ✅ {booking.payment_status}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Paid At:</span>
                        <span className="font-medium text-gray-900">
                          {new Date(booking.paid_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="print:break-inside-avoid">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center print:text-base">
                      <span className="mr-2">💰</span>
                      Cost Breakdown
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3 print:bg-white print:border print:border-gray-200">
                      {isRoundTripBooking && returnFlight && returnBooking ? (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Departure Flight:</span>
                            <span className="font-medium text-gray-900">
                              ₹{booking.total_price.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Return Flight:</span>
                            <span className="font-medium text-gray-900">
                              ₹{returnBooking.total_price.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Taxes & Fees:</span>
                            <span className="font-medium text-gray-900">
                              ₹{((booking.total_price + returnBooking.total_price) * 0.1).toFixed(0)}
                            </span>
                          </div>
                          <hr className="border-gray-300" />
                          <div className="flex justify-between">
                            <span className="text-lg font-semibold text-gray-900">
                              Total Paid:
                            </span>
                            <span className="text-xl font-bold text-green-600">
                              ₹{(booking.total_price + returnBooking.total_price + (booking.total_price + returnBooking.total_price) * 0.1).toFixed(0)}
                            </span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Base Fare:</span>
                            <span className="font-medium text-gray-900">
                              ₹{flight.price.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Taxes & Fees:</span>
                            <span className="font-medium text-gray-900">
                              ₹{(flight.price * 0.1).toFixed(0)}
                            </span>
                          </div>
                          <hr className="border-gray-300" />
                          <div className="flex justify-between">
                            <span className="text-lg font-semibold text-gray-900">
                              Total Paid:
                            </span>
                            <span className="text-xl font-bold text-green-600">
                              ₹{booking.total_price.toLocaleString()}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Important Notes */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 print:bg-white print:border-2 print:border-yellow-300">
                <h4 className="font-semibold text-yellow-800 mb-2 flex items-center print:text-base">
                  <span className="mr-2">📋</span>
                  Important Information
                </h4>
                <ul className="text-sm text-yellow-700 space-y-1 print:text-black">
                  <li>
                    • Please arrive at the airport 2 hours before departure for
                    domestic flights
                  </li>
                  <li>• Carry a valid government-issued photo ID</li>
                  <li>• This e-ticket serves as your boarding pass</li>
                  <li>
                    • Keep this ticket safe and accessible during your journey
                  </li>
                  {isRoundTripBooking && (
                    <li>• This is a round-trip booking - keep both flight details</li>
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex space-x-4">
            <LoadingButton
              onClick={() => window.print()}
              variant="secondary"
              className="flex-1"
            >
              🖨️ Print Ticket
            </LoadingButton>
            <LoadingButton
              onClick={() => router.push("/")}
              className="flex-1"
            >
              🏠 Back to Home
            </LoadingButton>
          </div>
        </div>
      </div>
    </>
  );
}

export default function BookingSuccessPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BookingSuccessContent />
    </Suspense>
  );
}
