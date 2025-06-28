// IndexedDB service for offline data persistence
export interface Flight {
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

export interface Passenger {
  name: string;
  age: string;
  gender: string;
}

export interface Booking {
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
  booking_date: string;
}

export interface UserData {
  id: string;
  email: string;
  name?: string;
  last_sync: string;
}

export interface SearchResult {
  id: string;
  query: string;
  results: Flight[];
  timestamp: string;
  expires_at: string;
}

class IndexedDBService {
  private dbName = 'FlyRightDB';
  private version = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB opened successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        if (!db.objectStoreNames.contains('flights')) {
          const flightStore = db.createObjectStore('flights', { keyPath: 'id' });
          flightStore.createIndex('origin', 'origin', { unique: false });
          flightStore.createIndex('destination', 'destination', { unique: false });
          flightStore.createIndex('departure_time', 'departure_time', { unique: false });
        }

        if (!db.objectStoreNames.contains('bookings')) {
          const bookingStore = db.createObjectStore('bookings', { keyPath: 'id' });
          bookingStore.createIndex('user_id', 'user_id', { unique: false });
          bookingStore.createIndex('flight_id', 'flight_id', { unique: false });
          bookingStore.createIndex('status', 'status', { unique: false });
        }

        if (!db.objectStoreNames.contains('users')) {
          const userStore = db.createObjectStore('users', { keyPath: 'id' });
          userStore.createIndex('email', 'email', { unique: true });
        }

        if (!db.objectStoreNames.contains('searchResults')) {
          const searchStore = db.createObjectStore('searchResults', { keyPath: 'id' });
          searchStore.createIndex('query', 'query', { unique: false });
          searchStore.createIndex('expires_at', 'expires_at', { unique: false });
        }

        console.log('IndexedDB schema created/updated');
      };
    });
  }

  // Flight operations
  async storeFlights(flights: Flight[]): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['flights'], 'readwrite');
      const store = transaction.objectStore('flights');

      flights.forEach(flight => {
        store.put(flight);
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getFlights(): Promise<Flight[]> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['flights'], 'readonly');
      const store = transaction.objectStore('flights');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getFlightById(id: string): Promise<Flight | null> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['flights'], 'readonly');
      const store = transaction.objectStore('flights');
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async searchFlights(origin?: string, destination?: string, date?: string): Promise<Flight[]> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['flights'], 'readonly');
      const store = transaction.objectStore('flights');
      const request = store.getAll();

      request.onsuccess = () => {
        let flights = request.result;
        
        // Apply filters
        if (origin) {
          flights = flights.filter(f => f.origin === origin);
        }
        if (destination) {
          flights = flights.filter(f => f.destination === destination);
        }
        if (date) {
          flights = flights.filter(f => {
            const flightDate = new Date(f.departure_time).toLocaleDateString('en-CA');
            return flightDate === date;
          });
        }
        
        resolve(flights);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Booking operations
  async storeBookings(bookings: Booking[]): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['bookings'], 'readwrite');
      const store = transaction.objectStore('bookings');

      bookings.forEach(booking => {
        store.put(booking);
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getBookingsByUserId(userId: string): Promise<Booking[]> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['bookings'], 'readonly');
      const store = transaction.objectStore('bookings');
      const index = store.index('user_id');
      const request = index.getAll(userId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getBookingById(id: string): Promise<Booking | null> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['bookings'], 'readonly');
      const store = transaction.objectStore('bookings');
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async updateBooking(booking: Booking): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['bookings'], 'readwrite');
      const store = transaction.objectStore('bookings');
      const request = store.put(booking);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // User operations
  async storeUser(user: UserData): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['users'], 'readwrite');
      const store = transaction.objectStore('users');
      const request = store.put(user);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getUserById(id: string): Promise<UserData | null> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['users'], 'readonly');
      const store = transaction.objectStore('users');
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  // Search results operations
  async storeSearchResult(searchResult: SearchResult): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['searchResults'], 'readwrite');
      const store = transaction.objectStore('searchResults');
      const request = store.put(searchResult);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getSearchResult(query: string): Promise<SearchResult | null> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['searchResults'], 'readonly');
      const store = transaction.objectStore('searchResults');
      const index = store.index('query');
      const request = index.get(query);

      request.onsuccess = () => {
        const result = request.result;
        if (result && new Date(result.expires_at) > new Date()) {
          resolve(result);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Cleanup operations
  async clearExpiredSearchResults(): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['searchResults'], 'readwrite');
      const store = transaction.objectStore('searchResults');
      const index = store.index('expires_at');
      const request = index.openCursor(IDBKeyRange.upperBound(new Date().toISOString()));

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async clearAllData(): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['flights', 'bookings', 'users', 'searchResults'], 'readwrite');
      
      transaction.objectStore('flights').clear();
      transaction.objectStore('bookings').clear();
      transaction.objectStore('users').clear();
      transaction.objectStore('searchResults').clear();

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // Utility methods
  async isOnline(): Promise<boolean> {
    return navigator.onLine;
  }

  async getDatabaseSize(): Promise<number> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['flights', 'bookings', 'users', 'searchResults'], 'readonly');
      let totalSize = 0;

      const stores = ['flights', 'bookings', 'users', 'searchResults'];
      let completedStores = 0;

      stores.forEach(storeName => {
        const store = transaction.objectStore(storeName);
        const request = store.getAll();

        request.onsuccess = () => {
          totalSize += JSON.stringify(request.result).length;
          completedStores++;
          
          if (completedStores === stores.length) {
            resolve(totalSize);
          }
        };

        request.onerror = () => reject(request.error);
      });
    });
  }

  async updateFlightSeats(flightId: string, newAvailableSeats: number): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['flights'], 'readwrite');
      const store = transaction.objectStore('flights');
      
      // First get the current flight data
      const getRequest = store.get(flightId);
      
      getRequest.onsuccess = () => {
        const flight = getRequest.result;
        if (flight) {
          // Update the available seats
          flight.available_seats = newAvailableSeats;
          
          // Put the updated flight back
          const putRequest = store.put(flight);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          reject(new Error('Flight not found'));
        }
      };
      
      getRequest.onerror = () => reject(getRequest.error);
    });
  }
}

// Create singleton instance
export const indexedDBService = new IndexedDBService();

// Initialize IndexedDB when the module is loaded
if (typeof window !== 'undefined') {
  indexedDBService.init().catch(console.error);
} 