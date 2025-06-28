import { indexedDBService, Flight, Booking, UserData, SearchResult } from '../indexedDB'

// Mock IndexedDB
const mockIndexedDB = {
  open: jest.fn(),
}

Object.defineProperty(window, 'indexedDB', {
  value: mockIndexedDB,
  writable: true,
})

describe('IndexedDB Service', () => {
  let mockDB: any
  let mockTransaction: any
  let mockStore: any

  beforeEach(() => {
    jest.clearAllMocks()

    // Reset the service instance
    ;(indexedDBService as any).db = null

    // Setup mock database
    mockStore = {
      put: jest.fn(),
      get: jest.fn(),
      getAll: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
    }

    mockTransaction = {
      objectStore: jest.fn().mockReturnValue(mockStore),
      oncomplete: jest.fn(),
      onerror: jest.fn(),
    }

    mockDB = {
      transaction: jest.fn().mockReturnValue(mockTransaction),
      objectStoreNames: {
        contains: jest.fn().mockReturnValue(true),
      },
    }

    // Mock IndexedDB open request
    const mockRequest = {
      onerror: jest.fn(),
      onsuccess: jest.fn(),
      onupgradeneeded: jest.fn(),
      result: mockDB,
    }

    mockIndexedDB.open.mockReturnValue(mockRequest)
  })

  describe('Database Initialization', () => {
    it('initializes database successfully', async () => {
      const mockRequest = mockIndexedDB.open()
      mockRequest.onsuccess()

      await indexedDBService.init()

      expect(mockIndexedDB.open).toHaveBeenCalledWith('FlyRightDB', 1)
    })

    it('handles database initialization errors', async () => {
      const mockRequest = mockIndexedDB.open()
      const mockError = new Error('Database error')
      mockRequest.onerror()

      await expect(indexedDBService.init()).rejects.toThrow()
    })

    it('creates object stores on upgrade', async () => {
      const mockRequest = mockIndexedDB.open()
      const mockEvent = {
        target: { result: mockDB },
      }

      // Mock createObjectStore
      const mockCreateObjectStore = jest.fn().mockReturnValue({
        createIndex: jest.fn(),
      })
      mockDB.createObjectStore = mockCreateObjectStore

      mockRequest.onupgradeneeded(mockEvent)

      expect(mockCreateObjectStore).toHaveBeenCalledWith('flights', { keyPath: 'id' })
      expect(mockCreateObjectStore).toHaveBeenCalledWith('bookings', { keyPath: 'id' })
      expect(mockCreateObjectStore).toHaveBeenCalledWith('users', { keyPath: 'id' })
      expect(mockCreateObjectStore).toHaveBeenCalledWith('searchResults', { keyPath: 'id' })
    })
  })

  describe('Flight Operations', () => {
    const mockFlight: Flight = {
      id: 'flight-1',
      flight_number: 'FL001',
      airline: 'Test Airline',
      origin: 'NYC',
      destination: 'LAX',
      departure_time: '2024-01-01T10:00:00Z',
      arrival_time: '2024-01-01T13:00:00Z',
      price: 299,
      cabin_class: 'Economy',
    }

    beforeEach(async () => {
      const mockRequest = mockIndexedDB.open()
      mockRequest.onsuccess()
      await indexedDBService.init()
    })

    it('stores flights successfully', async () => {
      const flights = [mockFlight]

      await indexedDBService.storeFlights(flights)

      expect(mockDB.transaction).toHaveBeenCalledWith(['flights'], 'readwrite')
      expect(mockTransaction.objectStore).toHaveBeenCalledWith('flights')
      expect(mockStore.put).toHaveBeenCalledWith(mockFlight)
    })

    it('retrieves all flights successfully', async () => {
      const mockFlights = [mockFlight]
      mockStore.getAll.mockReturnValue({
        onsuccess: jest.fn().mockImplementation(function(this: any) {
          this.result = mockFlights
        }),
        onerror: jest.fn(),
      })

      const flights = await indexedDBService.getFlights()

      expect(flights).toEqual(mockFlights)
      expect(mockDB.transaction).toHaveBeenCalledWith(['flights'], 'readonly')
      expect(mockTransaction.objectStore).toHaveBeenCalledWith('flights')
    })

    it('retrieves flight by ID successfully', async () => {
      mockStore.get.mockReturnValue({
        onsuccess: jest.fn().mockImplementation(function(this: any) {
          this.result = mockFlight
        }),
        onerror: jest.fn(),
      })

      const flight = await indexedDBService.getFlightById('flight-1')

      expect(flight).toEqual(mockFlight)
      expect(mockStore.get).toHaveBeenCalledWith('flight-1')
    })

    it('returns null when flight not found', async () => {
      mockStore.get.mockReturnValue({
        onsuccess: jest.fn().mockImplementation(function(this: any) {
          this.result = null
        }),
        onerror: jest.fn(),
      })

      const flight = await indexedDBService.getFlightById('non-existent')

      expect(flight).toBeNull()
    })

    it('searches flights with filters', async () => {
      const mockFlights = [
        mockFlight,
        {
          ...mockFlight,
          id: 'flight-2',
          origin: 'LAX',
          destination: 'NYC',
        },
      ]

      mockStore.getAll.mockReturnValue({
        onsuccess: jest.fn().mockImplementation(function(this: any) {
          this.result = mockFlights
        }),
        onerror: jest.fn(),
      })

      const flights = await indexedDBService.searchFlights('NYC', 'LAX', '2024-01-01')

      expect(flights).toHaveLength(1)
      expect(flights[0].origin).toBe('NYC')
      expect(flights[0].destination).toBe('LAX')
    })
  })

  describe('Booking Operations', () => {
    const mockBooking: Booking = {
      id: 'booking-1',
      user_id: 'user-123',
      flight_id: 'flight-1',
      passengers: [
        {
          name: 'John Doe',
          age: '30',
          gender: 'male',
        },
      ],
      cabin_class: 'Economy',
      total_price: 299,
      trip_type: 'one-way',
      status: 'confirmed',
      payment_method: 'credit_card',
      payment_status: 'paid',
      transaction_id: 'tx-123',
      paid_at: '2024-01-01T10:00:00Z',
      booking_date: '2024-01-01T09:00:00Z',
    }

    beforeEach(async () => {
      const mockRequest = mockIndexedDB.open()
      mockRequest.onsuccess()
      await indexedDBService.init()
    })

    it('stores bookings successfully', async () => {
      const bookings = [mockBooking]

      await indexedDBService.storeBookings(bookings)

      expect(mockDB.transaction).toHaveBeenCalledWith(['bookings'], 'readwrite')
      expect(mockTransaction.objectStore).toHaveBeenCalledWith('bookings')
      expect(mockStore.put).toHaveBeenCalledWith(mockBooking)
    })

    it('retrieves bookings by user ID successfully', async () => {
      const mockBookings = [mockBooking]
      mockStore.getAll.mockReturnValue({
        onsuccess: jest.fn().mockImplementation(function(this: any) {
          this.result = mockBookings
        }),
        onerror: jest.fn(),
      })

      const bookings = await indexedDBService.getBookingsByUserId('user-123')

      expect(bookings).toEqual(mockBookings)
      expect(mockDB.transaction).toHaveBeenCalledWith(['bookings'], 'readonly')
      expect(mockTransaction.objectStore).toHaveBeenCalledWith('bookings')
    })

    it('retrieves booking by ID successfully', async () => {
      mockStore.get.mockReturnValue({
        onsuccess: jest.fn().mockImplementation(function(this: any) {
          this.result = mockBooking
        }),
        onerror: jest.fn(),
      })

      const booking = await indexedDBService.getBookingById('booking-1')

      expect(booking).toEqual(mockBooking)
      expect(mockStore.get).toHaveBeenCalledWith('booking-1')
    })

    it('updates booking successfully', async () => {
      const updatedBooking = { ...mockBooking, status: 'cancelled' }

      await indexedDBService.updateBooking(updatedBooking)

      expect(mockDB.transaction).toHaveBeenCalledWith(['bookings'], 'readwrite')
      expect(mockTransaction.objectStore).toHaveBeenCalledWith('bookings')
      expect(mockStore.put).toHaveBeenCalledWith(updatedBooking)
    })
  })

  describe('User Operations', () => {
    const mockUser: UserData = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      last_sync: '2024-01-01T10:00:00Z',
    }

    beforeEach(async () => {
      const mockRequest = mockIndexedDB.open()
      mockRequest.onsuccess()
      await indexedDBService.init()
    })

    it('stores user data successfully', async () => {
      await indexedDBService.storeUser(mockUser)

      expect(mockDB.transaction).toHaveBeenCalledWith(['users'], 'readwrite')
      expect(mockTransaction.objectStore).toHaveBeenCalledWith('users')
      expect(mockStore.put).toHaveBeenCalledWith(mockUser)
    })

    it('retrieves user by ID successfully', async () => {
      mockStore.get.mockReturnValue({
        onsuccess: jest.fn().mockImplementation(function(this: any) {
          this.result = mockUser
        }),
        onerror: jest.fn(),
      })

      const user = await indexedDBService.getUserById('user-123')

      expect(user).toEqual(mockUser)
      expect(mockStore.get).toHaveBeenCalledWith('user-123')
    })
  })

  describe('Search Result Operations', () => {
    const mockSearchResult: SearchResult = {
      id: 'search-1',
      query: JSON.stringify({ origin: 'NYC', destination: 'LAX' }),
      results: [],
      timestamp: '2024-01-01T10:00:00Z',
      expires_at: '2024-01-02T10:00:00Z',
    }

    beforeEach(async () => {
      const mockRequest = mockIndexedDB.open()
      mockRequest.onsuccess()
      await indexedDBService.init()
    })

    it('stores search results successfully', async () => {
      await indexedDBService.storeSearchResult(mockSearchResult)

      expect(mockDB.transaction).toHaveBeenCalledWith(['searchResults'], 'readwrite')
      expect(mockTransaction.objectStore).toHaveBeenCalledWith('searchResults')
      expect(mockStore.put).toHaveBeenCalledWith(mockSearchResult)
    })

    it('retrieves search result by query successfully', async () => {
      mockStore.get.mockReturnValue({
        onsuccess: jest.fn().mockImplementation(function(this: any) {
          this.result = mockSearchResult
        }),
        onerror: jest.fn(),
      })

      const result = await indexedDBService.getSearchResult('{"origin":"NYC","destination":"LAX"}')

      expect(result).toEqual(mockSearchResult)
      expect(mockStore.get).toHaveBeenCalledWith('search-1')
    })

    it('returns null when search result not found', async () => {
      mockStore.get.mockReturnValue({
        onsuccess: jest.fn().mockImplementation(function(this: any) {
          this.result = null
        }),
        onerror: jest.fn(),
      })

      const result = await indexedDBService.getSearchResult('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('Utility Operations', () => {
    beforeEach(async () => {
      const mockRequest = mockIndexedDB.open()
      mockRequest.onsuccess()
      await indexedDBService.init()
    })

    it('clears all data successfully', async () => {
      await indexedDBService.clearAllData()

      expect(mockDB.transaction).toHaveBeenCalledWith(['flights', 'bookings', 'users', 'searchResults'], 'readwrite')
      expect(mockStore.clear).toHaveBeenCalledTimes(4)
    })

    it('checks online status', async () => {
      const isOnline = await indexedDBService.isOnline()
      expect(isOnline).toBe(navigator.onLine)
    })

    it('calculates database size', async () => {
      // Mock the size calculation
      const mockSize = 1024 * 1024 // 1MB
      Object.defineProperty(mockDB, 'size', {
        value: mockSize,
        writable: true,
      })

      const size = await indexedDBService.getDatabaseSize()
      expect(size).toBe(mockSize)
    })

    it('updates flight seats successfully', async () => {
      await indexedDBService.updateFlightSeats('flight-1', 50)

      expect(mockDB.transaction).toHaveBeenCalledWith(['flights'], 'readwrite')
      expect(mockTransaction.objectStore).toHaveBeenCalledWith('flights')
      expect(mockStore.put).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('handles transaction errors', async () => {
      const mockRequest = mockIndexedDB.open()
      mockRequest.onsuccess()
      await indexedDBService.init()

      const mockError = new Error('Transaction failed')
      mockTransaction.onerror(mockError)

      await expect(indexedDBService.storeFlights([])).rejects.toThrow()
    })

    it('handles store operation errors', async () => {
      const mockRequest = mockIndexedDB.open()
      mockRequest.onsuccess()
      await indexedDBService.init()

      mockStore.getAll.mockReturnValue({
        onsuccess: jest.fn(),
        onerror: jest.fn().mockImplementation(function(this: any) {
          this.error = new Error('Store operation failed')
        }),
      })

      await expect(indexedDBService.getFlights()).rejects.toThrow()
    })
  })
}) 