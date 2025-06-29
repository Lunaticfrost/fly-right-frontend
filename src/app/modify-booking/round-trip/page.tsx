"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useSearchParams, useRouter } from "next/navigation";
import Header from "@/components/Header";

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

export default function RoundTripModifyBookingPage() {
  const searchParams = useSearchParams();
  const departureId = searchParams.get("departureId");
  const returnId = searchParams.get("returnId");
  const router = useRouter();

  const [departureBooking, setDepartureBooking] = useState<Booking | null>(null);
  const [returnBooking, setReturnBooking] = useState<Booking | null>(null);
  const [departureFlight, setDepartureFlight] = useState<Flight | null>(null);
  const [returnFlight, setReturnFlight] = useState<Flight | null>(null);
  const [availableDepartureFlights, setAvailableDepartureFlights] = useState<Flight[]>([]);
  const [availableReturnFlights, setAvailableReturnFlights] = useState<Flight[]>([]);
  const [selectedDepartureFlight, setSelectedDepartureFlight] = useState<Flight | null>(null);
  const [selectedReturnFlight, setSelectedReturnFlight] = useState<Flight | null>(null);
  const [passengers, setPassengers] = useState<Passenger[]>([
    { name: "", age: "", gender: "" }
  ]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  useEffect(() => {
    const fetchBookingsAndFlights = async () => {
      if (!departureId || !returnId) {
        alert("Invalid booking parameters");
        router.push("/my-bookings");
        return;
      }

      try {
        console.log("Fetching bookings with IDs:", { departureId, returnId });

        // Fetch departure booking
        const { data: departureBookingData, error: departureError } = await supabase
          .from("bookings")
          .select("*")
          .eq("id", departureId)
          .single();

        if (departureError) {
          console.error("Error fetching departure booking:", departureError);
          throw new Error("Departure booking not found");
        }

        // Fetch return booking
        const { data: returnBookingData, error: returnError } = await supabase
          .from("bookings")
          .select("*")
          .eq("id", returnId)
          .single();

        if (returnError) {
          console.error("Error fetching return booking:", returnError);
          throw new Error("Return booking not found");
        }

        console.log("Fetched bookings:", { departureBookingData, returnBookingData });

        setDepartureBooking(departureBookingData);
        setReturnBooking(returnBookingData);
        setPassengers(departureBookingData.passengers || []);

        // Fetch departure flight
        const { data: departureFlightData, error: departureFlightError } = await supabase
          .from("flights")
          .select("*")
          .eq("id", departureBookingData.flight_id)
          .single();

        if (departureFlightError) {
          console.error("Error fetching departure flight:", departureFlightError);
          throw new Error("Departure flight not found");
        }

        // Fetch return flight
        const { data: returnFlightData, error: returnFlightError } = await supabase
          .from("flights")
          .select("*")
          .eq("id", returnBookingData.flight_id)
          .single();

        if (returnFlightError) {
          console.error("Error fetching return flight:", returnFlightError);
          throw new Error("Return flight not found");
        }

        console.log("Fetched flights:", { departureFlightData, returnFlightData });

        setDepartureFlight(departureFlightData);
        setReturnFlight(returnFlightData);
        setSelectedDepartureFlight(departureFlightData);
        setSelectedReturnFlight(returnFlightData);

        // Fetch available departure flights
        const { data: availableDepartureData } = await supabase
          .from("flights")
          .select("*")
          .eq("origin", departureFlightData.origin)
          .eq("destination", departureFlightData.destination)
          .neq("id", departureFlightData.id)
          .gte("available_seats", departureBookingData.passengers?.length || 1)
          .order("departure_time", { ascending: true });

        // Fetch available return flights
        const { data: availableReturnData } = await supabase
          .from("flights")
          .select("*")
          .eq("origin", returnFlightData.origin)
          .eq("destination", returnFlightData.destination)
          .neq("id", returnFlightData.id)
          .gte("available_seats", returnBookingData.passengers?.length || 1)
          .order("departure_time", { ascending: true });

        setAvailableDepartureFlights(availableDepartureData || []);
        setAvailableReturnFlights(availableReturnData || []);

        console.log("Available flights:", { 
          departure: availableDepartureData?.length || 0, 
          return: availableReturnData?.length || 0 
        });

      } catch (error) {
        console.error("Error fetching bookings:", error);
        alert("Error loading booking details: " + (error as Error).message);
        router.push("/my-bookings");
      }

      setLoading(false);
    };

    fetchBookingsAndFlights();
  }, [departureId, returnId, router]);

  const validatePassenger = (passenger: Passenger) => {
    const errors: { name?: string; age?: string; gender?: string } = {};
    
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
    
    if (!passenger.age) {
      errors.age = "Age is required";
    } else {
      const ageNum = parseInt(passenger.age);
      if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
        errors.age = "Age must be between 1 and 120";
      }
    }
    
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

    if (!selectedDepartureFlight || !selectedReturnFlight) return;

    setSaving(true);
    try {
      const newDeparturePrice = selectedDepartureFlight.price * passengers.length;
      const newReturnPrice = selectedReturnFlight.price * passengers.length;
      
      console.log("Saving changes:", {
        departureId,
        returnId,
        newDeparturePrice,
        newReturnPrice,
        passengers: passengers.length
      });

      // Check seat availability for both flights
      if (selectedDepartureFlight.id !== departureFlight!.id) {
        if (selectedDepartureFlight.available_seats !== undefined && selectedDepartureFlight.available_seats < passengers.length) {
          alert(`Sorry, only ${selectedDepartureFlight.available_seats} seats are available for the selected departure flight.`);
          setSaving(false);
          return;
        }
      }

      if (selectedReturnFlight.id !== returnFlight!.id) {
        if (selectedReturnFlight.available_seats !== undefined && selectedReturnFlight.available_seats < passengers.length) {
          alert(`Sorry, only ${selectedReturnFlight.available_seats} seats are available for the selected return flight.`);
          setSaving(false);
          return;
        }
      }
      
      // Update departure booking
      const { error: departureError } = await supabase
        .from("bookings")
        .update({
          flight_id: selectedDepartureFlight.id,
          total_price: newDeparturePrice,
          passengers: passengers,
        })
        .eq("id", departureId);

      if (departureError) {
        console.error("Error updating departure booking:", departureError);
        alert(`Failed to modify departure booking: ${departureError.message}`);
        setSaving(false);
        return;
      }

      // Update return booking
      const { error: returnError } = await supabase
        .from("bookings")
        .update({
          flight_id: selectedReturnFlight.id,
          total_price: newReturnPrice,
          passengers: passengers,
        })
        .eq("id", returnId);

      if (returnError) {
        console.error("Error updating return booking:", returnError);
        alert(`Failed to modify return booking: ${returnError.message}`);
        setSaving(false);
        return;
      }

      // Handle seat management for departure flight
      if (selectedDepartureFlight.id !== departureFlight!.id) {
        // Restore seats to original departure flight
        if (departureFlight!.available_seats !== undefined) {
          const originalPassengerCount = departureBooking!.passengers?.length || 1;
          const newOriginalSeats = departureFlight!.available_seats + originalPassengerCount;
          
          await supabase
            .from("flights")
            .update({ available_seats: newOriginalSeats })
            .eq("id", departureFlight!.id);
        }

        // Reduce seats from new departure flight
        if (selectedDepartureFlight.available_seats !== undefined) {
          const newSeats = selectedDepartureFlight.available_seats - passengers.length;
          
          await supabase
            .from("flights")
            .update({ available_seats: newSeats })
            .eq("id", selectedDepartureFlight.id);
        }
      }

      // Handle seat management for return flight
      if (selectedReturnFlight.id !== returnFlight!.id) {
        // Restore seats to original return flight
        if (returnFlight!.available_seats !== undefined) {
          const originalPassengerCount = returnBooking!.passengers?.length || 1;
          const newOriginalSeats = returnFlight!.available_seats + originalPassengerCount;
          
          await supabase
            .from("flights")
            .update({ available_seats: newOriginalSeats })
            .eq("id", returnFlight!.id);
        }

        // Reduce seats from new return flight
        if (selectedReturnFlight.available_seats !== undefined) {
          const newSeats = selectedReturnFlight.available_seats - passengers.length;
          
          await supabase
            .from("flights")
            .update({ available_seats: newSeats })
            .eq("id", selectedReturnFlight.id);
        }
      }

      alert("Round-trip booking modified successfully!");
      router.push("/my-bookings");
    } catch (error) {
      console.error("Error modifying booking:", error);
      alert("An error occurred while modifying the booking.");
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
    );
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
      year: "numeric",
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

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading booking details...</p>
          </div>
        </div>
      </>
    );
  }

  if (!departureBooking || !returnBooking || !departureFlight || !returnFlight) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
          <div className="text-center bg-white rounded-2xl shadow-xl p-12">
            <div className="text-6xl mb-6">❌</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Booking Not Found
            </h1>
            <p className="text-gray-600 mb-8">
              The round-trip booking you&apos;re looking for doesn&apos;t exist.
            </p>
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Modify Round-Trip Booking
            </h1>
            <p className="text-lg text-gray-600">
              Update your round-trip flight details and passenger information
            </p>
          </div>

          <div className="max-w-6xl mx-auto">
            {/* Current Booking Summary */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <span className="mr-2">📋</span>
                Current Round-Trip Details
              </h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Departure Flight */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <span className="mr-2">✈️</span>
                    Departure Flight
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>Flight:</strong> {departureFlight.airline} - {departureFlight.flight_number}</p>
                    <p><strong>Route:</strong> {departureFlight.origin} → {departureFlight.destination}</p>
                    <p><strong>Date:</strong> {formatDate(departureFlight.departure_time)}</p>
                    <p><strong>Time:</strong> {formatTime(departureFlight.departure_time)} - {formatTime(departureFlight.arrival_time)}</p>
                    <p><strong>Duration:</strong> {calculateFlightDuration(departureFlight.departure_time, departureFlight.arrival_time)}</p>
                    <p><strong>Price:</strong> ₹{departureFlight.price.toLocaleString()}</p>
                  </div>
                </div>

                {/* Return Flight */}
                <div className="bg-green-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <span className="mr-2">🔄</span>
                    Return Flight
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>Flight:</strong> {returnFlight.airline} - {returnFlight.flight_number}</p>
                    <p><strong>Route:</strong> {returnFlight.origin} → {returnFlight.destination}</p>
                    <p><strong>Date:</strong> {formatDate(returnFlight.departure_time)}</p>
                    <p><strong>Time:</strong> {formatTime(returnFlight.departure_time)} - {formatTime(returnFlight.arrival_time)}</p>
                    <p><strong>Duration:</strong> {calculateFlightDuration(returnFlight.departure_time, returnFlight.arrival_time)}</p>
                    <p><strong>Price:</strong> ₹{returnFlight.price.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Flight Selection */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <span className="mr-2">✈️</span>
                Change Flights (Optional)
              </h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Departure Flight Selection */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Departure Flight</h3>
                  <select
                    value={selectedDepartureFlight?.id || ""}
                    onChange={(e) => {
                      const flight = availableDepartureFlights.find(f => f.id === e.target.value);
                      setSelectedDepartureFlight(flight || departureFlight);
                    }}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={departureFlight.id}>
                      {departureFlight.airline} - {departureFlight.flight_number} (Current)
                    </option>
                    {availableDepartureFlights.map((flight) => (
                      <option key={flight.id} value={flight.id}>
                        {flight.airline} - {flight.flight_number} - {formatDate(flight.departure_time)} - {formatTime(flight.departure_time)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Return Flight Selection */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Return Flight</h3>
                  <select
                    value={selectedReturnFlight?.id || ""}
                    onChange={(e) => {
                      const flight = availableReturnFlights.find(f => f.id === e.target.value);
                      setSelectedReturnFlight(flight || returnFlight);
                    }}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={returnFlight.id}>
                      {returnFlight.airline} - {returnFlight.flight_number} (Current)
                    </option>
                    {availableReturnFlights.map((flight) => (
                      <option key={flight.id} value={flight.id}>
                        {flight.airline} - {flight.flight_number} - {formatDate(flight.departure_time)} - {formatTime(flight.departure_time)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Passenger Information */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <span className="mr-2">👥</span>
                Passenger Information
              </h2>
              
              <div className="space-y-6">
                {passengers.map((passenger, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-semibold text-gray-900">Passenger {index + 1}</h3>
                      {passengers.length > 1 && (
                        <button
                          onClick={() => removePassenger(index)}
                          className="text-red-600 hover:text-red-700 font-medium"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={passenger.name}
                          onChange={(e) => updatePassenger(index, 'name', e.target.value)}
                          className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            validationErrors.passengers?.[index]?.name ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="Enter full name"
                        />
                        {validationErrors.passengers?.[index]?.name && (
                          <p className="text-red-500 text-sm mt-1">{validationErrors.passengers[index].name}</p>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Age
                        </label>
                        <input
                          type="number"
                          value={passenger.age}
                          onChange={(e) => updatePassenger(index, 'age', e.target.value)}
                          className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            validationErrors.passengers?.[index]?.age ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="Age"
                          min="1"
                          max="120"
                        />
                        {validationErrors.passengers?.[index]?.age && (
                          <p className="text-red-500 text-sm mt-1">{validationErrors.passengers[index].age}</p>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Gender
                        </label>
                        <select
                          value={passenger.gender}
                          onChange={(e) => updatePassenger(index, 'gender', e.target.value)}
                          className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            validationErrors.passengers?.[index]?.gender ? 'border-red-500' : 'border-gray-300'
                          }`}
                        >
                          <option value="">Select Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                        {validationErrors.passengers?.[index]?.gender && (
                          <p className="text-red-500 text-sm mt-1">{validationErrors.passengers[index].gender}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                <button
                  onClick={addPassenger}
                  className="w-full bg-blue-100 hover:bg-blue-200 text-blue-700 py-3 rounded-lg font-medium transition-all duration-200"
                >
                  + Add Passenger
                </button>
              </div>
            </div>

            {/* Price Summary */}
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <span className="mr-2">💰</span>
                Price Summary
              </h2>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Departure Flight:</span>
                  <span className="font-medium">₹{selectedDepartureFlight?.price.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Return Flight:</span>
                  <span className="font-medium">₹{selectedReturnFlight?.price.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Passengers:</span>
                  <span className="font-medium">{passengers.length}</span>
                </div>
                <hr className="border-gray-300" />
                <div className="flex justify-between">
                  <span className="text-lg font-semibold text-gray-900">Total:</span>
                  <span className="text-xl font-bold text-green-600">
                    ₹{((selectedDepartureFlight?.price || 0) + (selectedReturnFlight?.price || 0)) * passengers.length}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-4">
              <button
                onClick={() => router.push("/my-bookings")}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveChanges}
                disabled={!isFormValid() || saving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-all duration-200"
              >
                {saving ? "Saving Changes..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 