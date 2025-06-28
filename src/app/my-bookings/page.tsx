"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [flights, setFlights] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
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

      const flightMap = {};
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
            <p className="text-xl text-gray-600">
              Manage and view all your flight reservations
            </p>
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
                  <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6">
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
                        <div className="bg-white/20 rounded-full px-3 py-1 text-sm font-medium">
                          {booking.status}
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
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
