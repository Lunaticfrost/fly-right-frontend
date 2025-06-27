"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from 'next/navigation'
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
  const router = useRouter()
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
      const departureDateOnly = new Date(flight.departure_time)
        .toISOString()
        .split("T")[0];
      return (
        (!originFilter || flight.origin === originFilter) &&
        (!destinationFilter || flight.destination === destinationFilter) &&
        (!departureDateFilter || departureDateOnly === departureDateFilter) &&
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

  return (
    <>
    <Header />
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Search Flights</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <select
          className="border px-3 py-2 rounded"
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

        <select
          className="border px-3 py-2 rounded"
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
        <input
          type="date"
          className="border px-3 py-2 rounded"
          value={departureDateFilter}
          onChange={(e) => setDepartureDateFilter(e.target.value)}
        />
        <select
          className="border px-3 py-2 rounded"
          value={cabinClassFilter}
          onChange={(e) => setCabinClassFilter(e.target.value)}
        >
          <option value="">All Cabin Classes</option>
          <option value="Economy">Economy</option>
          <option value="Premium Economy">Premium Economy</option>
          <option value="Business">Business</option>
          <option value="First">First</option>
        </select>
      </div>

      {/* Results */}
      {loading && <p>Loading flights...</p>}
      {!loading && filteredFlights.length === 0 && <p>No flights found.</p>}
      <ul className="space-y-4">
        {filteredFlights.map((flight) => (
          <li key={flight.id} className="p-4 border rounded shadow-sm">
            <h2 className="text-lg font-semibold">
              {flight.airline} – {flight.flight_number}
            </h2>
            <p>
              {flight.origin} → {flight.destination}
            </p>

            <p>Departure: {new Date(flight.departure_time).toLocaleString()}</p>
            <p>Arrival: {new Date(flight.arrival_time).toLocaleString()}</p>
            <p>Cabin: {flight.cabin_class}</p>
            <p className="font-bold">₹{flight.price}</p>
            <button
              onClick={() => router.push(`/book/${flight.id}`)}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Book
            </button>
          </li>
        ))}
      </ul>
    </div>
    </>
  );
}
