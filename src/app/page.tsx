"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";

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
}

export default function HomePage() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [filteredFlights, setFilteredFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);
  const [departureDateFilter, setDepartureDateFilter] = useState("");
  const [cabinClassFilter, setCabinClassFilter] = useState("");
  const router = useRouter();
  const [originFilter, setOriginFilter] = useState("");
  const [destinationFilter, setDestinationFilter] = useState("");

  useEffect(() => {
    const fetchFlights = async () => {
      const { data, error } = await supabase.from("flights").select("*");
      if (!error && data) {
        setFlights(data);
        setFilteredFlights(data);
      }
      setLoading(false);
    };
    fetchFlights();
  }, []);

  // Update filtered flights whenever filters change
  useEffect(() => {
    const filtered = flights.filter((flight) => {
      // Convert flight departure time to local date string (YYYY-MM-DD format)
      const flightDate = new Date(flight.departure_time);
      const flightDateString = flightDate.toLocaleDateString('en-CA'); // en-CA gives YYYY-MM-DD format
      
      return (
        (!originFilter || flight.origin === originFilter) &&
        (!destinationFilter || flight.destination === destinationFilter) &&
        (!departureDateFilter || flightDateString === departureDateFilter) &&
        (!cabinClassFilter || flight.cabin_class === cabinClassFilter)
      );
    });
    setFilteredFlights(filtered);
  }, [
    originFilter,
    destinationFilter,
    departureDateFilter,
    cabinClassFilter,
    flights,
  ]);

  // Unique origin/destination lists
  const origins = [...new Set(flights.map((f) => f.origin))];
  const destinations = [...new Set(flights.map((f) => f.destination))];

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
    });
  };

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Find Your Perfect Flight
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Discover amazing destinations with our curated selection of
              flights. Book with confidence and start your journey today.
            </p>
          </div>

          {/* Filters Section */}
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-8 border border-gray-100">
            <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
              <span className="mr-2">🔍</span>
              Search Filters
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  From
                </label>
                <select
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                  value={originFilter}
                  onChange={(e) => setOriginFilter(e.target.value)}
                >
                  <option value="">All Origins</option>
                  {origins.map((origin) => (
                    <option key={origin} value={origin}>
                      {origin}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  To
                </label>
                <select
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                  value={destinationFilter}
                  onChange={(e) => setDestinationFilter(e.target.value)}
                >
                  <option value="">All Destinations</option>
                  {destinations.map((dest) => (
                    <option key={dest} value={dest}>
                      {dest}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                  value={departureDateFilter}
                  onChange={(e) => setDepartureDateFilter(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cabin Class
                </label>
                <select
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                  value={cabinClassFilter}
                  onChange={(e) => setCabinClassFilter(e.target.value)}
                >
                  <option value="">All Classes</option>
                  <option value="Economy">Economy</option>
                  <option value="Premium Economy">Premium Economy</option>
                  <option value="Business">Business</option>
                  <option value="First">First</option>
                </select>
              </div>
            </div>
          </div>

          {/* Results Section */}
          <div className="space-y-6">
            {loading && (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-gray-600">Loading flights...</p>
              </div>
            )}

            {!loading && filteredFlights.length === 0 && (
              <div className="text-center py-12 bg-white rounded-2xl shadow-lg">
                <div className="text-6xl mb-4">✈️</div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  No flights found
                </h3>
                <p className="text-gray-600">
                  Try adjusting your search filters
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredFlights.map((flight) => (
                <div
                  key={flight.id}
                  className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden group"
                >
                  <div className="p-6">
                    {/* Flight Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                          {flight.airline}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Flight {flight.flight_number}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                          {flight.cabin_class}
                        </span>
                      </div>
                    </div>

                    {/* Route */}
                    <div className="flex items-center justify-between mb-6">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900">
                          {formatTime(flight.departure_time)}
                        </p>
                        <p className="text-sm text-gray-600">{flight.origin}</p>
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

                    {/* Price and Book Button */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div>
                        <p className="text-sm text-gray-500">Total Price</p>
                        <p className="text-2xl font-bold text-green-600">
                          ₹{flight.price.toLocaleString()}
                        </p>
                      </div>
                      <button
                        onClick={() => router.push(`/book/${flight.id}`)}
                        className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 hover:scale-105 shadow-md hover:shadow-lg"
                      >
                        Book Now
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
