"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import { Notifications } from "@/lib/notifications";
import LoadingButton from "@/components/LoadingButton";

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

export default function BookingPage() {
  const params = useParams();
  const flightId = params.flightId as string;
  const router = useRouter();

  const [flight, setFlight] = useState<Flight | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
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
    const fetchFlightAndUser = async () => {
      // Fetch flight
      const { data: flightData } = await supabase
        .from("flights")
        .select("*")
        .eq("id", flightId)
        .single();
      setFlight(flightData);

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

    fetchFlightAndUser();
  }, [flightId]);

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

    setBookingLoading(true);
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) {
        alert("Not logged in.");
        return;
      }

      // Check seat availability before booking
      if (flight!.available_seats !== undefined && flight!.available_seats < passengers.length) {
        alert(`Sorry, only ${flight!.available_seats} seats are available for this flight. Please reduce the number of passengers or choose a different flight.`);
        return;
      }

      // Calculate total price based on number of passengers
      const totalPrice = flight!.price * passengers.length;

      const booking = {
        user_id: user.id,
        flight_id: flightId,
        passengers: passengers,
        cabin_class: flight!.cabin_class,
        total_price: totalPrice,
        trip_type: "one-way",
        status: "confirmed",
        payment_method: "card",
        payment_status: "success",
        transaction_id: `txn_${Date.now()}`,
        paid_at: new Date().toISOString(),
      };

      // Use a transaction to ensure both booking creation and seat reduction happen together
      const { data, error } = await supabase
        .from("bookings")
        .insert([booking])
        .select();

      if (error) {
        alert(`Booking failed: ${error.message}`);
        return;
      }

      // Reduce available seats after successful booking
      if (flight!.available_seats !== undefined) {
        const newAvailableSeats = flight!.available_seats - passengers.length;
        const { error: seatUpdateError } = await supabase
          .from("flights")
          .update({ available_seats: newAvailableSeats })
          .eq("id", flightId);

        if (seatUpdateError) {
          console.error("Failed to update seat availability:", seatUpdateError);
          // Note: In a production system, you might want to handle this more gracefully
          // For now, we'll just log the error since the booking was successful
        }
      }

      const bookingId = data?.[0]?.id;
      
      // Send booking confirmation email
      if (bookingId) {
        try {
          await Notifications.onBookingCreated(bookingId);
        } catch (emailError) {
          console.error('Failed to send booking confirmation email:', emailError);
          // Don't block the booking process if email fails
        }
      }

      router.push(`/booking-success?bookingId=${bookingId}`);
    } catch {
      alert("An unexpected error occurred during booking. Please try again.");
    } finally {
      setBookingLoading(false);
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

  if (!flight) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Flight Not Found</h1>
            <p className="text-gray-600 mb-6">The flight you&apos;re looking for doesn&apos;t exist.</p>
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
                  Flight Summary
                </h2>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-600">Flight</p>
                      <p className="font-semibold">{flight.flight_number}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Airline</p>
                      <p className="font-semibold">{flight.airline}</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-600">From</p>
                      <p className="font-semibold">{flight.origin}</p>
                      <p className="text-sm text-gray-500">
                        {formatTime(flight.departure_time)}
                      </p>
                    </div>
                    <div className="text-center">
                      <div className="w-16 h-0.5 bg-gray-300 relative">
                        <div className="absolute -top-1 left-0 w-2 h-2 bg-blue-600 rounded-full"></div>
                        <div className="absolute -top-1 right-0 w-2 h-2 bg-blue-600 rounded-full"></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {calculateFlightDuration(flight.departure_time, flight.arrival_time)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">To</p>
                      <p className="font-semibold">{flight.destination}</p>
                      <p className="text-sm text-gray-500">
                        {formatTime(flight.arrival_time)}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-600">Date</p>
                      <p className="font-semibold">{formatDate(flight.departure_time)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Class</p>
                      <p className="font-semibold">{flight.cabin_class}</p>
                    </div>
                  </div>

                  <hr className="border-gray-200" />

                  <div className="flex justify-between">
                    <span className="text-lg font-semibold text-gray-900">
                      Total:
                    </span>
                    <span className="text-xl font-bold text-green-600">
                      ₹{(flight.price * passengers.length).toLocaleString()}
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

                    <LoadingButton
                      onClick={() => {
                        if (validatePassengerForm()) {
                          setStep("payment");
                        }
                      }}
                      disabled={!isPassengerFormValid()}
                      className="w-full"
                      size="lg"
                    >
                      Continue to Payment
                    </LoadingButton>
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
                    {/* <TestCardNumbers /> */}
                    <span className="text-sm text-gray-500"> Test Card Number: 5555555555554444</span>

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
                      <LoadingButton
                        onClick={() => setStep("passenger")}
                        variant="secondary"
                        className="flex-1"
                        size="lg"
                      >
                        Back
                      </LoadingButton>
                      <LoadingButton
                        onClick={handleBooking}
                        loading={bookingLoading}
                        loadingText="Processing Booking..."
                        disabled={!cardName || !cardNumber || !expiry || !cvv}
                        variant="success"
                        className="flex-1"
                        size="lg"
                      >
                        Confirm & Book Flight
                      </LoadingButton>
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
