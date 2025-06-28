"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
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

interface Passenger {
  name: string;
  age: string;
  gender: string;
}

interface ValidationErrors {
  passengers?: { [key: number]: { name?: string; age?: string; gender?: string } };
  payment?: { cardName?: string; cardNumber?: string; expiry?: string; cvv?: string };
}

export default function RoundTripBookingPage() {
  const searchParams = useSearchParams();
  const departureFlightId = searchParams.get('departure');
  const returnFlightId = searchParams.get('return');
  const router = useRouter();

  const [departureFlight, setDepartureFlight] = useState<Flight | null>(null);
  const [returnFlight, setReturnFlight] = useState<Flight | null>(null);
  const [loading, setLoading] = useState(true);
  const [passengers, setPassengers] = useState<Passenger[]>([
    { name: "", age: "", gender: "" }
  ]);
  const [step, setStep] = useState<"passenger" | "payment">("passenger");
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  useEffect(() => {
    const fetchFlightsAndUser = async () => {
      if (!departureFlightId || !returnFlightId) {
        router.push('/');
        return;
      }

      // Fetch both flights
      const [departureResult, returnResult] = await Promise.all([
        supabase.from("flights").select("*").eq("id", departureFlightId).single(),
        supabase.from("flights").select("*").eq("id", returnFlightId).single()
      ]);

      if (departureResult.data) setDepartureFlight(departureResult.data);
      if (returnResult.data) setReturnFlight(returnResult.data);

      // Fetch logged-in user ID
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;

      if (userId) {
        const { data: userProfile } = await supabase
          .from("users")
          .select("name")
          .eq("id", userId)
          .single();
        if (userProfile?.name) {
          setPassengers([{ name: userProfile.name, age: "", gender: "" }]);
        }
      }

      setLoading(false);
    };

    fetchFlightsAndUser();
  }, [departureFlightId, returnFlightId, router]);

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

  const validatePayment = () => {
    const errors: { cardName?: string; cardNumber?: string; expiry?: string; cvv?: string } = {};
    
    // Card name validation
    if (!cardName.trim()) {
      errors.cardName = "Cardholder name is required";
    } else if (cardName.trim().length < 2) {
      errors.cardName = "Cardholder name must be at least 2 characters long";
    } else {
      const nameRegex = /^[a-zA-Z\s]+$/;
      if (!nameRegex.test(cardName.trim())) {
        errors.cardName = "Cardholder name can only contain letters and spaces";
      }
    }
    
    // Card number validation
    const cleanCardNumber = cardNumber.replace(/\s/g, "");
    if (!cleanCardNumber) {
      errors.cardNumber = "Card number is required";
    } else if (!/^\d{13,19}$/.test(cleanCardNumber)) {
      errors.cardNumber = "Card number must be 13-19 digits";
    } else if (!luhnCheck(cleanCardNumber)) {
      errors.cardNumber = "Invalid card number";
    }
    
    // Expiry validation
    if (!expiry) {
      errors.expiry = "Expiry date is required";
    } else {
      const expiryRegex = /^(0[1-9]|1[0-2])\/([0-9]{2})$/;
      if (!expiryRegex.test(expiry)) {
        errors.expiry = "Please use MM/YY format";
      } else {
        const [month, year] = expiry.split("/");
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear() % 100;
        const currentMonth = currentDate.getMonth() + 1;
        
        if (parseInt(year) < currentYear || 
            (parseInt(year) === currentYear && parseInt(month) < currentMonth)) {
          errors.expiry = "Card has expired";
        }
      }
    }
    
    // CVV validation
    if (!cvv) {
      errors.cvv = "CVV is required";
    } else if (!/^\d{3,4}$/.test(cvv)) {
      errors.cvv = "CVV must be 3-4 digits";
    }
    
    return errors;
  };

  // Luhn algorithm for card number validation
  const luhnCheck = (num: string): boolean => {
    const arr = (num + '')
      .split('')
      .reverse()
      .map(x => parseInt(x));
    const lastDigit = arr.splice(0, 1)[0];
    const sum = arr.reduce((acc, val, i) => (i % 2 !== 0 ? acc + val : acc + ((val * 2) % 9) || 9), 0);
    return (sum + lastDigit) % 10 === 0;
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

  const validatePaymentForm = (): boolean => {
    const paymentErrors = validatePayment();
    const hasErrors = Object.keys(paymentErrors).length > 0;
    
    setValidationErrors(prev => ({ ...prev, payment: paymentErrors }));
    return !hasErrors;
  };

  const handleBooking = async () => {
    if (!validatePaymentForm()) {
      return;
    }

    const user = (await supabase.auth.getUser()).data.user;
    if (!user) {
      alert("Not logged in.");
      return;
    }

    // Calculate total price for both flights
    const totalPrice = (departureFlight!.price + returnFlight!.price) * passengers.length;

    // Create departure booking
    const departureBooking = {
      user_id: user.id,
      flight_id: departureFlightId,
      passengers: passengers,
      cabin_class: departureFlight!.cabin_class,
      total_price: departureFlight!.price * passengers.length,
      trip_type: "round-trip",
      status: "confirmed",
      payment_method: "card",
      payment_status: "success",
      transaction_id: `txn_${Date.now()}_dep`,
      paid_at: new Date().toISOString(),
    };

    // Create return booking
    const returnBooking = {
      user_id: user.id,
      flight_id: returnFlightId,
      passengers: passengers,
      cabin_class: returnFlight!.cabin_class,
      total_price: returnFlight!.price * passengers.length,
      trip_type: "round-trip",
      status: "confirmed",
      payment_method: "card",
      payment_status: "success",
      transaction_id: `txn_${Date.now()}_ret`,
      paid_at: new Date().toISOString(),
    };

    try {
      // Insert both bookings
      const { data: departureData, error: departureError } = await supabase
        .from("bookings")
        .insert([departureBooking])
        .select();

      const { data: returnData, error: returnError } = await supabase
        .from("bookings")
        .insert([returnBooking])
        .select();

      if (departureError || returnError) {
        alert(`Booking failed: ${departureError?.message || returnError?.message}`);
      } else {
        const departureBookingId = departureData?.[0]?.id;
        router.push(`/booking-success?bookingId=${departureBookingId}&roundTrip=true`);
      }
    } catch {
      alert("An unexpected error occurred. Please try again.");
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

  const isPassengerFormValid = () => {
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
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading flight details...</p>
          </div>
        </div>
      </>
    );
  }

  if (!departureFlight || !returnFlight) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Flight Not Found</h1>
            <p className="text-gray-600 mb-6">One or both flights could not be found.</p>
            <button
              onClick={() => router.push("/")}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200"
            >
              Back to Search
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
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Flight Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-xl p-6 sticky top-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <span className="mr-2">✈️</span>
                  Round Trip Summary
                </h2>

                <div className="space-y-6">
                  {/* Departure Flight */}
                  <div className="border-b border-gray-200 pb-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Departure</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm text-gray-600">Flight</p>
                          <p className="font-semibold">{departureFlight.flight_number}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Airline</p>
                          <p className="font-semibold">{departureFlight.airline}</p>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm text-gray-600">From</p>
                          <p className="font-semibold">{departureFlight.origin}</p>
                          <p className="text-sm text-gray-500">
                            {formatTime(departureFlight.departure_time)}
                          </p>
                        </div>
                        <div className="text-center">
                          <div className="w-16 h-0.5 bg-gray-300 relative">
                            <div className="absolute -top-1 left-0 w-2 h-2 bg-blue-600 rounded-full"></div>
                            <div className="absolute -top-1 right-0 w-2 h-2 bg-blue-600 rounded-full"></div>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {calculateFlightDuration(departureFlight.departure_time, departureFlight.arrival_time)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">To</p>
                          <p className="font-semibold">{departureFlight.destination}</p>
                          <p className="text-sm text-gray-500">
                            {formatTime(departureFlight.arrival_time)}
                          </p>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm text-gray-600">Date</p>
                          <p className="font-semibold">{formatDate(departureFlight.departure_time)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Class</p>
                          <p className="font-semibold">{departureFlight.cabin_class}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Return Flight */}
                  <div className="border-b border-gray-200 pb-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Return</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm text-gray-600">Flight</p>
                          <p className="font-semibold">{returnFlight.flight_number}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Airline</p>
                          <p className="font-semibold">{returnFlight.airline}</p>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm text-gray-600">From</p>
                          <p className="font-semibold">{returnFlight.origin}</p>
                          <p className="text-sm text-gray-500">
                            {formatTime(returnFlight.departure_time)}
                          </p>
                        </div>
                        <div className="text-center">
                          <div className="w-16 h-0.5 bg-gray-300 relative">
                            <div className="absolute -top-1 left-0 w-2 h-2 bg-blue-600 rounded-full"></div>
                            <div className="absolute -top-1 right-0 w-2 h-2 bg-blue-600 rounded-full"></div>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {calculateFlightDuration(returnFlight.departure_time, returnFlight.arrival_time)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">To</p>
                          <p className="font-semibold">{returnFlight.destination}</p>
                          <p className="text-sm text-gray-500">
                            {formatTime(returnFlight.arrival_time)}
                          </p>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm text-gray-600">Date</p>
                          <p className="font-semibold">{formatDate(returnFlight.departure_time)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Class</p>
                          <p className="font-semibold">{returnFlight.cabin_class}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <hr className="border-gray-200" />

                  <div className="flex justify-between">
                    <span className="text-lg font-semibold text-gray-900">
                      Total:
                    </span>
                    <span className="text-xl font-bold text-green-600">
                      ₹{((departureFlight.price + returnFlight.price) * passengers.length).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Booking Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Passenger Information Step */}
              {step === "passenger" && (
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
                      <div key={index} className="border border-gray-200 rounded-lg p-6">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-lg font-semibold text-gray-900">
                            Passenger {index + 1}
                          </h3>
                          {passengers.length > 1 && (
                            <button
                              onClick={() => removePassenger(index)}
                              className="text-red-600 hover:text-red-700 font-medium transition-colors duration-200"
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

                    <button
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-4 rounded-lg font-semibold text-lg transition-all duration-200 hover:scale-105 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => {
                        if (validatePassengerForm()) {
                          setStep("payment");
                        }
                      }}
                      disabled={!isPassengerFormValid()}
                    >
                      Continue to Payment
                    </button>
                  </div>
                </div>
              )}

              {/* Payment Step */}
              {step === "payment" && (
                <div className="bg-white rounded-2xl shadow-xl p-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                    <span className="mr-3">💳</span>
                    Payment Details
                  </h2>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cardholder Name *
                      </label>
                      <input
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                          validationErrors.payment?.cardName ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Name on card"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        onBlur={() => {
                          const errors = validatePayment();
                          setValidationErrors(prev => ({
                            ...prev,
                            payment: { ...prev.payment, cardName: errors.cardName }
                          }));
                        }}
                      />
                      {validationErrors.payment?.cardName && (
                        <p className="text-red-600 text-sm mt-1">{validationErrors.payment.cardName}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Card Number *
                      </label>
                      <input
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                          validationErrors.payment?.cardNumber ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="1234 5678 9012 3456"
                        maxLength={19}
                        value={cardNumber}
                        onChange={(e) =>
                          setCardNumber(
                            e.target.value
                              .replace(/\s/g, "")
                              .replace(/(\d{4})/g, "$1 ")
                              .trim()
                          )
                        }
                        onBlur={() => {
                          const errors = validatePayment();
                          setValidationErrors(prev => ({
                            ...prev,
                            payment: { ...prev.payment, cardNumber: errors.cardNumber }
                          }));
                        }}
                      />
                      {validationErrors.payment?.cardNumber && (
                        <p className="text-red-600 text-sm mt-1">{validationErrors.payment.cardNumber}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Expiry Date *
                        </label>
                        <input
                          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                            validationErrors.payment?.expiry ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="MM/YY"
                          maxLength={5}
                          value={expiry}
                          onChange={(e) => setExpiry(e.target.value)}
                          onBlur={() => {
                            const errors = validatePayment();
                            setValidationErrors(prev => ({
                              ...prev,
                              payment: { ...prev.payment, expiry: errors.expiry }
                            }));
                          }}
                        />
                        {validationErrors.payment?.expiry && (
                          <p className="text-red-600 text-sm mt-1">{validationErrors.payment.expiry}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          CVV *
                        </label>
                        <input
                          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
                            validationErrors.payment?.cvv ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="123"
                          maxLength={4}
                          type="password"
                          value={cvv}
                          onChange={(e) => setCvv(e.target.value)}
                          onBlur={() => {
                            const errors = validatePayment();
                            setValidationErrors(prev => ({
                              ...prev,
                              payment: { ...prev.payment, cvv: errors.cvv }
                            }));
                          }}
                        />
                        {validationErrors.payment?.cvv && (
                          <p className="text-red-600 text-sm mt-1">{validationErrors.payment.cvv}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex space-x-4">
                      <button
                        className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-4 rounded-lg font-semibold transition-all duration-200 hover:scale-105"
                        onClick={() => setStep("passenger")}
                      >
                        Back
                      </button>
                      <button
                        className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-4 rounded-lg font-semibold text-lg transition-all duration-200 hover:scale-105 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={handleBooking}
                        disabled={!cardName || !cardNumber || !expiry || !cvv}
                      >
                        Confirm & Book Round Trip
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 