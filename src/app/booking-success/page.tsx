"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";

export default function BookingSuccessPage() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("bookingId");

  const [booking, setBooking] = useState<any>(null);
  const [flight, setFlight] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBooking = async () => {
      if (!bookingId) return;

      const { data: bookingData, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", bookingId)
        .single();

      if (bookingData) {
        setBooking(bookingData);

        // Get flight info
        const { data: flightData } = await supabase
          .from("flights")
          .select("*")
          .eq("id", bookingData.flight_id)
          .single();

        setFlight(flightData);
      }

      setLoading(false);
    };

    fetchBooking();
  }, [bookingId]);

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

  const passenger = booking.passengers?.[0] || {};

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
              Booking Confirmed!
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Your flight has been successfully booked. Your e-ticket is ready
              below.
            </p>
          </div>

          {/* E-Ticket */}
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
            {/* Ticket Header */}
            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-8">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold mb-2">E-Ticket</h2>
                  <p className="text-green-100">Booking ID: {booking.id}</p>
                </div>
                <div className="text-right">
                  <div className="bg-white/20 rounded-full px-4 py-2 text-sm font-medium">
                    ✅ Confirmed
                  </div>
                </div>
              </div>
            </div>

            {/* Flight Details */}
            <div className="p-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Flight Info */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <span className="mr-2">✈️</span>
                      Flight Details
                    </h3>
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-bold text-lg text-gray-900">
                          {flight.airline} - {flight.flight_number}
                        </h4>
                        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                          {booking.cabin_class}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-gray-900">
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
                          <p className="text-2xl font-bold text-gray-900">
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

                  {/* Passenger Info */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <span className="mr-2">👥</span>
                      Passenger Information
                    </h3>
                    <div className="space-y-3">
                      {booking.passengers?.map((passenger: any, index: number) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-4">
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
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <span className="mr-2">💳</span>
                      Payment Details
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
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

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <span className="mr-2">💰</span>
                      Cost Breakdown
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
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
                    </div>
                  </div>
                </div>
              </div>

              {/* Important Notes */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-800 mb-2 flex items-center">
                  <span className="mr-2">📋</span>
                  Important Information
                </h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>
                    • Please arrive at the airport 2 hours before departure for
                    domestic flights
                  </li>
                  <li>• Carry a valid government-issued photo ID</li>
                  <li>• This e-ticket serves as your boarding pass</li>
                  <li>
                    • Keep this ticket safe and accessible during your journey
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => window.print()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-all duration-200 hover:scale-105 shadow-md hover:shadow-lg"
            >
              🖨️ Print Ticket
            </button>
            <button
              onClick={() => (window.location.href = "/")}
              className="bg-gray-600 hover:bg-gray-700 text-white px-8 py-3 rounded-lg font-semibold transition-all duration-200 hover:scale-105 shadow-md hover:shadow-lg"
            >
              🔍 Search More Flights
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
