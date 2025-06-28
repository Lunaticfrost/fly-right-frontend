"use client";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useSearchParams, useRouter } from "next/navigation";
import Header from "@/components/Header";

interface Passenger {
  name: string;
  age: string;
  gender: string;
}

export default function RoundTripBookingPage() {
  const searchParams = useSearchParams();
  const departureFlightId = searchParams.get('departure');
  const returnFlightId = searchParams.get('return');
  const router = useRouter();

  const [departureFlight, setDepartureFlight] = useState<any>(null);
  const [returnFlight, setReturnFlight] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [passengers, setPassengers] = useState<Passenger[]>([
    { name: "", age: "", gender: "" }
  ]);
  const [step, setStep] = useState<"passenger" | "payment">("passenger");
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");

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

  const handleBooking = async () => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) {
      alert("Not logged in.");
      return;
    }

    if (!departureFlight || !returnFlight) {
      alert("Flight information is missing.");
      return;
    }

    // Calculate total price for both flights
    const totalPrice = (departureFlight.price + returnFlight.price) * passengers.length;

    // Create booking for departure flight
    const departureBooking = {
      user_id: user.id,
      flight_id: departureFlight.id,
      passengers: passengers,
      cabin_class: departureFlight.cabin_class,
      total_price: departureFlight.price * passengers.length,
      trip_type: "round-trip",
      status: "confirmed",
      payment_method: "card",
      payment_status: "success",
      transaction_id: `txn_${Date.now()}_dep`,
      paid_at: new Date().toISOString(),
      return_flight_id: returnFlight.id,
    };

    // Create booking for return flight
    const returnBooking = {
      user_id: user.id,
      flight_id: returnFlight.id,
      passengers: passengers,
      cabin_class: returnFlight.cabin_class,
      total_price: returnFlight.price * passengers.length,
      trip_type: "round-trip",
      status: "confirmed",
      payment_method: "card",
      payment_status: "success",
      transaction_id: `txn_${Date.now()}_ret`,
      paid_at: new Date().toISOString(),
      departure_flight_id: departureFlight.id,
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
    } catch (error) {
      alert(`Booking failed: ${error}`);
    }
  };

  const addPassenger = () => {
    setPassengers([...passengers, { name: "", age: "", gender: "" }]);
  };

  const removePassenger = (index: number) => {
    if (passengers.length > 1) {
      const newPassengers = passengers.filter((_, i) => i !== index);
      setPassengers(newPassengers);
    }
  };

  const updatePassenger = (index: number, field: keyof Passenger, value: string) => {
    const newPassengers = [...passengers];
    newPassengers[index] = { ...newPassengers[index], [field]: value };
    setPassengers(newPassengers);
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

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading flight details...</p>
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
          <div className="text-center bg-white rounded-2xl shadow-xl p-12">
            <div className="text-6xl mb-6">❌</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Flight Information Missing
            </h1>
            <p className="text-gray-600 mb-8">
              Unable to load flight information. Please try again.
            </p>
            <button
              onClick={() => router.push("/")}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 hover:scale-105"
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
        <div className="max-w-6xl mx-auto px-6 py-8">
          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-center space-x-4">
              <div
                className={`flex items-center ${
                  step === "passenger" ? "text-blue-600" : "text-gray-400"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    step === "passenger"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  1
                </div>
                <span className="ml-2 font-medium">Passenger Details</span>
              </div>
              <div className="w-16 h-0.5 bg-gray-300"></div>
              <div
                className={`flex items-center ${
                  step === "payment" ? "text-blue-600" : "text-gray-400"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    step === "payment"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  2
                </div>
                <span className="ml-2 font-medium">Payment</span>
              </div>
            </div>
          </div>

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
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h3 className="font-bold text-lg text-gray-900 mb-2 flex items-center">
                      <span className="mr-2">🛫</span>
                      Departure Flight
                    </h3>
                    <div className="space-y-2 text-sm">
                      <p className="font-semibold">{departureFlight.airline} - {departureFlight.flight_number}</p>
                      <p className="text-gray-600">{departureFlight.origin} → {departureFlight.destination}</p>
                      <p className="text-gray-500">{formatTime(departureFlight.departure_time)} - {formatDate(departureFlight.departure_time)}</p>
                      <p className="text-gray-500">Cabin: {departureFlight.cabin_class}</p>
                      <p className="font-semibold text-blue-600">₹{departureFlight.price.toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Return Flight */}
                  <div className="bg-green-50 rounded-lg p-4">
                    <h3 className="font-bold text-lg text-gray-900 mb-2 flex items-center">
                      <span className="mr-2">🛬</span>
                      Return Flight
                    </h3>
                    <div className="space-y-2 text-sm">
                      <p className="font-semibold">{returnFlight.airline} - {returnFlight.flight_number}</p>
                      <p className="text-gray-600">{returnFlight.origin} → {returnFlight.destination}</p>
                      <p className="text-gray-500">{formatTime(returnFlight.departure_time)} - {formatDate(returnFlight.departure_time)}</p>
                      <p className="text-gray-500">Cabin: {returnFlight.cabin_class}</p>
                      <p className="font-semibold text-green-600">₹{returnFlight.price.toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Price Summary */}
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Departure per passenger:</span>
                      <span className="font-medium text-gray-900">₹{departureFlight.price.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Return per passenger:</span>
                      <span className="font-medium text-gray-900">₹{returnFlight.price.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Passengers:</span>
                      <span className="font-medium text-gray-900">{passengers.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Taxes & Fees:</span>
                      <span className="font-medium text-gray-900">₹{((departureFlight.price + returnFlight.price) * passengers.length * 0.1).toFixed(0)}</span>
                    </div>
                    <hr className="border-gray-200" />
                    <div className="flex justify-between">
                      <span className="text-lg font-semibold text-gray-900">Total:</span>
                      <span className="text-xl font-bold text-green-600">₹{((departureFlight.price + returnFlight.price) * passengers.length).toLocaleString()}</span>
                    </div>
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
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                              placeholder="Enter full name"
                              value={passenger.name}
                              onChange={(e) =>
                                updatePassenger(index, "name", e.target.value)
                              }
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Age *
                            </label>
                            <input
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                              placeholder="Age"
                              type="number"
                              min="1"
                              max="120"
                              value={passenger.age}
                              onChange={(e) =>
                                updatePassenger(index, "age", e.target.value)
                              }
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Gender *
                            </label>
                            <select
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                              value={passenger.gender}
                              onChange={(e) =>
                                updatePassenger(index, "gender", e.target.value)
                              }
                            >
                              <option value="">Select Gender</option>
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}

                    <button
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-4 rounded-lg font-semibold text-lg transition-all duration-200 hover:scale-105 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => setStep("payment")}
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
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                        placeholder="Name on card"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Card Number *
                      </label>
                      <input
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
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
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Expiry Date *
                        </label>
                        <input
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                          placeholder="MM/YY"
                          maxLength={5}
                          value={expiry}
                          onChange={(e) => setExpiry(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          CVV *
                        </label>
                        <input
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                          placeholder="123"
                          maxLength={4}
                          type="password"
                          value={cvv}
                          onChange={(e) => setCvv(e.target.value)}
                        />
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