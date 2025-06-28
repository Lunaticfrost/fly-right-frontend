import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import HomePage from '@/app/page'
import { supabase } from '@/lib/supabase'
import { indexedDBService } from '@/lib/indexedDB'

// Mock the modules
jest.mock('next/navigation')
jest.mock('@/lib/supabase')
jest.mock('@/lib/indexedDB')

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>
const mockSupabase = supabase as jest.Mocked<typeof supabase>
const mockIndexedDBService = indexedDBService as jest.Mocked<typeof indexedDBService>

describe('Flight Booking Flow Integration', () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }

  const mockFlights = [
    {
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
    },
    {
      id: 'flight-2',
      flight_number: 'FL002',
      airline: 'Another Airline',
      origin: 'New York',
      destination: 'Los Angeles',
      departure_time: '2024-01-15T14:00:00Z',
      arrival_time: '2024-01-15T17:00:00Z',
      price: 399,
      cabin_class: 'Business',
      available_seats: 20,
    },
  ]

  beforeEach(() => {
    mockUseRouter.mockReturnValue(mockRouter)
    jest.clearAllMocks()

    // Mock Supabase responses
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnValue({
        then: jest.fn().mockResolvedValue({ data: mockFlights, error: null }),
      }),
    } as any)

    // Mock IndexedDB responses
    mockIndexedDBService.getFlights.mockResolvedValue(mockFlights)
    mockIndexedDBService.storeFlights.mockResolvedValue()
  })

  describe('Flight Search Flow', () => {
    it('loads and displays flights on page load', async () => {
      render(<HomePage />)

      // Wait for flights to load
      await waitFor(() => {
        expect(screen.getByText('FL001')).toBeInTheDocument()
        expect(screen.getByText('FL002')).toBeInTheDocument()
        expect(screen.getByText('Test Airline')).toBeInTheDocument()
        expect(screen.getByText('Another Airline')).toBeInTheDocument()
      })
    })

    it('filters flights by origin and destination', async () => {
      render(<HomePage />)

      // Wait for flights to load
      await waitFor(() => {
        expect(screen.getByText('FL001')).toBeInTheDocument()
      })

      // Select origin
      const originSelect = screen.getByLabelText(/origin/i)
      fireEvent.change(originSelect, { target: { value: 'New York' } })

      // Select destination
      const destinationSelect = screen.getByLabelText(/destination/i)
      fireEvent.change(destinationSelect, { target: { value: 'Los Angeles' } })

      // Wait for filtering to complete
      await waitFor(() => {
        expect(screen.getByText('FL001')).toBeInTheDocument()
        expect(screen.getByText('FL002')).toBeInTheDocument()
      })
    })

    it('filters flights by date', async () => {
      render(<HomePage />)

      // Wait for flights to load
      await waitFor(() => {
        expect(screen.getByText('FL001')).toBeInTheDocument()
      })

      // Select departure date
      const dateInput = screen.getByLabelText(/departure date/i)
      fireEvent.change(dateInput, { target: { value: '2024-01-15' } })

      // Wait for filtering to complete
      await waitFor(() => {
        expect(screen.getByText('FL001')).toBeInTheDocument()
        expect(screen.getByText('FL002')).toBeInTheDocument()
      })
    })

    it('filters flights by cabin class', async () => {
      render(<HomePage />)

      // Wait for flights to load
      await waitFor(() => {
        expect(screen.getByText('FL001')).toBeInTheDocument()
      })

      // Select cabin class
      const cabinClassSelect = screen.getByLabelText(/cabin class/i)
      fireEvent.change(cabinClassSelect, { target: { value: 'Business' } })

      // Wait for filtering to complete
      await waitFor(() => {
        expect(screen.getByText('FL002')).toBeInTheDocument() // Business class flight
        expect(screen.queryByText('FL001')).not.toBeInTheDocument() // Economy class flight should be filtered out
      })
    })
  })

  describe('Passenger Management', () => {
    it('allows adding and removing passengers', async () => {
      render(<HomePage />)

      // Wait for flights to load
      await waitFor(() => {
        expect(screen.getByText('FL001')).toBeInTheDocument()
      })

      // Find passenger count controls
      const adultsIncrement = screen.getByLabelText(/increment adults/i)
      const childrenIncrement = screen.getByLabelText(/increment children/i)

      // Add passengers
      fireEvent.click(adultsIncrement)
      fireEvent.click(childrenIncrement)

      // Verify passenger count updates
      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument() // Adults
        expect(screen.getByText('1')).toBeInTheDocument() // Children
      })
    })

    it('validates passenger count limits', async () => {
      render(<HomePage />)

      // Wait for flights to load
      await waitFor(() => {
        expect(screen.getByText('FL001')).toBeInTheDocument()
      })

      // Try to add too many passengers
      const adultsIncrement = screen.getByLabelText(/increment adults/i)
      
      // Add 9 more adults (total 10, which exceeds limit)
      for (let i = 0; i < 9; i++) {
        fireEvent.click(adultsIncrement)
      }

      // Verify validation error appears
      await waitFor(() => {
        expect(screen.getByText(/maximum 9 passengers allowed/i)).toBeInTheDocument()
      })
    })

    it('validates infant to adult ratio', async () => {
      render(<HomePage />)

      // Wait for flights to load
      await waitFor(() => {
        expect(screen.getByText('FL001')).toBeInTheDocument()
      })

      // Add more infants than adults
      const infantsIncrement = screen.getByLabelText(/increment infants/i)
      fireEvent.click(infantsIncrement) // Add 1 infant (1 adult, 1 infant)

      // Verify validation error appears
      await waitFor(() => {
        expect(screen.getByText(/number of infants cannot exceed number of adults/i)).toBeInTheDocument()
      })
    })
  })

  describe('Flight Selection and Booking', () => {
    it('allows selecting a flight and navigates to booking page', async () => {
      render(<HomePage />)

      // Wait for flights to load
      await waitFor(() => {
        expect(screen.getByText('FL001')).toBeInTheDocument()
      })

      // Click on a flight to select it
      const selectFlightButton = screen.getByText(/select flight/i)
      fireEvent.click(selectFlightButton)

      // Verify navigation to booking page
      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/book/flight-1')
      })
    })

    it('displays flight details correctly', async () => {
      render(<HomePage />)

      // Wait for flights to load
      await waitFor(() => {
        expect(screen.getByText('FL001')).toBeInTheDocument()
        expect(screen.getByText('Test Airline')).toBeInTheDocument()
        expect(screen.getByText('New York')).toBeInTheDocument()
        expect(screen.getByText('Los Angeles')).toBeInTheDocument()
        expect(screen.getByText('$299')).toBeInTheDocument()
        expect(screen.getByText('Economy')).toBeInTheDocument()
      })
    })

    it('shows flight duration correctly', async () => {
      render(<HomePage />)

      // Wait for flights to load
      await waitFor(() => {
        expect(screen.getByText('FL001')).toBeInTheDocument()
      })

      // Check for duration display (3 hours for this flight)
      await waitFor(() => {
        expect(screen.getByText(/3h/i)).toBeInTheDocument()
      })
    })
  })

  describe('Form Validation', () => {
    it('validates required fields before search', async () => {
      render(<HomePage />)

      // Wait for flights to load
      await waitFor(() => {
        expect(screen.getByText('FL001')).toBeInTheDocument()
      })

      // Try to search without filling required fields
      const searchButton = screen.getByText(/search flights/i)
      fireEvent.click(searchButton)

      // Verify validation errors appear
      await waitFor(() => {
        expect(screen.getByText(/please select origin/i)).toBeInTheDocument()
        expect(screen.getByText(/please select destination/i)).toBeInTheDocument()
        expect(screen.getByText(/please select departure date/i)).toBeInTheDocument()
      })
    })

    it('validates origin and destination are different', async () => {
      render(<HomePage />)

      // Wait for flights to load
      await waitFor(() => {
        expect(screen.getByText('FL001')).toBeInTheDocument()
      })

      // Select same origin and destination
      const originSelect = screen.getByLabelText(/origin/i)
      const destinationSelect = screen.getByLabelText(/destination/i)
      
      fireEvent.change(originSelect, { target: { value: 'New York' } })
      fireEvent.change(destinationSelect, { target: { value: 'New York' } })

      // Verify validation error appears
      await waitFor(() => {
        expect(screen.getByText(/origin and destination cannot be the same/i)).toBeInTheDocument()
      })
    })

    it('validates departure date is not in the past', async () => {
      render(<HomePage />)

      // Wait for flights to load
      await waitFor(() => {
        expect(screen.getByText('FL001')).toBeInTheDocument()
      })

      // Select a past date
      const dateInput = screen.getByLabelText(/departure date/i)
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayString = yesterday.toISOString().split('T')[0]
      
      fireEvent.change(dateInput, { target: { value: yesterdayString } })

      // Verify validation error appears
      await waitFor(() => {
        expect(screen.getByText(/departure date cannot be in the past/i)).toBeInTheDocument()
      })
    })

    it('validates return date is after departure date for round trips', async () => {
      render(<HomePage />)

      // Wait for flights to load
      await waitFor(() => {
        expect(screen.getByText('FL001')).toBeInTheDocument()
      })

      // Switch to round trip
      const roundTripRadio = screen.getByLabelText(/round trip/i)
      fireEvent.click(roundTripRadio)

      // Select departure and return dates
      const departureDateInput = screen.getByLabelText(/departure date/i)
      const returnDateInput = screen.getByLabelText(/return date/i)
      
      fireEvent.change(departureDateInput, { target: { value: '2024-01-15' } })
      fireEvent.change(returnDateInput, { target: { value: '2024-01-14' } }) // Before departure

      // Verify validation error appears
      await waitFor(() => {
        expect(screen.getByText(/return date must be after departure date/i)).toBeInTheDocument()
      })
    })
  })

  describe('Offline Functionality', () => {
    it('works offline using cached data', async () => {
      // Mock offline state
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
      })

      render(<HomePage />)

      // Should still display flights from IndexedDB
      await waitFor(() => {
        expect(screen.getByText('FL001')).toBeInTheDocument()
        expect(screen.getByText('FL002')).toBeInTheDocument()
      })

      expect(mockIndexedDBService.getFlights).toHaveBeenCalled()
    })

    it('shows offline indicator when not connected', async () => {
      // Mock offline state
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
      })

      render(<HomePage />)

      // Should show offline indicator
      await waitFor(() => {
        expect(screen.getByText(/offline/i)).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('handles flight loading errors gracefully', async () => {
      // Mock error response
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          then: jest.fn().mockResolvedValue({ data: null, error: { message: 'Network error' } }),
        }),
      } as any)

      render(<HomePage />)

      // Should handle error gracefully
      await waitFor(() => {
        expect(screen.getByText(/error loading flights/i)).toBeInTheDocument()
      })
    })

    it('handles search errors gracefully', async () => {
      render(<HomePage />)

      // Wait for flights to load
      await waitFor(() => {
        expect(screen.getByText('FL001')).toBeInTheDocument()
      })

      // Mock search error
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          then: jest.fn().mockResolvedValue({ data: null, error: { message: 'Search failed' } }),
        }),
      } as any)

      // Fill required fields and search
      const originSelect = screen.getByLabelText(/origin/i)
      const destinationSelect = screen.getByLabelText(/destination/i)
      const dateInput = screen.getByLabelText(/departure date/i)
      
      fireEvent.change(originSelect, { target: { value: 'New York' } })
      fireEvent.change(destinationSelect, { target: { value: 'Los Angeles' } })
      fireEvent.change(dateInput, { target: { value: '2024-01-15' } })

      const searchButton = screen.getByText(/search flights/i)
      fireEvent.click(searchButton)

      // Should handle error gracefully
      await waitFor(() => {
        expect(screen.getByText(/error searching flights/i)).toBeInTheDocument()
      })
    })
  })
}) 