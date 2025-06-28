import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import Header from '../Header'
import { supabase } from '@/lib/supabase'

// Mock the modules
jest.mock('next/navigation')
jest.mock('@/lib/supabase')

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>
const mockSupabase = supabase as jest.Mocked<typeof supabase>

describe('Header Component', () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }

  beforeEach(() => {
    mockUseRouter.mockReturnValue(mockRouter)
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders the FlyRight logo and navigation links', () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      render(<Header />)

      expect(screen.getByText('✈️')).toBeInTheDocument()
      expect(screen.getByText('FlyRight')).toBeInTheDocument()
      expect(screen.getByText('Search Flights')).toBeInTheDocument()
      expect(screen.getByText('My Bookings')).toBeInTheDocument()
      expect(screen.getByText('Admin')).toBeInTheDocument()
      expect(screen.getByText('Offline Settings')).toBeInTheDocument()
    })

    it('renders navigation links with correct hrefs', () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      render(<Header />)

      const searchLink = screen.getByText('Search Flights').closest('a')
      const bookingsLink = screen.getByText('My Bookings').closest('a')
      const adminLink = screen.getByText('Admin').closest('a')
      const settingsLink = screen.getByText('Offline Settings').closest('a')

      expect(searchLink).toHaveAttribute('href', '/')
      expect(bookingsLink).toHaveAttribute('href', '/my-bookings')
      expect(adminLink).toHaveAttribute('href', '/admin')
      expect(settingsLink).toHaveAttribute('href', '/offline-settings')
    })
  })

  describe('User Authentication State', () => {
    it('shows user email and logout button when user is authenticated', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { name: 'Test User' },
      }

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      render(<Header />)

      await waitFor(() => {
        expect(screen.getByText('Welcome back!')).toBeInTheDocument()
        expect(screen.getByText('test@example.com')).toBeInTheDocument()
        expect(screen.getByText('T')).toBeInTheDocument() // First letter of email
        expect(screen.getByText('Logout')).toBeInTheDocument()
      })
    })

    it('does not show user info when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      render(<Header />)

      await waitFor(() => {
        expect(screen.queryByText('Welcome back!')).not.toBeInTheDocument()
        expect(screen.queryByText('Logout')).not.toBeInTheDocument()
      })
    })

    it('handles authentication error gracefully', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Auth error' },
      })

      render(<Header />)

      await waitFor(() => {
        expect(screen.queryByText('Welcome back!')).not.toBeInTheDocument()
        expect(screen.queryByText('Logout')).not.toBeInTheDocument()
      })
    })
  })

  describe('Logout Functionality', () => {
    it('calls supabase signOut and navigates to login page on logout', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      }

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabase.auth.signOut.mockResolvedValue({
        error: null,
      })

      render(<Header />)

      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument()
      })

      const logoutButton = screen.getByText('Logout')
      fireEvent.click(logoutButton)

      await waitFor(() => {
        expect(mockSupabase.auth.signOut).toHaveBeenCalledTimes(1)
        expect(mockRouter.push).toHaveBeenCalledWith('/auth/login')
      })
    })

    it('handles logout error gracefully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      }

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabase.auth.signOut.mockResolvedValue({
        error: { message: 'Logout failed' },
      })

      render(<Header />)

      await waitFor(() => {
        expect(screen.getByText('Logout')).toBeInTheDocument()
      })

      const logoutButton = screen.getByText('Logout')
      fireEvent.click(logoutButton)

      await waitFor(() => {
        expect(mockSupabase.auth.signOut).toHaveBeenCalledTimes(1)
        expect(mockRouter.push).toHaveBeenCalledWith('/auth/login')
      })
    })
  })

  describe('Responsive Design', () => {
    it('hides navigation on mobile (md:flex class)', () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      render(<Header />)

      const nav = screen.getByText('Search Flights').closest('nav')
      expect(nav).toHaveClass('hidden', 'md:flex')
    })

    it('hides user email on small screens (sm:block class)', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      }

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      render(<Header />)

      await waitFor(() => {
        const userInfo = screen.getByText('test@example.com').closest('div')
        expect(userInfo).toHaveClass('hidden', 'sm:block')
      })
    })
  })

  describe('Accessibility', () => {
    it('has proper semantic HTML structure', () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      render(<Header />)

      expect(screen.getByRole('banner')).toBeInTheDocument()
      expect(screen.getByRole('navigation')).toBeInTheDocument()
    })

    it('has proper button roles for logout', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      }

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      render(<Header />)

      await waitFor(() => {
        const logoutButton = screen.getByRole('button', { name: /logout/i })
        expect(logoutButton).toBeInTheDocument()
      })
    })
  })
}) 