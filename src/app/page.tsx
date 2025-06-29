"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import OfflineIndicator from "@/components/OfflineIndicator";
import { useOfflineData } from "@/hooks/useOfflineData";
import { useFlightFilterWorker } from "@/hooks/useFlightFilterWorker";
import { Flight } from "@/lib/indexedDB";
import { supabase } from "@/lib/supabase";

interface PassengerCount {
  adults: number;
  children: number;
  infants: number;
}

interface ValidationErrors {
  origin?: string;
  destination?: string;
  departureDate?: string;
  returnDate?: string;
  passengerCount?: string;
}

export default function HomePage() {
  const router = useRouter();
  const { isOnline, getFlights, searchFlights } = useOfflineData();
  const { filterFlights: filterFlightsWithWorker } = useFlightFilterWorker();
  
  const [flights, setFlights] = useState<Flight[]>([]);
  const [filteredFlights, setFilteredFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [filtering, setFiltering] = useState(false);

  // Filters
  const [originFilter, setOriginFilter] = useState("");
  const [destinationFilter, setDestinationFilter] = useState("");
  const [departureDateFilter, setDepartureDateFilter] = useState("");
  const [returnDateFilter, setReturnDateFilter] = useState("");
  const [tripType, setTripType] = useState<"one-way" | "round-trip">("one-way");
  const [cabinClassFilter, setCabinClassFilter] = useState("");
  const [passengerCount, setPassengerCount] = useState<PassengerCount>({
    adults: 1,
    children: 0,
    infants: 0,
  });

  // Validation
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  // Round-trip state
  const [selectedDepartureFlight, setSelectedDepartureFlight] = useState<Flight | null>(null);
  const [returnFlights, setReturnFlights] = useState<Flight[]>([]);
  const [selectedReturnFlight, setSelectedReturnFlight] = useState<Flight | null>(null);
  const [roundTripStep, setRoundTripStep] = useState<"departure" | "return">("departure");

  useEffect(() => {
    const fetchFlights = async () => {
      setLoading(true);
      try {
        const flightsData = await getFlights();
        setFlights(flightsData);
        setFilteredFlights(flightsData);
      } catch (error) {
        console.error("Error fetching flights:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFlights();
  }, [getFlights]);

  // Validation functions
  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};

    if (!originFilter) {
      errors.origin = "Please select origin";
    }

    if (!destinationFilter) {
      errors.destination = "Please select destination";
    }

    if (originFilter && destinationFilter && originFilter === destinationFilter) {
      errors.destination = "Origin and destination cannot be the same";
    }

    if (!departureDateFilter) {
      errors.departureDate = "Please select departure date";
    } else {
      const departureDate = new Date(departureDateFilter);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (departureDate < today) {
        errors.departureDate = "Departure date cannot be in the past";
      }
    }

    if (tripType === "round-trip") {
      if (!returnDateFilter) {
        errors.returnDate = "Please select return date";
      } else {
        const departureDate = new Date(departureDateFilter);
        const returnDate = new Date(returnDateFilter);
        
        if (returnDate <= departureDate) {
          errors.returnDate = "Return date must be after departure date";
        }
      }
    }

    const totalPassengers = getTotalPassengers();
    if (totalPassengers === 0) {
      errors.passengerCount = "At least one passenger is required";
    } else if (totalPassengers > 9) {
      errors.passengerCount = "Maximum 9 passengers allowed";
    } else if (passengerCount.adults === 0) {
      errors.passengerCount = "At least one adult is required";
    } else if (passengerCount.infants > passengerCount.adults) {
      errors.passengerCount = "Number of infants cannot exceed number of adults";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validatePassengerCount = (): boolean => {
    const totalPassengers = getTotalPassengers();
    const errors: ValidationErrors = { ...validationErrors };

    if (totalPassengers === 0) {
      errors.passengerCount = "At least one passenger is required";
    } else if (totalPassengers > 9) {
      errors.passengerCount = "Maximum 9 passengers allowed";
    } else if (passengerCount.adults === 0) {
      errors.passengerCount = "At least one adult is required";
    } else if (passengerCount.infants > passengerCount.adults) {
      errors.passengerCount = "Number of infants cannot exceed number of adults";
    } else {
      delete errors.passengerCount;
    }

    setValidationErrors(errors);
    return !errors.passengerCount;
  };

  const handleSearch = async () => {
    if (!validateForm()) {
      return;
    }

    setSearching(true);
    try {
      if (tripType === "round-trip") {
        // For round-trip, only search for departure flights initially
        const departureFlights = flights.filter((flight) => {
          const flightDate = new Date(flight.departure_time);
          const flightDateString = flightDate.toLocaleDateString('en-CA');
          const hasEnoughSeats = !flight.available_seats || flight.available_seats >= getTotalPassengers();
          
          return (
            flight.origin === originFilter &&
            flight.destination === destinationFilter &&
            (!departureDateFilter || flightDateString === departureDateFilter) &&
            (!cabinClassFilter || flight.cabin_class === cabinClassFilter) &&
            hasEnoughSeats
          );
        });
        setFilteredFlights(departureFlights);
      } else {
        // For one-way, use the existing search function
        const searchResults = await searchFlights(
          originFilter,
          destinationFilter,
          departureDateFilter
        );
        setFilteredFlights(searchResults);
      }
    } catch (error) {
      console.error("Error searching flights:", error);
    } finally {
      setSearching(false);
    }
  };

  const clearFilters = () => {
    setOriginFilter("");
    setDestinationFilter("");
    setDepartureDateFilter("");
    setReturnDateFilter("");
    setCabinClassFilter("");
    setPassengerCount({ adults: 1, children: 0, infants: 0 });
    setValidationErrors({});
    resetRoundTripSelection();
  };

  // Update filtered flights whenever filters change
  useEffect(() => {
    const applyFilters = async () => {
      setFiltering(true);
      try {
        // For round-trip, we need to filter differently based on the current step
        if (tripType === "round-trip" && roundTripStep === "departure") {
          // Only show departure flights (origin to destination)
          const departureFlights = flights.filter((flight) => {
            const flightDate = new Date(flight.departure_time);
            const flightDateString = flightDate.toLocaleDateString('en-CA');
            const hasEnoughSeats = !flight.available_seats || flight.available_seats >= getTotalPassengers();
            
            return (
              flight.origin === originFilter &&
              flight.destination === destinationFilter &&
              (!departureDateFilter || flightDateString === departureDateFilter) &&
              (!cabinClassFilter || flight.cabin_class === cabinClassFilter) &&
              hasEnoughSeats
            );
          });
          setFilteredFlights(departureFlights);
        } else {
          // Use the worker for one-way flights or return flights
          const filtered = await filterFlightsWithWorker(flights, {
            originFilter,
            destinationFilter,
            departureDateFilter,
            returnDateFilter,
            tripType,
            cabinClassFilter,
            passengerCount,
          });
          setFilteredFlights(filtered);
        }
      } catch (error) {
        console.error('Error filtering flights:', error);
        // Fallback to showing all flights
        setFilteredFlights(flights);
      } finally {
        setFiltering(false);
      }
    };

    applyFilters();
  }, [
    originFilter,
    destinationFilter,
    departureDateFilter,
    returnDateFilter,
    tripType,
    cabinClassFilter,
    flights,
    passengerCount,
    filterFlightsWithWorker,
    roundTripStep, // Add roundTripStep to dependencies
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
    
    // Validate passenger count after update
    setTimeout(() => validatePassengerCount(), 0);
  };

  const getTotalPassengers = () => {
    return passengerCount.adults + passengerCount.children + passengerCount.infants;
  };

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

  const handleFlightSelect = async (flight: Flight) => {
    if (tripType === "one-way") {
      // For one-way, directly navigate to booking
      router.push(`/book/${flight.id}`);
    } else {
      // For round-trip, select departure flight and fetch return flights
      setSelectedDepartureFlight(flight);
      
      // Fetch return flights
      const { data: returnData, error: returnError } = await supabase
        .from("flights")
        .select("*")
        .eq("origin", flight.destination)
        .eq("destination", flight.origin)
        .gte("departure_time", flight.arrival_time) // Return flight should be after arrival
        .order("departure_time", { ascending: true });

      if (returnError) {
        console.error('Error fetching return flights:', returnError);
      } else if (returnData) {
        setReturnFlights(returnData);
        setRoundTripStep("return");
      }
    }
  };

  const handleReturnFlightSelect = (flight: Flight) => {
    setSelectedReturnFlight(flight);
  };

  const handleRoundTripBooking = () => {
    if (selectedDepartureFlight && selectedReturnFlight) {
      // Navigate to round-trip booking page with both flight IDs
      router.push(`/book/round-trip?departure=${selectedDepartureFlight.id}&return=${selectedReturnFlight.id}`);
    }
  };

  const resetRoundTripSelection = () => {
    setSelectedDepartureFlight(null);
    setSelectedReturnFlight(null);
    setReturnFlights([]);
    setRoundTripStep("departure");
    
    // Reset filtered flights to show only departure flights
    if (tripType === "round-trip" && originFilter && destinationFilter) {
      const departureFlights = flights.filter((flight) => {
        const flightDate = new Date(flight.departure_time);
        const flightDateString = flightDate.toLocaleDateString('en-CA');
        const hasEnoughSeats = !flight.available_seats || flight.available_seats >= getTotalPassengers();
        
        return (
          flight.origin === originFilter &&
          flight.destination === destinationFilter &&
          (!departureDateFilter || flightDateString === departureDateFilter) &&
          (!cabinClassFilter || flight.cabin_class === cabinClassFilter) &&
          hasEnoughSeats
        );
      });
      setFilteredFlights(departureFlights);
    }
  };

  const goBackToDeparture = () => {
    setRoundTripStep("departure");
    setSelectedReturnFlight(null);
    setReturnFlights([]);
  };

  if (loading) {
    return (
      <>
        <Header />
        {/* <OfflineIndicator /> */}
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading flights...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      {/* <OfflineIndicator /> */}
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-16">
          <div className="container mx-auto px-4">
            <div className="text-center">
              <h1 className="text-4xl md:text-6xl font-bold mb-6">
                Find Your Perfect Flight
              </h1>
              <p className="text-xl md:text-2xl text-blue-100 mb-8">
                Search, compare, and book flights with ease
              </p>
            </div>
          </div>
        </div>

        {/* Search Form */}
        <div className="container mx-auto px-4 -mt-8">
          <div className="bg-white rounded-2xl shadow-2xl p-8 mb-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Trip Type Selection */}
              <div className="lg:col-span-2">
                <div className="flex space-x-4 mb-6">
                  <button
                    className={`flex-1 py-3 px-6 rounded-lg font-medium transition-all duration-200 ${
                      tripType === "one-way"
                        ? "bg-blue-600 text-white shadow-lg"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                    onClick={() => setTripType("one-way")}
                  >
                    ✈️ One Way
                  </button>
                  <button
                    className={`flex-1 py-3 px-6 rounded-lg font-medium transition-all duration-200 ${
                      tripType === "round-trip"
                        ? "bg-blue-600 text-white shadow-lg"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                    onClick={() => setTripType("round-trip")}
                  >
                    🔄 Round Trip
                  </button>
                </div>
              </div>

              {/* Origin */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  From
                </label>
                <select
                  value={originFilter}
                  onChange={(e) => setOriginFilter(e.target.value)}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                    validationErrors.origin ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select Origin</option>
                  {origins.map((origin) => (
                    <option key={origin} value={origin}>
                      {origin}
                    </option>
                  ))}
                </select>
                {validationErrors.origin && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.origin}</p>
                )}
              </div>

              {/* Destination */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  To
                </label>
                <select
                  value={destinationFilter}
                  onChange={(e) => setDestinationFilter(e.target.value)}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                    validationErrors.destination ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select Destination</option>
                  {destinations.map((destination) => (
                    <option key={destination} value={destination}>
                      {destination}
                    </option>
                  ))}
                </select>
                {validationErrors.destination && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.destination}</p>
                )}
              </div>

              {/* Departure Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Departure Date
                </label>
                <input
                  type="date"
                  value={departureDateFilter}
                  onChange={(e) => setDepartureDateFilter(e.target.value)}
                  className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                    validationErrors.departureDate ? 'border-red-500' : 'border-gray-300'
                  }`}
                  min={new Date().toISOString().split('T')[0]}
                />
                {validationErrors.departureDate && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.departureDate}</p>
                )}
              </div>

              {/* Return Date (for round-trip) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {tripType === "round-trip" ? "Return Date" : "Cabin Class"}
                </label>
                {tripType === "round-trip" ? (
                  <input
                    type="date"
                    value={returnDateFilter}
                    onChange={(e) => setReturnDateFilter(e.target.value)}
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                      validationErrors.returnDate ? 'border-red-500' : 'border-gray-300'
                    }`}
                    min={departureDateFilter || new Date().toISOString().split('T')[0]}
                  />
                ) : (
                  <select
                    value={cabinClassFilter}
                    onChange={(e) => setCabinClassFilter(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  >
                    <option value="">All Classes</option>
                    <option value="Economy">Economy</option>
                    <option value="Business">Business</option>
                    <option value="First">First</option>
                  </select>
                )}
                {validationErrors.returnDate && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.returnDate}</p>
                )}
              </div>

              {/* Cabin Class (for round-trip) */}
              {tripType === "round-trip" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cabin Class
                  </label>
                  <select
                    value={cabinClassFilter}
                    onChange={(e) => setCabinClassFilter(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                  >
                    <option value="">All Classes</option>
                    <option value="Economy">Economy</option>
                    <option value="Business">Business</option>
                    <option value="First">First</option>
                  </select>
                </div>
              )}

              {/* Passenger Count */}
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Passengers
                </label>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Adults (12+)</label>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => updatePassengerCount('adults', passengerCount.adults - 1)}
                        className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors"
                        disabled={passengerCount.adults <= 1}
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-medium">{passengerCount.adults}</span>
                      <button
                        onClick={() => updatePassengerCount('adults', passengerCount.adults + 1)}
                        className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors"
                        disabled={getTotalPassengers() >= 9}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Children (2-11)</label>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => updatePassengerCount('children', passengerCount.children - 1)}
                        className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors"
                        disabled={passengerCount.children <= 0}
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-medium">{passengerCount.children}</span>
                      <button
                        onClick={() => updatePassengerCount('children', passengerCount.children + 1)}
                        className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors"
                        disabled={getTotalPassengers() >= 9}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Infants (0-1)</label>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => updatePassengerCount('infants', passengerCount.infants - 1)}
                        className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors"
                        disabled={passengerCount.infants <= 0}
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-medium">{passengerCount.infants}</span>
                      <button
                        onClick={() => updatePassengerCount('infants', passengerCount.infants + 1)}
                        className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300 transition-colors"
                        disabled={passengerCount.infants >= passengerCount.adults || getTotalPassengers() >= 9}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
                {validationErrors.passengerCount && (
                  <p className="text-red-500 text-sm mt-1">{validationErrors.passengerCount}</p>
                )}
              </div>

              {/* Search and Clear Buttons */}
              <div className="lg:col-span-2 flex space-x-4">
                <button
                  onClick={handleSearch}
                  disabled={searching}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-4 rounded-lg font-semibold text-lg transition-all duration-200 hover:scale-105 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {searching ? (
                    <span className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Searching...
                    </span>
                  ) : (
                    "🔍 Search Flights"
                  )}
                </button>
                <button
                  onClick={clearFilters}
                  className="px-8 bg-gray-500 hover:bg-gray-600 text-white py-4 rounded-lg font-semibold transition-all duration-200 hover:scale-105"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          {/* Results Section */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {filtering ? "Filtering..." : `${filteredFlights.length} Flights Found`}
              </h2>
              <div className="flex items-center space-x-2">
                {filtering && (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="text-sm text-gray-600">Filtering...</span>
                  </div>
                )}
                {!isOnline && (
                  <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                    📱 Offline Mode - Cached Results
                  </div>
                )}
              </div>
            </div>

            {/* Round-trip flow: Show departure flights first, then return flights */}
            {tripType === "round-trip" && roundTripStep === "departure" && (
              <>
                {/* Progress Indicator */}
                <div className="mb-8">
                  <div className="bg-white rounded-2xl shadow-lg p-6">
                    <div className="flex items-center justify-center space-x-8">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                          1
                        </div>
                        <div>
                          <p className="font-semibold text-blue-600">Select Departure</p>
                          <p className="text-sm text-gray-500">Choose your outbound flight</p>
                        </div>
                      </div>
                      <div className="flex-1 h-1 bg-gray-200 rounded-full">
                        <div className="h-1 bg-blue-600 rounded-full w-0"></div>
                      </div>
                      <div className="flex items-center space-x-3 opacity-50">
                        <div className="w-10 h-10 bg-gray-300 text-gray-500 rounded-full flex items-center justify-center font-bold text-lg">
                          2
                        </div>
                        <div>
                          <p className="font-semibold text-gray-500">Select Return</p>
                          <p className="text-sm text-gray-400">Choose your return flight</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Search Summary */}
                <div className="mb-6">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-2xl">✈️</span>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">Departure Flight Search</h3>
                            <p className="text-gray-600">{originFilter} → {destinationFilter}</p>
                          </div>
                        </div>
                        {departureDateFilter && (
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-400">📅</span>
                            <span className="text-sm text-gray-600">{departureDateFilter}</span>
                          </div>
                        )}
                        {cabinClassFilter && (
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-400">💺</span>
                            <span className="text-sm text-gray-600">{cabinClassFilter}</span>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">{getTotalPassengers()} passenger{getTotalPassengers() > 1 ? 's' : ''}</p>
                        <p className="text-xs text-gray-500">Round-trip booking</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {filteredFlights.length === 0 && !filtering ? (
                  <div className="text-center py-12 bg-white rounded-2xl shadow-lg">
                    <div className="text-6xl mb-4">✈️</div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      No departure flights found
                    </h3>
                    <p className="text-gray-600 mb-6">
                      No flights available from {originFilter} to {destinationFilter} for the selected criteria.
                    </p>
                    <div className="flex justify-center space-x-4">
                      <button
                        onClick={clearFilters}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200"
                      >
                        Try Different Search
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {filteredFlights.map((flight) => (
                      <div
                        key={flight.id}
                        className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-blue-200 overflow-hidden cursor-pointer transform hover:scale-105"
                        onClick={() => handleFlightSelect(flight)}
                      >
                        {/* Flight Header */}
                        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6">
                          <div className="flex justify-between items-center">
                            <div>
                              <h3 className="text-xl font-bold mb-1">
                                {flight.airline} - {flight.flight_number}
                              </h3>
                              <p className="text-blue-100">
                                {flight.origin} → {flight.destination}
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="bg-white/20 text-white text-xs font-medium px-2 py-1 rounded-full">
                                {flight.cabin_class}
                              </div>
                              <div className="mt-2 text-xs text-blue-100">
                                Departure Flight
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Flight Details */}
                        <div className="p-6">
                          <div className="grid grid-cols-3 gap-4 mb-6">
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
                                  (flight.available_seats ?? 0) >= getTotalPassengers() 
                                    ? 'text-green-600' 
                                    : 'text-red-600'
                                }`}>
                                  {(flight.available_seats ?? 0) > 0 ? (flight.available_seats ?? 0) : 'No seats available'}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Price and Select Button */}
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-sm text-gray-600">Price per passenger</p>
                              <p className="text-2xl font-bold text-green-600">
                                ₹{flight.price.toLocaleString()}
                              </p>
                              <p className="text-sm text-gray-500">
                                Total: ₹{(flight.price * getTotalPassengers()).toLocaleString()}
                              </p>
                            </div>
                            <button className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 hover:scale-105 shadow-md hover:shadow-lg flex items-center space-x-2">
                              <span>Select Departure</span>
                              <span>→</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Round-trip flow: Show return flights after departure is selected */}
            {tripType === "round-trip" && roundTripStep === "return" && (
              <>
                {/* Progress Indicator */}
                <div className="mb-8">
                  <div className="bg-white rounded-2xl shadow-lg p-6">
                    <div className="flex items-center justify-center space-x-8">
                      <div className="flex items-center space-x-3 opacity-50">
                        <div className="w-10 h-10 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                          ✓
                        </div>
                        <div>
                          <p className="font-semibold text-green-600">Departure Selected</p>
                          <p className="text-sm text-gray-500">Outbound flight chosen</p>
                        </div>
                      </div>
                      <div className="flex-1 h-1 bg-gray-200 rounded-full">
                        <div className="h-1 bg-green-600 rounded-full w-full"></div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                          2
                        </div>
                        <div>
                          <p className="font-semibold text-green-600">Select Return</p>
                          <p className="text-sm text-gray-500">Choose your return flight</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Selected Departure Flight Summary */}
                <div className="mb-8">
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl shadow-xl p-6 border-2 border-green-200">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-green-600 text-white rounded-full flex items-center justify-center">
                          <span className="text-xl">✓</span>
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-gray-900">Departure Flight Selected</h2>
                          <p className="text-green-600 font-medium">{selectedDepartureFlight?.airline} - {selectedDepartureFlight?.flight_number}</p>
                        </div>
                      </div>
                      <button
                        onClick={goBackToDeparture}
                        className="text-blue-600 hover:text-blue-700 font-medium transition-colors duration-200 flex items-center space-x-2 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg"
                      >
                        <span>←</span>
                        <span>Change Departure</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white rounded-xl p-4">
                      <div className="text-center">
                        <p className="text-sm text-gray-600 mb-1">Route</p>
                        <p className="font-semibold text-gray-900">{selectedDepartureFlight?.origin} → {selectedDepartureFlight?.destination}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600 mb-1">Date</p>
                        <p className="font-semibold text-gray-900">{selectedDepartureFlight ? formatDate(selectedDepartureFlight.departure_time) : ''}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600 mb-1">Time</p>
                        <p className="font-semibold text-gray-900">{selectedDepartureFlight ? formatTime(selectedDepartureFlight.departure_time) : ''}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-600 mb-1">Price</p>
                        <p className="font-semibold text-green-600">₹{selectedDepartureFlight?.price.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Return Flights Section */}
                <div className="mb-6">
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-2xl">🔄</span>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">Return Flight Search</h3>
                            <p className="text-gray-600">{selectedDepartureFlight?.destination} → {selectedDepartureFlight?.origin}</p>
                          </div>
                        </div>
                        {returnDateFilter && (
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-400">📅</span>
                            <span className="text-sm text-gray-600">{returnDateFilter}</span>
                          </div>
                        )}
                        {cabinClassFilter && (
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-400">💺</span>
                            <span className="text-sm text-gray-600">{cabinClassFilter}</span>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">{getTotalPassengers()} passenger{getTotalPassengers() > 1 ? 's' : ''}</p>
                        <p className="text-xs text-gray-500">Return flight</p>
                      </div>
                    </div>
                  </div>
                </div>

                {returnFlights.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-2xl shadow-lg">
                    <div className="text-6xl mb-4">😔</div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      No Return Flights Available
                    </h3>
                    <p className="text-gray-600 mb-6">
                      No return flights found from {selectedDepartureFlight?.destination} to {selectedDepartureFlight?.origin} for the selected dates.
                    </p>
                    <div className="flex justify-center space-x-4">
                      <button
                        onClick={goBackToDeparture}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200"
                      >
                        Select Different Departure
                      </button>
                      <button
                        onClick={clearFilters}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200"
                      >
                        New Search
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {returnFlights.map((flight) => (
                      <div
                        key={flight.id}
                        className={`bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border-2 overflow-hidden cursor-pointer transform hover:scale-105 ${
                          selectedReturnFlight?.id === flight.id
                            ? 'border-green-500 shadow-green-100 ring-2 ring-green-200'
                            : 'border-gray-100 hover:border-green-300'
                        }`}
                        onClick={() => handleReturnFlightSelect(flight)}
                      >
                        {/* Flight Header */}
                        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6">
                          <div className="flex justify-between items-center">
                            <div>
                              <h3 className="text-xl font-bold mb-1">
                                {flight.airline} - {flight.flight_number}
                              </h3>
                              <p className="text-green-100">
                                {flight.origin} → {flight.destination}
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="bg-white/20 text-white text-xs font-medium px-2 py-1 rounded-full">
                                {flight.cabin_class}
                              </div>
                              <div className="mt-2 text-xs text-green-100">
                                Return Flight
                              </div>
                              {selectedReturnFlight?.id === flight.id && (
                                <div className="bg-white text-green-600 text-xs px-2 py-1 rounded-full mt-2 font-medium">
                                  ✓ Selected
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Flight Details */}
                        <div className="p-6">
                          <div className="grid grid-cols-3 gap-4 mb-6">
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
                                  (flight.available_seats ?? 0) >= getTotalPassengers() 
                                    ? 'text-green-600' 
                                    : 'text-red-600'
                                }`}>
                                  {(flight.available_seats ?? 0) > 0 ? (flight.available_seats ?? 0) : 'No seats available'}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Price and Select Button */}
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-sm text-gray-600">Price per passenger</p>
                              <p className="text-2xl font-bold text-green-600">
                                ₹{flight.price.toLocaleString()}
                              </p>
                              <p className="text-sm text-gray-500">
                                Total: ₹{(flight.price * getTotalPassengers()).toLocaleString()}
                              </p>
                            </div>
                            <button className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 hover:scale-105 shadow-md hover:shadow-lg flex items-center space-x-2 ${
                              selectedReturnFlight?.id === flight.id
                                ? 'bg-green-600 hover:bg-green-700 text-white'
                                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                            }`}>
                              <span>{selectedReturnFlight?.id === flight.id ? 'Selected' : 'Select Return'}</span>
                              {selectedReturnFlight?.id === flight.id && <span>✓</span>}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Round-trip Booking Button */}
                {selectedReturnFlight && (
                  <div className="mt-8">
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl shadow-xl p-8 border-2 border-green-200">
                      <div className="text-center mb-6">
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">🎉 Round-trip Complete!</h3>
                        <p className="text-gray-600">Both flights selected successfully</p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <div className="bg-white rounded-xl p-4 text-center">
                          <p className="text-sm text-gray-600 mb-1">Departure</p>
                          <p className="font-semibold text-gray-900">{selectedDepartureFlight?.origin} → {selectedDepartureFlight?.destination}</p>
                          <p className="text-sm text-gray-500">{selectedDepartureFlight ? formatDate(selectedDepartureFlight.departure_time) : ''}</p>
                          <p className="text-green-600 font-semibold">₹{(selectedDepartureFlight?.price || 0) * getTotalPassengers()}</p>
                        </div>
                        <div className="bg-white rounded-xl p-4 text-center">
                          <p className="text-sm text-gray-600 mb-1">Return</p>
                          <p className="font-semibold text-gray-900">{selectedReturnFlight?.origin} → {selectedReturnFlight?.destination}</p>
                          <p className="text-sm text-gray-500">{formatDate(selectedReturnFlight.departure_time)}</p>
                          <p className="text-green-600 font-semibold">₹{(selectedReturnFlight?.price || 0) * getTotalPassengers()}</p>
                        </div>
                        <div className="bg-white rounded-xl p-4 text-center">
                          <p className="text-sm text-gray-600 mb-1">Total</p>
                          <p className="text-2xl font-bold text-green-600">
                            ₹{((selectedDepartureFlight?.price || 0) + (selectedReturnFlight?.price || 0)) * getTotalPassengers()}
                          </p>
                          <p className="text-xs text-gray-500">for {getTotalPassengers()} passenger{getTotalPassengers() > 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <button
                          onClick={handleRoundTripBooking}
                          className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-200 hover:scale-105 shadow-md hover:shadow-lg flex items-center justify-center space-x-2 mx-auto"
                        >
                          <span>🚀 Continue to Booking</span>
                          <span>→</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* One-way flow: Show all flights normally */}
            {tripType === "one-way" && (
              <>
                {filteredFlights.length === 0 && !filtering ? (
                  <div className="text-center py-12 bg-white rounded-2xl shadow-lg">
                    <div className="text-6xl mb-4">✈️</div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      No flights found
                    </h3>
                    <p className="text-gray-600">
                      Try adjusting your search criteria or check back later for new flights.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {filteredFlights.map((flight) => (
                      <div
                        key={flight.id}
                        className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden cursor-pointer transform hover:scale-105"
                        onClick={() => handleFlightSelect(flight)}
                      >
                        {/* Flight Header */}
                        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6">
                          <div className="flex justify-between items-center">
                            <div>
                              <h3 className="text-xl font-bold mb-1">
                                {flight.airline} - {flight.flight_number}
                              </h3>
                              <p className="text-blue-100">
                                {flight.origin} → {flight.destination}
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="bg-white/20 text-white text-xs font-medium px-2 py-1 rounded-full">
                                {flight.cabin_class}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Flight Details */}
                        <div className="p-6">
                          <div className="grid grid-cols-3 gap-4 mb-6">
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
                                  (flight.available_seats ?? 0) >= getTotalPassengers() 
                                    ? 'text-green-600' 
                                    : 'text-red-600'
                                }`}>
                                  {(flight.available_seats ?? 0) > 0 ? (flight.available_seats ?? 0) : 'No seats available'}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Price and Book Button */}
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-sm text-gray-600">Price per passenger</p>
                              <p className="text-2xl font-bold text-green-600">
                                ₹{flight.price.toLocaleString()}
                              </p>
                              <p className="text-sm text-gray-500">
                                Total: ₹{(flight.price * getTotalPassengers()).toLocaleString()}
                              </p>
                            </div>
                            <button className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 hover:scale-105 shadow-md hover:shadow-lg">
                              Book Now
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
