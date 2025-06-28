"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
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

    setSaving(true);
    try {
      const newTotalPrice = selectedFlight.price * passengers.length;
      
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
      } else {
        alert("Booking modified successfully!");
        router.push("/my-bookings");
      }
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
              Modify Booking
            </h1>
            <p className="text-xl text-gray-600">
              Update your flight booking details
            </p>
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

                  <div className="space-y-3">
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
                          <span className="text-gray-600">New Price:</span>
                          <span className="font-medium text-green-600">
                            ₹{(selectedFlight.price * passengers.length).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Price Difference:</span>
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
                  {availableFlights.map((altFlight) => (
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

                  {availableFlights.length === 0 && (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <p className="text-gray-600">No alternative flights available for this route.</p>
                    </div>
                  )}
                </div>
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
                <button
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-4 rounded-lg font-semibold transition-all duration-200 hover:scale-105"
                  onClick={() => router.push("/my-bookings")}
                >
                  Cancel
                </button>
                <button
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-4 rounded-lg font-semibold text-lg transition-all duration-200 hover:scale-105 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleSaveChanges}
                  disabled={!isFormValid() || saving}
                >
                  {saving ? (
                    <span className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Saving Changes...
                    </span>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 