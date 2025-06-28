"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";

interface Booking {
  id: string;
  user_id: string;
  flight_id: string;
  passengers: any[];
  cabin_class: string;
  total_price: number;
  trip_type: string;
  status: string;
  payment_method: string;
  payment_status: string;
  transaction_id: string;
  paid_at: string;
  booking_date: string;
}

interface Flight {
  id: string;
  flight_number: string;
  airline: string;
  origin: string;
  destination: string;
  departure_time: string;
  arrival_time: string;
  price: number;
  cabin_class: string;
  available_seats?: number;
}

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [flights, setFlights] = useState<Record<string, Flight>>({});
  const [loading, setLoading] = useState(true);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchBookings = async () => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) {
        router.push("/auth/login?redirectTo=/my-bookings");
        return;
      }

      const { data: bookingData } = await supabase
        .from("bookings")
        .select("*")
        .eq("user_id", user.id)
        .order("booking_date", { ascending: false });

      setBookings(bookingData || []);

      // Fetch related flights
      const flightIds = [
        ...new Set((bookingData || []).map((b) => b.flight_id)),
      ];
      const { data: flightData } = await supabase
        .from("flights")
        .select("*")
        .in("id", flightIds);

      const flightMap: Record<string, Flight> = {};
      for (const flight of flightData || []) {
        flightMap[flight.id] = flight;
      }

      setFlights(flightMap);
      setLoading(false);
    };

    fetchBookings();
  }, []);

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
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

  // Check if booking can be modified (within 24 hours of departure)
  const canModifyBooking = (departureTime: string) => {
    const departure = new Date(departureTime);
    const now = new Date();
    const timeDiff = departure.getTime() - now.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    return hoursDiff > 24; // Can modify if more than 24 hours before departure
  };

  // Check if booking can be cancelled (within 2 hours of departure)
  const canCancelBooking = (departureTime: string) => {
    const departure = new Date(departureTime);
    const now = new Date();
    const timeDiff = departure.getTime() - now.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    return hoursDiff > 2; // Can cancel if more than 2 hours before departure
  };

  // Calculate refund amount based on cancellation time
  const calculateRefund = (totalPrice: number, departureTime: string) => {
    const departure = new Date(departureTime);
    const now = new Date();
    const timeDiff = departure.getTime() - now.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    
    if (hoursDiff > 24) {
      return totalPrice * 0.9; // 90% refund if more than 24 hours
    } else if (hoursDiff > 2) {
      return totalPrice * 0.5; // 50% refund if more than 2 hours
    } else {
      return 0; // No refund if less than 2 hours
    }
  };

  // Handle booking cancellation
  const handleCancelBooking = async () => {
    if (!selectedBooking) return;
    
    setCancelling(true);
    try {
      console.log("Cancelling booking:", selectedBooking.id);
      
      const { data, error } = await supabase
        .from("bookings")
        .update({ 
          status: "cancelled"
        })
        .eq("id", selectedBooking.id)
        .select(); // Add select to get the updated data

      if (error) {
        console.error("Cancellation error:", error);
        alert(`Failed to cancel booking: ${error.message}`);
        return;
      }

      // Restore seats to the flight after successful cancellation
      const flight = flights[selectedBooking.flight_id];
      if (flight && flight.available_seats !== undefined) {
        const passengerCount = selectedBooking.passengers?.length || 1;
        const newAvailableSeats = flight.available_seats + passengerCount;
        
        const { error: seatUpdateError } = await supabase
          .from("flights")
          .update({ available_seats: newAvailableSeats })
          .eq("id", selectedBooking.flight_id);

        if (seatUpdateError) {
          console.error("Failed to restore seat availability:", seatUpdateError);
          // Note: In a production system, you might want to handle this more gracefully
          // For now, we'll just log the error since the cancellation was successful
        }
      }
      
      console.log("Booking cancelled successfully:", data);
      
      // Refresh bookings
      const { data: bookingData, error: fetchError } = await supabase
        .from("bookings")
        .select("*")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
        .order("booking_date", { ascending: false });
      
      if (fetchError) {
        console.error("Error fetching updated bookings:", fetchError);
      } else {
        console.log("Updated bookings:", bookingData);
        setBookings(bookingData || []);
      }
      
      setShowCancelModal(false);
      setSelectedBooking(null);
      alert("Booking cancelled successfully!");
    } catch (error) {
      console.error("Cancellation exception:", error);
      alert("An error occurred while cancelling the booking.");
    } finally {
      setCancelling(false);
    }
  };

  // Open cancellation modal
  const openCancelModal = (booking: any) => {
    setSelectedBooking(booking);
    setShowCancelModal(true);
  };

  // Refresh bookings data
  const refreshBookings = async () => {
    setLoading(true);
    try {
      const { data: bookingData, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
        .order("booking_date", { ascending: false });

      if (error) {
        console.error("Error refreshing bookings:", error);
      } else {
        setBookings(bookingData || []);
      }
    } catch (error) {
      console.error("Error refreshing bookings:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading your bookings...</p>
          </div>
        </div>
      </>
    );
  }

  if (bookings.length === 0) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
          <div className="max-w-4xl mx-auto px-6 py-12">
            <div className="text-center bg-white rounded-2xl shadow-xl p-12">
              <div className="text-6xl mb-6">📋</div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                No Bookings Yet
              </h1>
              <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">
                You haven't made any bookings yet. Start exploring flights and
                book your next adventure!
              </p>
              <button
                onClick={() => router.push("/")}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-3 rounded-lg font-semibold transition-all duration-200 hover:scale-105 shadow-md hover:shadow-lg"
              >
                Search Flights
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="max-w-6xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              My Bookings
            </h1>
            <p className="text-xl text-gray-600 mb-6">
              Manage and view all your flight reservations
            </p>
            <button
              onClick={refreshBookings}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 hover:scale-105 shadow-md hover:shadow-lg flex items-center mx-auto space-x-2"
            >
              <span>🔄</span>
              <span>Refresh Bookings</span>
            </button>
          </div>

          {/* Bookings Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {bookings.map((booking) => {
              const flight = flights[booking.flight_id];
              const passenger = booking.passengers?.[0] || {};

              return (
                <div
                  key={booking.id}
                  className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden"
                >
                  {/* Booking Header */}
                  <div className={`p-6 ${
                    booking.status === "cancelled" 
                      ? "bg-gradient-to-r from-red-500 to-red-600" 
                      : "bg-gradient-to-r from-green-500 to-green-600"
                  } text-white`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xl font-bold mb-1">
                          {flight?.airline} - {flight?.flight_number}
                        </h3>
                        <p className="text-green-100">
                          {flight?.origin} → {flight?.destination}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className={`rounded-full px-3 py-1 text-sm font-medium ${
                          booking.status === "cancelled"
                            ? "bg-red-700 text-white"
                            : "bg-white/20 text-white"
                        }`}>
                          {booking.status === "cancelled" ? "❌ Cancelled" : "✅ Confirmed"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Flight Details */}
                  <div className="p-6">
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900">
                          {formatTime(flight?.departure_time)}
                        </p>
                        <p className="text-sm text-gray-600">
                          {flight?.origin}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(flight?.departure_time)}
                        </p>
                      </div>

                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900">
                          {formatTime(flight?.arrival_time)}
                        </p>
                        <p className="text-sm text-gray-600">
                          {flight?.destination}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(flight?.arrival_time)}
                        </p>
                      </div>
                    </div>

                    {/* Flight Duration */}
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Duration:</span>
                      <span className="font-medium text-gray-900">
                        {calculateFlightDuration(flight?.departure_time, flight?.arrival_time)}
                      </span>
                    </div>

                    {/* Passenger Info */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-6">
                      <h4 className="font-semibold text-gray-800 mb-2 flex items-center">
                        <span className="mr-2">👥</span>
                        Passenger Details
                      </h4>
                      <div className="space-y-3">
                        {booking.passengers?.map((passenger: any, index: number) => (
                          <div key={index} className="border-l-4 border-blue-200 pl-3">
                            <h5 className="font-medium text-gray-900 mb-1">
                              Passenger {index + 1}
                            </h5>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-gray-500">Name</p>
                                <p className="font-medium text-gray-900">
                                  {passenger.name}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-500">Age</p>
                                <p className="font-medium text-gray-900">
                                  {passenger.age} yrs
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-500">Gender</p>
                                <p className="font-medium text-gray-900">
                                  {passenger.gender}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Booking Info */}
                    <div className="space-y-3 mb-6">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Cabin Class:</span>
                        <span className="font-medium text-gray-900">
                          {booking.cabin_class}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Total Paid:</span>
                        <span className="text-xl font-bold text-green-600">
                          ₹{booking.total_price.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Booking ID:</span>
                        <span className="font-mono text-sm text-gray-700">
                          {booking.id}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Booked On:</span>
                        <span className="text-sm text-gray-700">
                          {new Date(booking.booking_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-3">
                      <button
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium transition-all duration-200 hover:scale-105 shadow-md hover:shadow-lg"
                        onClick={() =>
                          router.push(
                            `/booking-success?bookingId=${booking.id}`
                          )
                        }
                      >
                        View E-Ticket
                      </button>
                    </div>

                    {/* Modify and Cancel Actions */}
                    {booking.status === "confirmed" && (
                      <div className="flex space-x-3 mt-3">
                        {canModifyBooking(flight?.departure_time) ? (
                          <button
                            className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-3 rounded-lg font-medium transition-all duration-200 hover:scale-105 shadow-md hover:shadow-lg"
                            onClick={() => router.push(`/modify-booking/${booking.id}`)}
                          >
                            Modify Booking
                          </button>
                        ) : (
                          <button
                            className="flex-1 bg-gray-400 text-white px-4 py-3 rounded-lg font-medium cursor-not-allowed"
                            disabled
                            title="Modification not allowed within 24 hours of departure"
                          >
                            Modify (24h limit)
                          </button>
                        )}
                        
                        {canCancelBooking(flight?.departure_time) ? (
                          <button
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg font-medium transition-all duration-200 hover:scale-105 shadow-md hover:shadow-lg"
                            onClick={() => openCancelModal(booking)}
                          >
                            Cancel Booking
                          </button>
                        ) : (
                          <button
                            className="flex-1 bg-gray-400 text-white px-4 py-3 rounded-lg font-medium cursor-not-allowed"
                            disabled
                            title="Cancellation not allowed within 2 hours of departure"
                          >
                            Cancel (2h limit)
                          </button>
                        )}
                      </div>
                    )}

                    {/* Cancelled Booking Notice */}
                    {booking.status === "cancelled" && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-800 font-medium">
                          ❌ This booking has been cancelled
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Cancellation Confirmation Modal */}
      {showCancelModal && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                <span className="text-2xl">⚠️</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Cancel Booking
              </h3>
              <p className="text-gray-600">
                Are you sure you want to cancel this booking? This action cannot be undone.
              </p>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-red-800 mb-2">Booking Details:</h4>
              <div className="text-sm text-red-700 space-y-1">
                <p><strong>Flight:</strong> {flights[selectedBooking.flight_id]?.airline} - {flights[selectedBooking.flight_id]?.flight_number}</p>
                <p><strong>Route:</strong> {flights[selectedBooking.flight_id]?.origin} → {flights[selectedBooking.flight_id]?.destination}</p>
                <p><strong>Date:</strong> {formatDate(flights[selectedBooking.flight_id]?.departure_time)}</p>
                <p><strong>Amount:</strong> ₹{selectedBooking.total_price.toLocaleString()}</p>
              </div>
            </div>

            {/* Refund Information */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-yellow-800 mb-2">Refund Information:</h4>
              <div className="text-sm text-yellow-700 space-y-2">
                {(() => {
                  const refund = calculateRefund(selectedBooking.total_price, flights[selectedBooking.flight_id]?.departure_time);
                  const hoursToDeparture = (new Date(flights[selectedBooking.flight_id]?.departure_time).getTime() - new Date().getTime()) / (1000 * 60 * 60);
                  
                  if (hoursToDeparture > 24) {
                    return (
                      <div>
                        <p><strong>Refund Amount:</strong> ₹{refund.toLocaleString()} (90% of total)</p>
                        <p><strong>Processing Time:</strong> 5-7 business days</p>
                        <p className="text-xs mt-1">✓ More than 24 hours before departure</p>
                      </div>
                    );
                  } else if (hoursToDeparture > 2) {
                    return (
                      <div>
                        <p><strong>Refund Amount:</strong> ₹{refund.toLocaleString()} (50% of total)</p>
                        <p><strong>Processing Time:</strong> 5-7 business days</p>
                        <p className="text-xs mt-1">⚠️ Less than 24 hours before departure</p>
                      </div>
                    );
                  } else {
                    return (
                      <div>
                        <p><strong>Refund Amount:</strong> ₹0 (No refund available)</p>
                        <p className="text-xs mt-1">❌ Less than 2 hours before departure</p>
                      </div>
                    );
                  }
                })()}
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-3 rounded-lg font-medium transition-all duration-200"
                onClick={() => {
                  setShowCancelModal(false);
                  setSelectedBooking(null);
                }}
                disabled={cancelling}
              >
                Keep Booking
              </button>
              <button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg font-medium transition-all duration-200 disabled:opacity-50"
                onClick={handleCancelBooking}
                disabled={cancelling}
              >
                {cancelling ? (
                  <span className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Cancelling...
                  </span>
                ) : (
                  "Yes, Cancel"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
