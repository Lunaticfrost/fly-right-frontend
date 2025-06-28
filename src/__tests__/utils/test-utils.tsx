import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { useRouter } from 'next/navigation'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/'
  },
}))

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
      signOut: jest.fn().mockResolvedValue({
        error: null,
      }),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: [], error: null })),
        then: jest.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
      update: jest.fn(() => Promise.resolve({ data: null, error: null })),
      delete: jest.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  },
}))

// Mock IndexedDB
jest.mock('@/lib/indexedDB', () => ({
  indexedDBService: {
    init: jest.fn().mockResolvedValue(),
    storeFlights: jest.fn().mockResolvedValue(),
    getFlights: jest.fn().mockResolvedValue([]),
    getFlightById: jest.fn().mockResolvedValue(null),
    searchFlights: jest.fn().mockResolvedValue([]),
    storeBookings: jest.fn().mockResolvedValue(),
    getBookingsByUserId: jest.fn().mockResolvedValue([]),
    getBookingById: jest.fn().mockResolvedValue(null),
    updateBooking: jest.fn().mockResolvedValue(),
    storeUser: jest.fn().mockResolvedValue(),
    getUserById: jest.fn().mockResolvedValue(null),
    storeSearchResult: jest.fn().mockResolvedValue(),
    getSearchResult: jest.fn().mockResolvedValue(null),
    clearExpiredSearchResults: jest.fn().mockResolvedValue(),
    clearAllData: jest.fn().mockResolvedValue(),
    isOnline: jest.fn().mockResolvedValue(true),
    getDatabaseSize: jest.fn().mockResolvedValue(0),
    updateFlightSeats: jest.fn().mockResolvedValue(),
  },
}))

// Mock Web Workers
Object.defineProperty(window, 'Worker', {
  value: jest.fn(() => ({
    postMessage: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    terminate: jest.fn(),
  })),
  writable: true,
})

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  value: true,
  writable: true,
})

// Mock window events
Object.defineProperty(window, 'addEventListener', {
  value: jest.fn(),
  writable: true,
})

Object.defineProperty(window, 'removeEventListener', {
  value: jest.fn(),
  writable: true,
})

// Global test utilities
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

global.matchMedia = jest.fn().mockImplementation((query) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: jest.fn(),
  removeListener: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
}))

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  routerOptions?: {
    push?: jest.Mock
    replace?: jest.Mock
    prefetch?: jest.Mock
    back?: jest.Mock
    forward?: jest.Mock
    refresh?: jest.Mock
  }
}

const customRender = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
) => {
  const { routerOptions, ...renderOptions } = options

  // Mock router with custom options if provided
  if (routerOptions) {
    const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>
    mockUseRouter.mockReturnValue({
      push: routerOptions.push || jest.fn(),
      replace: routerOptions.replace || jest.fn(),
      prefetch: routerOptions.prefetch || jest.fn(),
      back: routerOptions.back || jest.fn(),
      forward: routerOptions.forward || jest.fn(),
      refresh: routerOptions.refresh || jest.fn(),
    })
  }

  return render(ui, renderOptions)
}

// Re-export everything
export * from '@testing-library/react'

// Override render method
export { customRender as render }

// Test data factories
export const createMockFlight = (overrides = {}) => ({
  id: 'flight-1',
  flight_number: 'FL001',
  airline: 'Test Airline',
  origin: 'New York',
  destination: 'Los Angeles',
  departure_time: '2024-01-15T10:00:00Z',
  arrival_time: '2024-01-15T13:00:00Z',
  price: 299,
  cabin_class: 'Economy',
  available_seats: 50,
  ...overrides,
})

export const createMockBooking = (overrides = {}) => ({
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
  ...overrides,
})

export const createMockUser = (overrides = {}) => ({
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  last_sync: '2024-01-01T10:00:00Z',
  ...overrides,
})

// Test helpers
export const waitForLoadingToFinish = async () => {
  // Wait for any loading states to finish
  await new Promise(resolve => setTimeout(resolve, 100))
}

export const mockOnlineStatus = (isOnline: boolean) => {
  Object.defineProperty(navigator, 'onLine', {
    value: isOnline,
    writable: true,
  })
}

export const mockIndexedDB = () => {
  const mockIndexedDB = {
    open: jest.fn(),
  }

  Object.defineProperty(window, 'indexedDB', {
    value: mockIndexedDB,
    writable: true,
  })

  return mockIndexedDB
}

export const mockSupabaseResponse = (data: any, error: any = null) => {
  const { supabase } = require('@/lib/supabase')
  
  supabase.from.mockReturnValue({
    select: jest.fn().mockReturnValue({
      then: jest.fn().mockResolvedValue({ data, error }),
    }),
  })
}

export const mockIndexedDBResponse = (data: any) => {
  const { indexedDBService } = require('@/lib/indexedDB')
  
  indexedDBService.getFlights.mockResolvedValue(data)
} 