"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import LoadingButton from "@/components/LoadingButton";

interface Booking {
  id: string;
  user_id: string;
  flight_id: string;
  passengers: Passenger[];
  cabin_class: string;
  total_price: number;
  trip_type: string;
  status: string;
  payment_method: string;
  payment_status: string;
  transaction_id: string;
  paid_at: string;
  created_at: string;
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

interface Passenger {
  name: string;
  age: string;
  gender: string;
}

interface ValidationErrors {
  passengers?: { [key: number]: { name?: string; age?: string; gender?: string } };
}

export default function ModifyBookingPage() {
  const params = useParams();
  const bookingId = params.bookingId as string;
  const router = useRouter();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [flight, setFlight] = useState<Flight | null>(null);
  const [availableFlights, setAvailableFlights] = useState<Flight[]>([]);
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [passengers, setPassengers] = useState<Passenger[]>([
    { name: "", age: "", gender: "" }
  ]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [isRoundTrip, setIsRoundTrip] = useState(false);
  const [relatedBooking, setRelatedBooking] = useState<Booking | null>(null);
  const [relatedFlight, setRelatedFlight] = useState<Flight | null>(null);
  const [availableReturnFlights, setAvailableReturnFlights] = useState<Flight[]>([]);
  const [selectedReturnFlight, setSelectedReturnFlight] = useState<Flight | null>(null);

  useEffect(() => {
    const fetchBookingAndFlight = async () => {
      // Fetch booking
      const { data: bookingData } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", bookingId)
        .single();
      
      if (bookingData) {
        setBooking(bookingData);
        setPassengers(bookingData.passengers || []);

        // Check if this is a round-trip booking
        if (bookingData.trip_type === 'round-trip' && bookingData.transaction_id) {
          setIsRoundTrip(true);
          
          // Find the related booking (departure or return)
          const currentTransactionId = bookingData.transaction_id;
          const isDeparture = currentTransactionId?.includes('_dep');
          
          if (isDeparture) {
            // This is departure, find return
            const returnTransactionId = currentTransactionId.replace('_dep', '_ret');
            const { data: returnBookingData } = await supabase
              .from("bookings")
              .select("*")
              .eq("transaction_id", returnTransactionId)
              .single();
            
            if (returnBookingData) {
              setRelatedBooking(returnBookingData);
              
              // Fetch return flight
              const { data: returnFlightData } = await supabase
                .from("flights")
                .select("*")
                .eq("id", returnBookingData.flight_id)
                .single();
              
              setRelatedFlight(returnFlightData);
            }
          } else {
            // This is return, find departure
            const departureTransactionId = currentTransactionId?.replace('_ret', '_dep');
            const { data: departureBookingData } = await supabase
              .from("bookings")
              .select("*")
              .eq("transaction_id", departureTransactionId)
              .single();
            
            if (departureBookingData) {
              setRelatedBooking(departureBookingData);
              
              // Fetch departure flight
              const { data: departureFlightData } = await supabase
                .from("flights")
                .select("*")
                .eq("id", departureBookingData.flight_id)
                .single();
              
              setRelatedFlight(departureFlightData);
            }
          }
        }

        // Fetch original flight
        const { data: flightData } = await supabase
          .from("flights")
          .select("*")
          .eq("id", bookingData.flight_id)
          .single();
        
        setFlight(flightData);
        setSelectedFlight(flightData);

        // Fetch available flights for the same route
        const { data: availableFlightsData } = await supabase
          .from("flights")
          .select("*")
          .eq("origin", flightData.origin)
          .eq("destination", flightData.destination)
          .neq("id", flightData.id)
          .gte("available_seats", bookingData.passengers?.length || 1)
          .order("departure_time", { ascending: true });

        setAvailableFlights(availableFlightsData || []);

        // For round-trip bookings, also fetch available return flights
        if (isRoundTrip && relatedFlight) {
          setSelectedReturnFlight(relatedFlight);
          
          // Fetch available return flights (same route as return flight)
          const { data: availableReturnFlightsData } = await supabase
            .from("flights")
            .select("*")
            .eq("origin", relatedFlight.origin)
            .eq("destination", relatedFlight.destination)
            .neq("id", relatedFlight.id)
            .gte("available_seats", bookingData.passengers?.length || 1)
            .order("departure_time", { ascending: true });

          setAvailableReturnFlights(availableReturnFlightsData || []);
        }
      }

      setLoading(false);
    };

    fetchBookingAndFlight();
  }, [bookingId]);

  const validatePassenger = (passenger: Passenger) => {
    const errors: { name?: string; age?: string; gender?: string } = {};
    
    // Name validation
    if (!passenger.name.trim()) {
      errors.name = "Full name is required";
    } else if (passenger.name.trim().length < 2) {
      errors.name = "Name must be at least 2 characters long";
    } else if (passenger.name.trim().length > 50) {
      errors.name = "Name must be less than 50 characters";
    } else {
      const nameRegex = /^[a-zA-Z\s]+$/;
      if (!nameRegex.test(passenger.name.trim())) {
        errors.name = "Name can only contain letters and spaces";
      }
    }
    
    // Age validation
    if (!passenger.age) {
      errors.age = "Age is required";
    } else {
      const ageNum = parseInt(passenger.age);
      if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
        errors.age = "Age must be between 1 and 120";
      }
    }
    
    // Gender validation
    if (!passenger.gender) {
      errors.gender = "Gender is required";
    } else if (!["Male", "Female", "Other"].includes(passenger.gender)) {
      errors.gender = "Please select a valid gender";
    }
    
    return errors;
  };

  const validatePassengerForm = (): boolean => {
    const passengerErrors: { [key: number]: { name?: string; age?: string; gender?: string } } = {};
    let hasErrors = false;
    
    passengers.forEach((passenger, index) => {
      const errors = validatePassenger(passenger);
      if (Object.keys(errors).length > 0) {
        passengerErrors[index] = errors;
        hasErrors = true;
      }
    });
    
    setValidationErrors(prev => ({ ...prev, passengers: passengerErrors }));
    return !hasErrors;
  };

  const handleSaveChanges = async () => {
    if (!validatePassengerForm()) {
      return;
    }

    if (!selectedFlight) return;

    // Validate flight timing for round-trip bookings
    if (!validateFlightTiming()) {
      return;
    }

    setSaving(true);
    try {
      const newTotalPrice = selectedFlight.price * passengers.length;
      
      // Check if we're changing flights and if the new flight has enough seats
      if (selectedFlight.id !== flight!.id) {
        if (selectedFlight.available_seats !== undefined && selectedFlight.available_seats < passengers.length) {
          alert(`Sorry, only ${selectedFlight.available_seats} seats are available for the selected departure flight. Please choose a different flight or reduce the number of passengers.`);
          setSaving(false);
          return;
        }
      }

      // For round-trip, check return flight seat availability
      if (isRoundTrip && selectedReturnFlight && selectedReturnFlight.id !== relatedFlight!.id) {
        if (selectedReturnFlight.available_seats !== undefined && selectedReturnFlight.available_seats < passengers.length) {
          alert(`Sorry, only ${selectedReturnFlight.available_seats} seats are available for the selected return flight. Please choose a different flight or reduce the number of passengers.`);
          setSaving(false);
          return;
        }
      }
      
      // Update the current booking
      const { error } = await supabase
        .from("bookings")
        .update({
          flight_id: selectedFlight.id,
          total_price: newTotalPrice,
          passengers: passengers,
        })
        .eq("id", bookingId);

      if (error) {
        alert(`Failed to modify booking: ${error.message}`);
        return;
      }

      // If this is a round-trip booking, also update the related booking
      if (isRoundTrip && relatedBooking && selectedReturnFlight) {
        const newReturnTotalPrice = selectedReturnFlight.price * passengers.length;
        
        const { error: relatedError } = await supabase
          .from("bookings")
          .update({
            flight_id: selectedReturnFlight.id,
            total_price: newReturnTotalPrice,
            passengers: passengers,
          })
          .eq("id", relatedBooking.id);

        if (relatedError) {
          console.error("Failed to update related booking:", relatedError);
          alert("Warning: Departure flight was updated but return flight update failed. Please contact support.");
        }
      }

      // Handle seat management when changing flights
      if (selectedFlight.id !== flight!.id) {
        // Restore seats to the original flight
        if (flight!.available_seats !== undefined) {
          const originalPassengerCount = booking!.passengers?.length || 1;
          const newOriginalSeats = flight!.available_seats + originalPassengerCount;
          
          const { error: originalSeatError } = await supabase
            .from("flights")
            .update({ available_seats: newOriginalSeats })
            .eq("id", flight!.id);

          if (originalSeatError) {
            console.error("Failed to restore seats to original flight:", originalSeatError);
          }
        }

        // Reduce seats from the new flight
        if (selectedFlight.available_seats !== undefined) {
          const newSeats = selectedFlight.available_seats - passengers.length;
          
          const { error: newSeatError } = await supabase
            .from("flights")
            .update({ available_seats: newSeats })
            .eq("id", selectedFlight.id);

          if (newSeatError) {
            console.error("Failed to reduce seats from new flight:", newSeatError);
          }
        }
      }

      // Handle seat management for return flight changes
      if (isRoundTrip && selectedReturnFlight && selectedReturnFlight.id !== relatedFlight!.id) {
        // Restore seats to the original return flight
        if (relatedFlight!.available_seats !== undefined) {
          const originalPassengerCount = relatedBooking!.passengers?.length || 1;
          const newOriginalSeats = relatedFlight!.available_seats + originalPassengerCount;
          
          const { error: originalSeatError } = await supabase
            .from("flights")
            .update({ available_seats: newOriginalSeats })
            .eq("id", relatedFlight!.id);

          if (originalSeatError) {
            console.error("Failed to restore seats to original return flight:", originalSeatError);
          }
        }

        // Reduce seats from the new return flight
        if (selectedReturnFlight.available_seats !== undefined) {
          const newSeats = selectedReturnFlight.available_seats - passengers.length;
          
          const { error: newSeatError } = await supabase
            .from("flights")
            .update({ available_seats: newSeats })
            .eq("id", selectedReturnFlight.id);

          if (newSeatError) {
            console.error("Failed to reduce seats from new return flight:", newSeatError);
          }
        }
      }

      const message = isRoundTrip 
        ? "Round-trip booking modified successfully! Both flights have been updated."
        : "Booking modified successfully!";
      alert(message);
      router.push("/my-bookings");
    } catch {
      alert("An unexpected error occurred while modifying the booking.");
    } finally {
      setSaving(false);
    }
  };

  const addPassenger = () => {
    setPassengers([...passengers, { name: "", age: "", gender: "" }]);
  };

  const removePassenger = (index: number) => {
    if (passengers.length > 1) {
      const newPassengers = passengers.filter((_, i) => i !== index);
      setPassengers(newPassengers);
      // Clear validation errors for removed passenger
      if (validationErrors.passengers?.[index]) {
        const newPassengerErrors = { ...validationErrors.passengers };
        delete newPassengerErrors[index];
        setValidationErrors(prev => ({ 
          ...prev, 
          passengers: newPassengerErrors 
        }));
      }
    }
  };

  const updatePassenger = (index: number, field: keyof Passenger, value: string) => {
    const newPassengers = [...passengers];
    newPassengers[index] = { ...newPassengers[index], [field]: value };
    setPassengers(newPassengers);
    
    // Clear validation error for this field if it exists
    if (validationErrors.passengers?.[index]?.[field]) {
      const newPassengerErrors = { ...validationErrors.passengers };
      if (newPassengerErrors[index]) {
        delete newPassengerErrors[index][field];
        if (Object.keys(newPassengerErrors[index]).length === 0) {
          delete newPassengerErrors[index];
        }
      }
      setValidationErrors(prev => ({ 
        ...prev, 
        passengers: newPassengerErrors 
      }));
    }
  };

  const isFormValid = () => {
    return passengers.every(passenger => 
      passenger.name.trim() !== "" && 
      passenger.age !== "" && 
      passenger.gender !== ""
    ) && selectedFlight;
  };

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

  // Filter flights to avoid timing conflicts for round-trip bookings
  const filterConflictingFlights = (flights: Flight[], isReturnFlight: boolean = false) => {
    if (!isRoundTrip) return flights;

    const currentDepartureFlight = isReturnFlight ? selectedFlight : flight;
    const currentReturnFlight = isReturnFlight ? flight : selectedReturnFlight;

    if (!currentDepartureFlight || !currentReturnFlight) return flights;

    return flights.filter(flight => {
      const flightDepartureTime = new Date(flight.departure_time);
      
      if (isReturnFlight) {
        // For return flights, ensure they depart AFTER the departure flight arrives
        // and have at least 1 hour gap
        const minGap = 60 * 60 * 1000; // 1 hour in milliseconds
        const departureArrivalTime = new Date(currentDepartureFlight.arrival_time).getTime();
        return flightDepartureTime.getTime() > departureArrivalTime + minGap;
      } else {
        // For departure flights, ensure they depart BEFORE the return flight departs
        // and have at least 1 hour gap between departure arrival and return departure
        const minGap = 60 * 60 * 1000; // 1 hour in milliseconds
        const returnDepartureTime = new Date(currentReturnFlight.departure_time).getTime();
        return flightDepartureTime.getTime() < returnDepartureTime - minGap;
      }
    });
  };

  // Validate that selected flights don't have timing conflicts
  const validateFlightTiming = (): boolean => {
    if (!isRoundTrip || !selectedFlight || !selectedReturnFlight) return true;

    const departureTime = new Date(selectedFlight.departure_time);
    const returnTime = new Date(selectedReturnFlight.departure_time);
    const minGap = 60 * 60 * 1000; // 1 hour in milliseconds

    // Check if departure flight departs before return flight
    if (departureTime.getTime() >= returnTime.getTime()) {
      alert("Error: Departure flight must depart before return flight.");
      return false;
    }

    // Check if there's at least 1 hour gap between departure arrival and return departure
    const departureArrivalTime = new Date(selectedFlight.arrival_time).getTime();
    if (returnTime.getTime() <= departureArrivalTime + minGap) {
      alert("Error: There must be at least 1 hour gap between departure arrival and return departure.");
      return false;
    }

    return true;
  };

  // Check if a flight has timing conflicts with the other selected flight
  const hasTimingConflict = (flight: Flight, isReturnFlight: boolean = false): boolean => {
    if (!isRoundTrip) return false;

    const otherFlight = isReturnFlight ? selectedFlight : selectedReturnFlight;
    if (!otherFlight) return false;

    const flightDepartureTime = new Date(flight.departure_time);
    const minGap = 60 * 60 * 1000; // 1 hour in milliseconds

    if (isReturnFlight) {
      // For return flights, check if they depart after departure flight arrives with gap
      const departureArrivalTime = new Date(otherFlight.arrival_time).getTime();
      return flightDepartureTime.getTime() <= departureArrivalTime + minGap;
    } else {
      // For departure flights, check if they depart before return flight departs with gap
      const returnDepartureTime = new Date(otherFlight.departure_time).getTime();
      return flightDepartureTime.getTime() >= returnDepartureTime - minGap;
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading booking details...</p>
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
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Booking Not Found</h1>
            <p className="text-gray-600 mb-6">The booking you&apos;re looking for doesn&apos;t exist.</p>
            <button
              onClick={() => router.push("/my-bookings")}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200"
            >
              Back to My Bookings
            </button>
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
              {isRoundTrip ? 'Modify Round-Trip Booking' : 'Modify Booking'}
            </h1>
            <p className="text-xl text-gray-600">
              {isRoundTrip 
                ? 'Update your round-trip flight booking details (passenger changes apply to both flights, both flights can be changed)'
                : 'Update your flight booking details'
              }
            </p>
            {isRoundTrip && (
              <div className="mt-4 bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium inline-block">
                🔄 Round-Trip: Passenger changes apply to both flights, both flights can be modified
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Current Booking Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-xl p-6 sticky top-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <span className="mr-2">📋</span>
                  Current Booking
                </h2>

                <div className="space-y-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h3 className="font-bold text-lg text-gray-900 mb-2">
                      {flight.airline} - {flight.flight_number}
                    </h3>
                    <p className="text-gray-600 mb-3">
                      {flight.origin} → {flight.destination}
                    </p>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Departure</p>
                        <p className="font-semibold text-gray-900">
                          {formatTime(flight.departure_time)}
                        </p>
                        <p className="text-gray-500">
                          {formatDate(flight.departure_time)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Arrival</p>
                        <p className="font-semibold text-gray-900">
                          {formatTime(flight.arrival_time)}
                        </p>
                        <p className="text-gray-500">
                          {formatDate(flight.arrival_time)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-blue-200">
                      <div className="flex items-center justify-center space-x-2">
                        <span className="text-blue-600">⏱️</span>
                        <span className="text-sm font-medium text-gray-700">
                          Duration: {calculateFlightDuration(flight.departure_time, flight.arrival_time)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Round-trip return flight information */}
                  {isRoundTrip && relatedFlight && (
                    <div className="bg-green-50 rounded-lg p-4">
                      <h3 className="font-bold text-lg text-gray-900 mb-2 flex items-center">
                        <span className="mr-2">🔄</span>
                        Return Flight
                      </h3>
                      <p className="text-gray-600 mb-3">
                        {relatedFlight.airline} - {relatedFlight.flight_number}
                      </p>
                      <p className="text-gray-600 mb-3">
                        {relatedFlight.origin} → {relatedFlight.destination}
                      </p>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Departure</p>
                          <p className="font-semibold text-gray-900">
                            {formatTime(relatedFlight.departure_time)}
                          </p>
                          <p className="text-gray-500">
                            {formatDate(relatedFlight.departure_time)}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Arrival</p>
                          <p className="font-semibold text-gray-900">
                            {formatTime(relatedFlight.arrival_time)}
                          </p>
                          <p className="text-gray-500">
                            {formatDate(relatedFlight.arrival_time)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-green-200">
                        <div className="flex items-center justify-center space-x-2">
                          <span className="text-green-600">⏱️</span>
                          <span className="text-sm font-medium text-gray-700">
                            Duration: {calculateFlightDuration(relatedFlight.departure_time, relatedFlight.arrival_time)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Trip Type:</span>
                      <span className="font-medium text-gray-900">
                        {isRoundTrip ? 'Round-Trip' : 'One-Way'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cabin Class:</span>
                      <span className="font-medium text-gray-900">
                        {booking.cabin_class}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Current Price:</span>
                      <span className="font-medium text-gray-900">
                        ₹{booking.total_price.toLocaleString()}
                      </span>
                    </div>
                    {isRoundTrip && relatedBooking && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Round-Trip Price:</span>
                        <span className="font-medium text-gray-900">
                          ₹{(booking.total_price + relatedBooking.total_price).toLocaleString()}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Passengers:</span>
                      <span className="font-medium text-gray-900">
                        {passengers.length}
                      </span>
                    </div>
                    {selectedFlight && selectedFlight.id !== flight.id && (
                      <>
                        <hr className="border-gray-200" />
                        <div className="flex justify-between">
                          <span className="text-gray-600">New Departure Price:</span>
                          <span className="font-medium text-green-600">
                            ₹{(selectedFlight.price * passengers.length).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Departure Price Difference:</span>
                          <span className={`font-medium ${
                            (selectedFlight.price * passengers.length) > booking.total_price 
                              ? 'text-red-600' 
                              : 'text-green-600'
                          }`}>
                            {((selectedFlight.price * passengers.length) - booking.total_price) > 0 ? '+' : ''}
                            ₹{((selectedFlight.price * passengers.length) - booking.total_price).toLocaleString()}
                          </span>
                        </div>
                      </>
                    )}
                    {isRoundTrip && selectedReturnFlight && selectedReturnFlight.id !== relatedFlight?.id && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-600">New Return Price:</span>
                          <span className="font-medium text-green-600">
                            ₹{(selectedReturnFlight.price * passengers.length).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Return Price Difference:</span>
                          <span className={`font-medium ${
                            (selectedReturnFlight.price * passengers.length) > (relatedBooking?.total_price || 0)
                              ? 'text-red-600' 
                              : 'text-green-600'
                          }`}>
                            {((selectedReturnFlight.price * passengers.length) - (relatedBooking?.total_price || 0)) > 0 ? '+' : ''}
                            ₹{((selectedReturnFlight.price * passengers.length) - (relatedBooking?.total_price || 0)).toLocaleString()}
                          </span>
                        </div>
                        <hr className="border-gray-200" />
                        <div className="flex justify-between">
                          <span className="text-lg font-semibold text-gray-900">New Total Round-Trip Price:</span>
                          <span className="text-xl font-bold text-green-600">
                            ₹{((selectedFlight?.price || flight?.price || 0) + (selectedReturnFlight?.price || relatedFlight?.price || 0)) * passengers.length}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modification Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Flight Selection */}
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <span className="mr-3">✈️</span>
                  Select New Flight
                </h2>

                {isRoundTrip && (
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h3 className="font-semibold text-blue-800 mb-2">🕐 Round-Trip Timing Rules:</h3>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• Departure flight must depart before return flight</li>
                      <li>• Return flight must depart at least 1 hour after departure flight arrives</li>
                      <li>• Flights with timing conflicts are filtered out automatically</li>
                    </ul>
                  </div>
                )}

                <div className="space-y-4">
                  {/* Current Flight Option */}
                  <div 
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                      selectedFlight?.id === flight.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedFlight(flight)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {flight.airline} - {flight.flight_number} (Current)
                        </h3>
                        <p className="text-sm text-gray-600">
                          {formatTime(flight.departure_time)} - {formatTime(flight.arrival_time)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(flight.departure_time)} • {calculateFlightDuration(flight.departure_time, flight.arrival_time)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">
                          ₹{flight.price.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500">per passenger</p>
                      </div>
                    </div>
                  </div>

                  {/* Available Alternative Flights */}
                  {filterConflictingFlights(availableFlights).map((altFlight) => (
                    <div 
                      key={altFlight.id}
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                        selectedFlight?.id === altFlight.id 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedFlight(altFlight)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {altFlight.airline} - {altFlight.flight_number}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {formatTime(altFlight.departure_time)} - {formatTime(altFlight.arrival_time)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDate(altFlight.departure_time)} • {calculateFlightDuration(altFlight.departure_time, altFlight.arrival_time)}
                          </p>
                          {hasTimingConflict(altFlight) && (
                            <p className="text-xs text-red-600 mt-1">
                              ⚠️ Timing conflict with return flight
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900">
                            ₹{altFlight.price.toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500">per passenger</p>
                        </div>
                      </div>
                    </div>
                  ))}

                  {filterConflictingFlights(availableFlights).length === 0 && (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <p className="text-gray-600">No alternative flights available for this route.</p>
                    </div>
                  )}
                </div>

                {/* Return Flight Selection for Round-Trip */}
                {isRoundTrip && relatedFlight && (
                  <div className="mt-8 pt-8 border-t border-gray-200">
                    <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                      <span className="mr-2">🔄</span>
                      Select Return Flight
                    </h3>

                    <div className="space-y-4">
                      {/* Current Return Flight Option */}
                      <div 
                        className={`border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                          selectedReturnFlight?.id === relatedFlight.id 
                            ? 'border-green-500 bg-green-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedReturnFlight(relatedFlight)}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {relatedFlight.airline} - {relatedFlight.flight_number} (Current)
                            </h3>
                            <p className="text-sm text-gray-600">
                              {formatTime(relatedFlight.departure_time)} - {formatTime(relatedFlight.arrival_time)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatDate(relatedFlight.departure_time)} • {calculateFlightDuration(relatedFlight.departure_time, relatedFlight.arrival_time)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-gray-900">
                              ₹{relatedFlight.price.toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-500">per passenger</p>
                          </div>
                        </div>
                      </div>

                      {/* Available Alternative Return Flights */}
                      {filterConflictingFlights(availableReturnFlights, true).map((altFlight) => (
                        <div 
                          key={altFlight.id}
                          className={`border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                            selectedReturnFlight?.id === altFlight.id 
                              ? 'border-green-500 bg-green-50' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => setSelectedReturnFlight(altFlight)}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <h3 className="font-semibold text-gray-900">
                                {altFlight.airline} - {altFlight.flight_number}
                              </h3>
                              <p className="text-sm text-gray-600">
                                {formatTime(altFlight.departure_time)} - {formatTime(altFlight.arrival_time)}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatDate(altFlight.departure_time)} • {calculateFlightDuration(altFlight.departure_time, altFlight.arrival_time)}
                              </p>
                              {hasTimingConflict(altFlight, true) && (
                                <p className="text-xs text-red-600 mt-1">
                                  ⚠️ Timing conflict with departure flight
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-gray-900">
                                ₹{altFlight.price.toLocaleString()}
                              </p>
                              <p className="text-xs text-gray-500">per passenger</p>
                            </div>
                          </div>
                        </div>
                      ))}

                      {filterConflictingFlights(availableReturnFlights, true).length === 0 && (
                        <div className="text-center py-8 bg-gray-50 rounded-lg">
                          <p className="text-gray-600">No alternative return flights available for this route.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Passenger Information */}
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                    <span className="mr-3">👥</span>
                    Passenger Information
                  </h2>
                  <button
                    onClick={addPassenger}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:scale-105 shadow-md hover:shadow-lg"
                  >
                    + Add Passenger
                  </button>
                </div>

                <div className="space-y-6">
                  {passengers.map((passenger, index) => (
                    <div
                      key={index}
                      className="border border-gray-200 rounded-lg p-6 bg-gray-50"
                    >
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Passenger {index + 1}
                        </h3>
                        {passengers.length > 1 && (
                          <button
                            onClick={() => removePassenger(index)}
                            className="text-red-600 hover:text-red-700 font-medium text-sm"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Full Name *
                          </label>
                          <input
                            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                              validationErrors.passengers?.[index]?.name ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
                            }`}
                            placeholder="Enter full name"
                            value={passenger.name}
                            onChange={(e) =>
                              updatePassenger(index, "name", e.target.value)
                            }
                            onBlur={() => {
                              const errors = validatePassenger(passenger);
                              setValidationErrors(prev => ({
                                ...prev,
                                passengers: {
                                  ...prev.passengers,
                                  [index]: { ...prev.passengers?.[index], name: errors.name }
                                }
                              }));
                            }}
                          />
                          {validationErrors.passengers?.[index]?.name && (
                            <p className="text-red-600 text-sm mt-1">{validationErrors.passengers[index].name}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Age *
                          </label>
                          <input
                            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                              validationErrors.passengers?.[index]?.age ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
                            }`}
                            placeholder="Age"
                            type="number"
                            min="1"
                            max="120"
                            value={passenger.age}
                            onChange={(e) =>
                              updatePassenger(index, "age", e.target.value)
                            }
                            onBlur={() => {
                              const errors = validatePassenger(passenger);
                              setValidationErrors(prev => ({
                                ...prev,
                                passengers: {
                                  ...prev.passengers,
                                  [index]: { ...prev.passengers?.[index], age: errors.age }
                                }
                              }));
                            }}
                          />
                          {validationErrors.passengers?.[index]?.age && (
                            <p className="text-red-600 text-sm mt-1">{validationErrors.passengers[index].age}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Gender *
                          </label>
                          <select
                            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                              validationErrors.passengers?.[index]?.gender ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
                            }`}
                            value={passenger.gender}
                            onChange={(e) =>
                              updatePassenger(index, "gender", e.target.value)
                            }
                            onBlur={() => {
                              const errors = validatePassenger(passenger);
                              setValidationErrors(prev => ({
                                ...prev,
                                passengers: {
                                  ...prev.passengers,
                                  [index]: { ...prev.passengers?.[index], gender: errors.gender }
                                }
                              }));
                            }}
                          >
                            <option value="">Select Gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </select>
                          {validationErrors.passengers?.[index]?.gender && (
                            <p className="text-red-600 text-sm mt-1">{validationErrors.passengers[index].gender}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4">
                <LoadingButton
                  onClick={() => router.push("/my-bookings")}
                  variant="secondary"
                  className="flex-1"
                  size="lg"
                >
                  Cancel
                </LoadingButton>
                <LoadingButton
                  onClick={handleSaveChanges}
                  loading={saving}
                  loadingText="Saving Changes..."
                  disabled={!isFormValid()}
                  className="flex-1"
                  size="lg"
                >
                  Save Changes
                </LoadingButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 