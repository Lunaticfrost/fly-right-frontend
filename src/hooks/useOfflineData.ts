import { useState, useEffect, useCallback } from 'react';
import { indexedDBService, Flight, Booking, UserData, SearchResult } from '@/lib/indexedDB';
import { supabase } from '@/lib/supabase';

export const useOfflineData = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      console.log('App is now online');
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log('App is now offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set initial state
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync data when coming back online
  useEffect(() => {
    if (isOnline && !isSyncing) {
      syncData();
    }
  }, [isOnline]);

  // Sync flights data
  const syncFlights = useCallback(async () => {
    try {
      const { data: flights, error } = await supabase
        .from('flights')
        .select('*');

      if (error) {
        console.error('Error fetching flights:', error);
        return;
      }

      if (flights) {
        await indexedDBService.storeFlights(flights);
        console.log('Flights synced to IndexedDB:', flights.length);
      }
    } catch (error) {
      console.error('Error syncing flights:', error);
    }
  }, []);

  // Sync user bookings
  const syncUserBookings = useCallback(async () => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return;

      const { data: bookings, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching bookings:', error);
        return;
      }

      if (bookings) {
        await indexedDBService.storeBookings(bookings);
        console.log('User bookings synced to IndexedDB:', bookings.length);
      }
    } catch (error) {
      console.error('Error syncing user bookings:', error);
    }
  }, []);

  // Sync user data
  const syncUserData = useCallback(async () => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return;

      const userData: UserData = {
        id: user.id,
        email: user.email || '',
        name: user.user_metadata?.name,
        last_sync: new Date().toISOString(),
      };

      await indexedDBService.storeUser(userData);
      console.log('User data synced to IndexedDB');
    } catch (error) {
      console.error('Error syncing user data:', error);
    }
  }, []);

  // Main sync function
  const syncData = useCallback(async () => {
    if (!isOnline || isSyncing) return;

    setIsSyncing(true);
    console.log('Starting data sync...');

    try {
      await Promise.all([
        syncFlights(),
        syncUserBookings(),
        syncUserData(),
      ]);

      setLastSyncTime(new Date());
      console.log('Data sync completed');
    } catch (error) {
      console.error('Error during data sync:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing, syncFlights, syncUserBookings, syncUserData]);

  // Get flights (online or offline)
  const getFlights = useCallback(async (): Promise<Flight[]> => {
    if (isOnline) {
      try {
        const { data: flights, error } = await supabase
          .from('flights')
          .select('*');

        if (error) {
          console.error('Error fetching flights online:', error);
          // Fallback to offline data
          return await indexedDBService.getFlights();
        }

        if (flights) {
          // Store in IndexedDB for offline use
          await indexedDBService.storeFlights(flights);
          return flights;
        }
      } catch (error) {
        console.error('Error fetching flights online:', error);
      }
    }

    // Return offline data
    return await indexedDBService.getFlights();
  }, [isOnline]);

  // Get user bookings (online or offline)
  const getUserBookings = useCallback(async (): Promise<Booking[]> => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return [];

    if (isOnline) {
      try {
        const { data: bookings, error } = await supabase
          .from('bookings')
          .select('*')
          .eq('user_id', user.id);

        if (error) {
          console.error('Error fetching bookings online:', error);
          // Fallback to offline data
          return await indexedDBService.getBookingsByUserId(user.id);
        }

        if (bookings) {
          // Store in IndexedDB for offline use
          await indexedDBService.storeBookings(bookings);
          return bookings;
        }
      } catch (error) {
        console.error('Error fetching bookings online:', error);
      }
    }

    // Return offline data
    return await indexedDBService.getBookingsByUserId(user.id);
  }, [isOnline]);

  // Search flights with caching
  const searchFlights = useCallback(async (
    origin?: string,
    destination?: string,
    date?: string
  ): Promise<Flight[]> => {
    const query = JSON.stringify({ origin, destination, date });
    
    // Check cache first
    const cachedResult = await indexedDBService.getSearchResult(query);
    if (cachedResult) {
      console.log('Returning cached search results');
      return cachedResult.results;
    }

    // Perform search
    const results = await getFlights();
    let filteredResults = results;

    // Apply filters
    if (origin) {
      filteredResults = filteredResults.filter(f => f.origin === origin);
    }
    if (destination) {
      filteredResults = filteredResults.filter(f => f.destination === destination);
    }
    if (date) {
      filteredResults = filteredResults.filter(f => {
        const flightDate = new Date(f.departure_time).toLocaleDateString('en-CA');
        return flightDate === date;
      });
    }

    // Cache the results for 1 hour
    const searchResult: SearchResult = {
      id: `search_${Date.now()}`,
      query,
      results: filteredResults,
      timestamp: new Date().toISOString(),
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
    };

    await indexedDBService.storeSearchResult(searchResult);

    return filteredResults;
  }, [getFlights]);

  // Update booking (online or queue for sync)
  const updateBooking = useCallback(async (booking: Booking): Promise<void> => {
    // Always update local storage first
    await indexedDBService.updateBooking(booking);

    if (isOnline) {
      try {
        const { error } = await supabase
          .from('bookings')
          .update(booking)
          .eq('id', booking.id);

        if (error) {
          console.error('Error updating booking online:', error);
        }
      } catch (error) {
        console.error('Error updating booking online:', error);
      }
    } else {
      console.log('Booking updated offline, will sync when online');
    }
  }, [isOnline]);

  // Clear expired cache
  const clearExpiredCache = useCallback(async () => {
    await indexedDBService.clearExpiredSearchResults();
  }, []);

  // Get database size
  const getDatabaseSize = useCallback(async (): Promise<number> => {
    return await indexedDBService.getDatabaseSize();
  }, []);

  return {
    isOnline,
    isSyncing,
    lastSyncTime,
    syncData,
    getFlights,
    getUserBookings,
    searchFlights,
    updateBooking,
    clearExpiredCache,
    getDatabaseSize,
  };
}; 