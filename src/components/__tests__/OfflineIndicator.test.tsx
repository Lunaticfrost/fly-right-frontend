import { render, screen, waitFor } from '@testing-library/react'
import OfflineIndicator from '../OfflineIndicator'

describe('OfflineIndicator Component', () => {
  beforeEach(() => {
    // Reset navigator.onLine to true before each test
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
    })
  })

  describe('Online State', () => {
    it('does not render when online', () => {
      render(<OfflineIndicator />)
      
      expect(screen.queryByText(/offline/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/you are currently offline/i)).not.toBeInTheDocument()
    })
  })

  describe('Offline State', () => {
    it('renders offline message when navigator.onLine is false', () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
      })

      render(<OfflineIndicator />)
      
      expect(screen.getByText(/offline/i)).toBeInTheDocument()
      expect(screen.getByText(/you are currently offline/i)).toBeInTheDocument()
    })

    it('renders with correct styling classes', () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
      })

      render(<OfflineIndicator />)
      
      const offlineIndicator = screen.getByText(/offline/i).closest('div')
      expect(offlineIndicator).toHaveClass('bg-red-500', 'text-white', 'text-center', 'py-2')
    })
  })

  describe('Dynamic State Changes', () => {
    it('updates when going from online to offline', async () => {
      render(<OfflineIndicator />)
      
      // Initially online
      expect(screen.queryByText(/offline/i)).not.toBeInTheDocument()
      
      // Simulate going offline
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
      })
      
      // Trigger online event
      window.dispatchEvent(new Event('offline'))
      
      await waitFor(() => {
        expect(screen.getByText(/offline/i)).toBeInTheDocument()
      })
    })

    it('updates when going from offline to online', async () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
      })

      render(<OfflineIndicator />)
      
      // Initially offline
      expect(screen.getByText(/offline/i)).toBeInTheDocument()
      
      // Simulate going online
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        writable: true,
      })
      
      // Trigger online event
      window.dispatchEvent(new Event('online'))
      
      await waitFor(() => {
        expect(screen.queryByText(/offline/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA attributes when offline', () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
      })

      render(<OfflineIndicator />)
      
      const offlineIndicator = screen.getByText(/offline/i).closest('div')
      expect(offlineIndicator).toHaveAttribute('role', 'alert')
      expect(offlineIndicator).toHaveAttribute('aria-live', 'polite')
    })

    it('has proper semantic structure', () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
      })

      render(<OfflineIndicator />)
      
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })

  describe('Content', () => {
    it('displays correct offline message', () => {
      Object.defineProperty(navigator, 'onLine', {
        value: false,
        writable: true,
      })

      render(<OfflineIndicator />)
      
      expect(screen.getByText('🔴 OFFLINE')).toBeInTheDocument()
      expect(screen.getByText('You are currently offline. Some features may be limited.')).toBeInTheDocument()
    })
  })
}) 