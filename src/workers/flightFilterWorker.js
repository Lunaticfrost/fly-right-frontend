// Flight Filter Worker
// This worker handles flight filtering to keep the main thread responsive

// Main filtering function
const filterFlights = (flights, criteria) => {
  return flights.filter((flight) => {
    // Convert flight departure time to local date string (YYYY-MM-DD format)
    const flightDate = new Date(flight.departure_time);
    const flightDateString = flightDate.toLocaleDateString('en-CA'); // en-CA gives YYYY-MM-DD format
    
    // Check available seats if the field exists
    const hasEnoughSeats = !flight.available_seats || flight.available_seats >= criteria.totalPassengers;
    
    // For round-trip, we need to check both departure and return flights
    if (criteria.tripType === "round-trip") {
      // Check if this is a departure flight (origin to destination)
      const isDepartureFlight = flight.origin === criteria.originFilter && flight.destination === criteria.destinationFilter;
      // Check if this is a return flight (destination to origin)
      const isReturnFlight = flight.origin === criteria.destinationFilter && flight.destination === criteria.originFilter;
      
      const departureDateMatch = !criteria.departureDateFilter || flightDateString === criteria.departureDateFilter;
      const returnDateMatch = !criteria.returnDateFilter || flightDateString === criteria.returnDateFilter;
      
      return (
        (criteria.originFilter && criteria.destinationFilter) && // Both origin and destination must be selected
        (isDepartureFlight || isReturnFlight) && // Must be either departure or return flight
        ((isDepartureFlight && departureDateMatch) || (isReturnFlight && returnDateMatch)) && // Date must match
        (!criteria.cabinClassFilter || flight.cabin_class === criteria.cabinClassFilter) &&
        hasEnoughSeats // Check available seats
      );
    } else {
      // One-way flight filtering
      return (
        (!criteria.originFilter || flight.origin === criteria.originFilter) &&
        (!criteria.destinationFilter || flight.destination === criteria.destinationFilter) &&
        (!criteria.departureDateFilter || flightDateString === criteria.departureDateFilter) &&
        (!criteria.cabinClassFilter || flight.cabin_class === criteria.cabinClassFilter) &&
        hasEnoughSeats // Check available seats
      );
    }
  });
};

// Listen for messages from the main thread
self.addEventListener('message', (event) => {
  const { type, flights, criteria } = event.data;
  
  if (type === 'FILTER_FLIGHTS') {
    const filteredFlights = filterFlights(flights, criteria);
    
    const response = {
      type: 'FILTERED_FLIGHTS',
      filteredFlights
    };
    
    self.postMessage(response);
  }
}); 