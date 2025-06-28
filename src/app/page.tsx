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
  available_seats?: number;
}

interface PassengerCount {
  adults: number;
  children: number;
  infants: number;
}

export default function HomePage() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [filteredFlights, setFilteredFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);
  const [departureDateFilter, setDepartureDateFilter] = useState("");
  const [returnDateFilter, setReturnDateFilter] = useState("");
  const [cabinClassFilter, setCabinClassFilter] = useState("");
  const [tripType, setTripType] = useState<"one-way" | "round-trip">("one-way");
  const router = useRouter();
  const [originFilter, setOriginFilter] = useState("");
  const [destinationFilter, setDestinationFilter] = useState("");
  const [passengerCount, setPassengerCount] = useState<PassengerCount>({
    adults: 1,
    children: 0,
    infants: 0,
  });
  const [selectedDepartureFlight, setSelectedDepartureFlight] = useState<Flight | null>(null);
  const [selectedReturnFlight, setSelectedReturnFlight] = useState<Flight | null>(null);

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

  // Add click outside handler for passenger dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const dropdown = document.getElementById('passenger-dropdown');
      const button = document.getElementById('passenger-button');
      
      if (dropdown && button && !button.contains(event.target as Node) && !dropdown.contains(event.target as Node)) {
        dropdown.classList.add('hidden');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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

  // Update filtered flights whenever filters change
  useEffect(() => {
    const filtered = flights.filter((flight) => {
      // Convert flight departure time to local date string (YYYY-MM-DD format)
      const flightDate = new Date(flight.departure_time);
      const flightDateString = flightDate.toLocaleDateString('en-CA'); // en-CA gives YYYY-MM-DD format
      
      // Check available seats if the field exists
      const totalPassengers = getTotalPassengers();
      const hasEnoughSeats = !flight.available_seats || flight.available_seats >= totalPassengers;
      
      // For round-trip, we need to check both departure and return flights
      if (tripType === "round-trip") {
        // Check if this is a departure flight (origin to destination)
        const isDepartureFlight = flight.origin === originFilter && flight.destination === destinationFilter;
        // Check if this is a return flight (destination to origin)
        const isReturnFlight = flight.origin === destinationFilter && flight.destination === originFilter;
        
        const departureDateMatch = !departureDateFilter || flightDateString === departureDateFilter;
        const returnDateMatch = !returnDateFilter || flightDateString === returnDateFilter;
        
        return (
          (originFilter && destinationFilter) && // Both origin and destination must be selected
          (isDepartureFlight || isReturnFlight) && // Must be either departure or return flight
          ((isDepartureFlight && departureDateMatch) || (isReturnFlight && returnDateMatch)) && // Date must match
          (!cabinClassFilter || flight.cabin_class === cabinClassFilter) &&
          hasEnoughSeats // Check available seats
        );
      } else {
        // One-way flight filtering
        return (
          (!originFilter || flight.origin === originFilter) &&
          (!destinationFilter || flight.destination === destinationFilter) &&
          (!departureDateFilter || flightDateString === departureDateFilter) &&
          (!cabinClassFilter || flight.cabin_class === cabinClassFilter) &&
          hasEnoughSeats // Check available seats
        );
      }
    });
    setFilteredFlights(filtered);
  }, [
    originFilter,
    destinationFilter,
    departureDateFilter,
    returnDateFilter,
    tripType,
    cabinClassFilter,
    flights,
    passengerCount,
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

  const updatePassengerCount = (type: keyof PassengerCount, value: number) => {
    setPassengerCount(prev => ({
      ...prev,
      [type]: Math.max(0, value) // Ensure non-negative values
    }));
  };

  const getTotalPassengers = () => {
    return passengerCount.adults + passengerCount.children + passengerCount.infants;
  };

  const getPassengerDisplayText = () => {
    const parts = [];
    
    if (passengerCount.adults > 0) {
      parts.push(`${passengerCount.adults} Adult${passengerCount.adults > 1 ? 's' : ''}`);
    }
    if (passengerCount.children > 0) {
      parts.push(`${passengerCount.children} Child${passengerCount.children > 1 ? 'ren' : ''}`);
    }
    if (passengerCount.infants > 0) {
      parts.push(`${passengerCount.infants} Infant${passengerCount.infants > 1 ? 's' : ''}`);
    }
    
    return parts.join(', ') || '1 Adult';
  };

  const handleFlightSelection = (flight: Flight) => {
    if (tripType === "round-trip") {
      const isDepartureFlight = flight.origin === originFilter && flight.destination === destinationFilter;
      
      if (isDepartureFlight) {
        setSelectedDepartureFlight(flight);
        setSelectedReturnFlight(null); // Reset return flight when departure changes
      } else {
        setSelectedReturnFlight(flight);
      }
    } else {
      // For one-way, directly navigate to booking
      router.push(`/book/${flight.id}`);
    }
  };

  const handleRoundTripBooking = () => {
    if (selectedDepartureFlight && selectedReturnFlight) {
      // Navigate to round-trip booking with both flight IDs
      router.push(`/book/round-trip?departure=${selectedDepartureFlight.id}&return=${selectedReturnFlight.id}`);
    }
  };

  const clearSelections = () => {
    setSelectedDepartureFlight(null);
    setSelectedReturnFlight(null);
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
            
            {/* Trip Type Selection */}
            <div className="mb-6">
              <div className="flex space-x-4">
                <button
                  onClick={() => setTripType("one-way")}
                  className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                    tripType === "one-way"
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  One Way
                </button>
                <button
                  onClick={() => setTripType("round-trip")}
                  className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                    tripType === "round-trip"
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Round Trip
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
                  Departure Date
                </label>
                <input
                  type="date"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                  value={departureDateFilter}
                  onChange={(e) => setDepartureDateFilter(e.target.value)}
                />
              </div>

              {tripType === "round-trip" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Return Date
                  </label>
                  <input
                    type="date"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                    value={returnDateFilter}
                    onChange={(e) => setReturnDateFilter(e.target.value)}
                    min={departureDateFilter}
                  />
                </div>
              )}

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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Passengers
                </label>
                <div className="relative">
                  <button
                    id="passenger-button"
                    type="button"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white text-left"
                    onClick={() => {
                      const dropdown = document.getElementById('passenger-dropdown');
                      dropdown?.classList.toggle('hidden');
                    }}
                  >
                    <span className="flex items-center justify-between">
                      <span>{getPassengerDisplayText()}</span>
                      <span className="text-gray-400">▼</span>
                    </span>
                  </button>
                  
                  {/* Passenger Dropdown */}
                  <div id="passenger-dropdown" className="hidden absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-gray-900">Adults</p>
                          <p className="text-sm text-gray-500">Age 12+</p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => updatePassengerCount('adults', passengerCount.adults - 1)}
                            disabled={passengerCount.adults <= 1}
                            className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                          >
                            -
                          </button>
                          <span className="w-8 text-center font-medium">{passengerCount.adults}</span>
                          <button
                            onClick={() => updatePassengerCount('adults', passengerCount.adults + 1)}
                            className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-gray-900">Children</p>
                          <p className="text-sm text-gray-500">Age 2-11</p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => updatePassengerCount('children', passengerCount.children - 1)}
                            disabled={passengerCount.children <= 0}
                            className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                          >
                            -
                          </button>
                          <span className="w-8 text-center font-medium">{passengerCount.children}</span>
                          <button
                            onClick={() => updatePassengerCount('children', passengerCount.children + 1)}
                            className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-gray-900">Infants</p>
                          <p className="text-sm text-gray-500">Under 2 years</p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => updatePassengerCount('infants', passengerCount.infants - 1)}
                            disabled={passengerCount.infants <= 0}
                            className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                          >
                            -
                          </button>
                          <span className="w-8 text-center font-medium">{passengerCount.infants}</span>
                          <button
                            onClick={() => updatePassengerCount('infants', passengerCount.infants + 1)}
                            disabled={passengerCount.infants >= passengerCount.adults}
                            className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      
                      <div className="pt-3 border-t border-gray-200">
                        <p className="text-sm text-gray-600">
                          Total: <span className="font-medium">{getTotalPassengers()} passenger{getTotalPassengers() !== 1 ? 's' : ''}</span>
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Note: Infants must be accompanied by an adult
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Trip Type Info */}
            {tripType === "round-trip" && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <span className="font-medium">Round-trip selected:</span> Select your departure flight first, then choose a return flight. Both flights will be booked together.
                </p>
              </div>
            )}

            {/* Round-trip Selection Summary */}
            {tripType === "round-trip" && (selectedDepartureFlight || selectedReturnFlight) && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-3">Selected Flights:</h3>
                <div className="space-y-2">
                  {selectedDepartureFlight && (
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-sm font-medium text-green-700">🛫 Departure:</span>
                        <span className="text-sm text-green-600 ml-2">
                          {selectedDepartureFlight.airline} - {selectedDepartureFlight.flight_number}
                        </span>
                      </div>
                      <span className="text-sm text-green-600">
                        ₹{selectedDepartureFlight.price.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {selectedReturnFlight && (
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-sm font-medium text-green-700">🛬 Return:</span>
                        <span className="text-sm text-green-600 ml-2">
                          {selectedReturnFlight.airline} - {selectedReturnFlight.flight_number}
                        </span>
                      </div>
                      <span className="text-sm text-green-600">
                        ₹{selectedReturnFlight.price.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
                {selectedDepartureFlight && selectedReturnFlight && (
                  <div className="mt-3 pt-3 border-t border-green-200">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-green-800">Total for {getTotalPassengers()} passenger{getTotalPassengers() !== 1 ? 's' : ''}:</span>
                      <span className="font-bold text-green-800">
                        ₹{((selectedDepartureFlight.price + selectedReturnFlight.price) * getTotalPassengers()).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex space-x-3 mt-3">
                      <button
                        onClick={handleRoundTripBooking}
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-all duration-200 hover:scale-105"
                      >
                        Book Round Trip
                      </button>
                      <button
                        onClick={clearSelections}
                        className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200"
                      >
                        Clear Selection
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
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
                <p className="text-gray-600 mb-4">
                  Try adjusting your search filters
                </p>
                {getTotalPassengers() > 1 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-md mx-auto">
                    <p className="text-sm text-yellow-800">
                      💡 <strong>Tip:</strong> Some flights may not have enough available seats for {getTotalPassengers()} passengers. 
                      Try reducing the number of passengers or check back later.
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredFlights.map((flight) => {
                // Determine if this is a departure or return flight for round-trip
                const isDepartureFlight = tripType === "round-trip" && flight.origin === originFilter && flight.destination === destinationFilter;
                const isReturnFlight = tripType === "round-trip" && flight.origin === destinationFilter && flight.destination === originFilter;
                
                return (
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
                          {tripType === "round-trip" && (
                            <p className={`text-xs font-medium mt-1 px-2 py-1 rounded-full inline-block ${
                              isDepartureFlight 
                                ? 'bg-blue-100 text-blue-800' 
                                : isReturnFlight
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {isDepartureFlight ? '🛫 Departure' : isReturnFlight ? '🛬 Return' : 'Flight'}
                            </p>
                          )}
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

                      {/* Flight Duration and Available Seats */}
                      <div className="flex justify-between items-center mb-4 px-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-400">⏱️</span>
                          <span className="text-sm text-gray-600">
                            {calculateFlightDuration(flight.departure_time, flight.arrival_time)}
                          </span>
                        </div>
                        {flight.available_seats !== undefined && (
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-400">💺</span>
                            <span className={`text-sm font-medium ${
                              flight.available_seats >= getTotalPassengers() 
                                ? 'text-green-600' 
                                : 'text-red-600'
                            }`}>
                              {flight.available_seats} seats available
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Price and Book Button */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <div>
                          <p className="text-sm text-gray-500">Price per passenger</p>
                          <p className="text-2xl font-bold text-green-600">
                            ₹{flight.price.toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500">
                            Total: ₹{(flight.price * getTotalPassengers()).toLocaleString()}
                          </p>
                        </div>
                        <button
                          onClick={() => handleFlightSelection(flight)}
                          className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 hover:scale-105 shadow-md hover:shadow-lg ${
                            tripType === "round-trip" 
                              ? isDepartureFlight && selectedDepartureFlight?.id === flight.id
                                ? "bg-green-600 hover:bg-green-700 text-white"
                                : isReturnFlight && selectedReturnFlight?.id === flight.id
                                ? "bg-green-600 hover:bg-green-700 text-white"
                                : "bg-blue-600 hover:bg-blue-700 text-white"
                              : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
                          }`}
                        >
                          {tripType === "round-trip" 
                            ? isDepartureFlight && selectedDepartureFlight?.id === flight.id
                              ? "✓ Selected (Departure)"
                              : isReturnFlight && selectedReturnFlight?.id === flight.id
                              ? "✓ Selected (Return)"
                              : isDepartureFlight
                              ? "Select Departure"
                              : "Select Return"
                            : "Book Now"
                          }
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
