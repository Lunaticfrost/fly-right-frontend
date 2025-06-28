import { useEffect, useRef, useCallback } from 'react';
import { Flight } from '@/lib/indexedDB';

interface PassengerCount {
  adults: number;
  children: number;
  infants: number;
}

interface FilterCriteria {
  originFilter: string;
  destinationFilter: string;
  departureDateFilter: string;
  returnDateFilter: string;
  tripType: "one-way" | "round-trip";
  cabinClassFilter: string;
  totalPassengers: number;
}

interface WorkerMessage {
  type: 'FILTER_FLIGHTS';
  flights: Flight[];
  criteria: FilterCriteria;
}

interface WorkerResponse {
  type: 'FILTERED_FLIGHTS';
  filteredFlights: Flight[];
}

// Fallback synchronous filtering function
const filterFlightsSync = (flights: Flight[], criteria: FilterCriteria): Flight[] => {
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

export const useFlightFilterWorker = () => {
  const workerRef = useRef<Worker | null>(null);

  // Initialize worker
  useEffect(() => {
    if (typeof window !== 'undefined' && !workerRef.current) {
      try {
        // Create worker from the JavaScript worker file
        workerRef.current = new Worker(
          new URL('../workers/flightFilterWorker.js', import.meta.url)
        );
      } catch (error) {
        console.error('Failed to create flight filter worker:', error);
      }
    }

    // Cleanup worker on unmount
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  // Filter flights using web worker
  const filterFlights = useCallback((
    flights: Flight[],
    criteria: {
      originFilter: string;
      destinationFilter: string;
      departureDateFilter: string;
      returnDateFilter: string;
      tripType: "one-way" | "round-trip";
      cabinClassFilter: string;
      passengerCount: PassengerCount;
    }
  ): Promise<Flight[]> => {
    return new Promise((resolve) => {
      if (!workerRef.current) {
        // Fallback to synchronous filtering if worker is not available
        console.warn('Worker not available, falling back to synchronous filtering');
        const totalPassengers = criteria.passengerCount.adults + criteria.passengerCount.children + criteria.passengerCount.infants;
        const workerCriteria: FilterCriteria = {
          ...criteria,
          totalPassengers
        };
        const filtered = filterFlightsSync(flights, workerCriteria);
        resolve(filtered);
        return;
      }

      const totalPassengers = criteria.passengerCount.adults + criteria.passengerCount.children + criteria.passengerCount.infants;
      
      const workerCriteria: FilterCriteria = {
        ...criteria,
        totalPassengers
      };

      const message: WorkerMessage = {
        type: 'FILTER_FLIGHTS',
        flights,
        criteria: workerCriteria
      };

      // Set up message handler
      const handleMessage = (event: MessageEvent<WorkerResponse>) => {
        if (event.data.type === 'FILTERED_FLIGHTS') {
          workerRef.current?.removeEventListener('message', handleMessage);
          resolve(event.data.filteredFlights);
        }
      };

      // Set up error handler
      const handleError = (error: ErrorEvent) => {
        workerRef.current?.removeEventListener('error', handleError);
        console.error('Worker error:', error);
        // Fallback to synchronous filtering on error
        const totalPassengers = criteria.passengerCount.adults + criteria.passengerCount.children + criteria.passengerCount.infants;
        const workerCriteria: FilterCriteria = {
          ...criteria,
          totalPassengers
        };
        const filtered = filterFlightsSync(flights, workerCriteria);
        resolve(filtered);
      };

      workerRef.current.addEventListener('message', handleMessage);
      workerRef.current.addEventListener('error', handleError);

      // Send message to worker
      workerRef.current.postMessage(message);
    });
  }, []);

  return { filterFlights };
}; 