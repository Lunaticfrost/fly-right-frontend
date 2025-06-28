import { renderHook, act, waitFor } from '@testing-library/react'
import { useOfflineData } from '../useOfflineData'
import { supabase } from '@/lib/supabase'
import { indexedDBService } from '@/lib/indexedDB'

// Mock the modules
jest.mock('@/lib/supabase')
jest.mock('@/lib/indexedDB')

const mockSupabase = supabase as jest.Mocked<typeof supabase>
const mockIndexedDBService = indexedDBService as jest.Mocked<typeof indexedDBService>

describe('useOfflineData Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
    })

    // Mock window event listeners
    const mockAddEventListener = jest.fn()
    const mockRemoveEventListener = jest.fn()
    Object.defineProperty(window, 'addEventListener', {
      value: mockAddEventListener,
      writable: true,
    })
    Object.defineProperty(window, 'removeEventListener', {
      value: mockRemoveEventListener,
      writable: true,
    })
  })

  describe('Initial State', () => {
    it('initializes with correct default values', () => {
      const { result } = renderHook(() => useOfflineData())

      expect(result.current.isOnline).toBe(true)
      expect(result.current.isSyncing).toBe(false)
      expect(result.current.lastSyncTime).toBe(null)
    })

    it('sets up event listeners on mount', () => {
      renderHook(() => useOfflineData())

      expect(window.addEventListener).toHaveBeenCalledWith('online', expect.any(Function))
      expect(window.addEventListener).toHaveBeenCalledWith('offline', expect.any(Function))
    })

    it('cleans up event listeners on unmount', () => {
      const { unmount } = renderHook(() => useOfflineData())

      unmount()

      expect(window.removeEventListener).toHaveBeenCalledWith('online', expect.any(Function))
      expect(window.removeEventListener).toHaveBeenCalledWith('offline', expect.any(Function))
    })
  })

  describe('Online/Offline State Management', () => {
    it('updates isOnline when navigator.onLine changes', () => {
      const { result } = renderHook(() => useOfflineData())

      expect(result.current.isOnline).toBe(true)

      act(() => {
        Object.defineProperty(navigator, 'onLine', {
          value: false,
          writable: true,
        })
        window.dispatchEvent(new Event('offline'))
      })

      expect(result.current.isOnline).toBe(false)
    })

    it('triggers sync when coming back online', async () => {
      const { result } = renderHook(() => useOfflineData())

      // Mock the sync function
      const mockSyncData = jest.fn()
      result.current.syncData = mockSyncData

      act(() => {
        Object.defineProperty(navigator, 'onLine', {
          value: false,
          writable: true,
        })
        window.dispatchEvent(new Event('offline'))
      })

      act(() => {
        Object.defineProperty(navigator, 'onLine', {
          value: true,
          writable: true,
        })
        window.dispatchEvent(new Event('online'))
      })

      await waitFor(() => {
        expect(result.current.isOnline).toBe(true)
      })
    })
  })

  describe('Data Syncing', () => {
    it('syncs flights data successfully', async () => {
      const mockFlights = [
        {
          id: '1',
          flight_number: 'FL001',
          airline: 'Test Airline',
          origin: 'NYC',
          destination: 'LAX',
          departure_time: '2024-01-01T10:00:00Z',
          arrival_time: '2024-01-01T13:00:00Z',
          price: 299,
          cabin_class: 'Economy',
        },
      ]

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          then: jest.fn().mockResolvedValue({ data: mockFlights, error: null }),
        }),
      } as any)

      const { result } = renderHook(() => useOfflineData())

      await act(async () => {
        await result.current.syncFlights()
      })

      expect(mockSupabase.from).toHaveBeenCalledWith('flights')
      expect(mockIndexedDBService.storeFlights).toHaveBeenCalledWith(mockFlights)
    })

    it('handles flight sync errors gracefully', async () => {
      const mockError = { message: 'Sync failed' }

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          then: jest.fn().mockResolvedValue({ data: null, error: mockError }),
        }),
      } as any)

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const { result } = renderHook(() => useOfflineData())

      await act(async () => {
        await result.current.syncFlights()
      })

      expect(consoleSpy).toHaveBeenCalledWith('Error fetching flights:', mockError)
      consoleSpy.mockRestore()
    })

    it('syncs user bookings successfully', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      const mockBookings = [
        {
          id: 'booking-1',
          user_id: 'user-123',
          flight_id: 'flight-1',
          passengers: [],
          cabin_class: 'Economy',
          total_price: 299,
          trip_type: 'one-way',
          status: 'confirmed',
          payment_method: 'credit_card',
          payment_status: 'paid',
          transaction_id: 'tx-123',
          paid_at: '2024-01-01T10:00:00Z',
          booking_date: '2024-01-01T09:00:00Z',
        },
      ]

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: mockBookings, error: null }),
        }),
      } as any)

      const { result } = renderHook(() => useOfflineData())

      await act(async () => {
        await result.current.syncUserBookings()
      })

      expect(mockSupabase.auth.getUser).toHaveBeenCalled()
      expect(mockSupabase.from).toHaveBeenCalledWith('bookings')
      expect(mockIndexedDBService.storeBookings).toHaveBeenCalledWith(mockBookings)
    })

    it('handles booking sync when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const { result } = renderHook(() => useOfflineData())

      await act(async () => {
        await result.current.syncUserBookings()
      })

      expect(mockSupabase.auth.getUser).toHaveBeenCalled()
      expect(mockSupabase.from).not.toHaveBeenCalled()
    })
  })

  describe('Flight Operations', () => {
    it('fetches flights from online source when available', async () => {
      const mockFlights = [
        {
          id: '1',
          flight_number: 'FL001',
          airline: 'Test Airline',
          origin: 'NYC',
          destination: 'LAX',
          departure_time: '2024-01-01T10:00:00Z',
          arrival_time: '2024-01-01T13:00:00Z',
          price: 299,
          cabin_class: 'Economy',
        },
      ]

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          then: jest.fn().mockResolvedValue({ data: mockFlights, error: null }),
        }),
      } as any)

      const { result } = renderHook(() => useOfflineData())

      const flights = await act(async () => {
        return await result.current.getFlights()
      })

      expect(flights).toEqual(mockFlights)
      expect(mockSupabase.from).toHaveBeenCalledWith('flights')
      expect(mockIndexedDBService.storeFlights).toHaveBeenCalledWith(mockFlights)
    })

    it('falls back to offline data when online fetch fails', async () => {
      const mockOfflineFlights = [
        {
          id: '1',
          flight_number: 'FL001',
          airline: 'Test Airline',
          origin: 'NYC',
          destination: 'LAX',
          departure_time: '2024-01-01T10:00:00Z',
          arrival_time: '2024-01-01T13:00:00Z',
          price: 299,
          cabin_class: 'Economy',
        },
      ]

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          then: jest.fn().mockResolvedValue({ data: null, error: { message: 'Network error' } }),
        }),
      } as any)

      mockIndexedDBService.getFlights.mockResolvedValue(mockOfflineFlights)

      const { result } = renderHook(() => useOfflineData())

      const flights = await act(async () => {
        return await result.current.getFlights()
      })

      expect(flights).toEqual(mockOfflineFlights)
      expect(mockIndexedDBService.getFlights).toHaveBeenCalled()
    })

    it('uses offline data when not online', async () => {
      const mockOfflineFlights = [
        {
          id: '1',
          flight_number: 'FL001',
          airline: 'Test Airline',
          origin: 'NYC',
          destination: 'LAX',
          departure_time: '2024-01-01T10:00:00Z',
          arrival_time: '2024-01-01T13:00:00Z',
          price: 299,
          cabin_class: 'Economy',
        },
      ]

      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
      })

      mockIndexedDBService.getFlights.mockResolvedValue(mockOfflineFlights)

      const { result } = renderHook(() => useOfflineData())

      const flights = await act(async () => {
        return await result.current.getFlights()
      })

      expect(flights).toEqual(mockOfflineFlights)
      expect(mockIndexedDBService.getFlights).toHaveBeenCalled()
      expect(mockSupabase.from).not.toHaveBeenCalled()
    })
  })

  describe('Booking Operations', () => {
    it('fetches user bookings from online source when available', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      const mockBookings = [
        {
          id: 'booking-1',
          user_id: 'user-123',
          flight_id: 'flight-1',
          passengers: [],
          cabin_class: 'Economy',
          total_price: 299,
          trip_type: 'one-way',
          status: 'confirmed',
          payment_method: 'credit_card',
          payment_status: 'paid',
          transaction_id: 'tx-123',
          paid_at: '2024-01-01T10:00:00Z',
          booking_date: '2024-01-01T09:00:00Z',
        },
      ]

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: mockBookings, error: null }),
        }),
      } as any)

      const { result } = renderHook(() => useOfflineData())

      const bookings = await act(async () => {
        return await result.current.getUserBookings()
      })

      expect(bookings).toEqual(mockBookings)
      expect(mockSupabase.auth.getUser).toHaveBeenCalled()
      expect(mockSupabase.from).toHaveBeenCalledWith('bookings')
      expect(mockIndexedDBService.storeBookings).toHaveBeenCalledWith(mockBookings)
    })

    it('returns empty array when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const { result } = renderHook(() => useOfflineData())

      const bookings = await act(async () => {
        return await result.current.getUserBookings()
      })

      expect(bookings).toEqual([])
    })
  })

  describe('Search Operations', () => {
    it('searches flights with caching', async () => {
      const mockFlights = [
        {
          id: '1',
          flight_number: 'FL001',
          airline: 'Test Airline',
          origin: 'NYC',
          destination: 'LAX',
          departure_time: '2024-01-01T10:00:00Z',
          arrival_time: '2024-01-01T13:00:00Z',
          price: 299,
          cabin_class: 'Economy',
        },
      ]

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          then: jest.fn().mockResolvedValue({ data: mockFlights, error: null }),
        }),
      } as any)

      const { result } = renderHook(() => useOfflineData())

      const searchResults = await act(async () => {
        return await result.current.searchFlights('NYC', 'LAX', '2024-01-01')
      })

      expect(searchResults).toEqual(mockFlights)
      expect(mockSupabase.from).toHaveBeenCalledWith('flights')
    })
  })
}) 