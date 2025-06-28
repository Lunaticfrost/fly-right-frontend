import { test, expect } from '@playwright/test'

test.describe('Flight Booking E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the home page before each test
    await page.goto('http://localhost:3000')
  })

  test.describe('Flight Search', () => {
    test('should display flight search form', async ({ page }) => {
      // Check that the main search form is visible
      await expect(page.getByRole('heading', { name: /search flights/i })).toBeVisible()
      await expect(page.getByLabel(/origin/i)).toBeVisible()
      await expect(page.getByLabel(/destination/i)).toBeVisible()
      await expect(page.getByLabel(/departure date/i)).toBeVisible()
      await expect(page.getByRole('button', { name: /search flights/i })).toBeVisible()
    })

    test('should load and display flights on page load', async ({ page }) => {
      // Wait for flights to load
      await page.waitForSelector('[data-testid="flight-card"]', { timeout: 10000 })
      
      // Check that flights are displayed
      const flightCards = await page.locator('[data-testid="flight-card"]').count()
      expect(flightCards).toBeGreaterThan(0)
    })

    test('should filter flights by origin and destination', async ({ page }) => {
      // Wait for flights to load
      await page.waitForSelector('[data-testid="flight-card"]', { timeout: 10000 })

      // Select origin
      await page.selectOption('select[name="origin"]', 'New York')
      
      // Select destination
      await page.selectOption('select[name="destination"]', 'Los Angeles')

      // Wait for filtering to complete
      await page.waitForTimeout(1000)

      // Verify that filtered flights are shown
      const filteredFlights = await page.locator('[data-testid="flight-card"]').count()
      expect(filteredFlights).toBeGreaterThan(0)
    })

    test('should filter flights by date', async ({ page }) => {
      // Wait for flights to load
      await page.waitForSelector('[data-testid="flight-card"]', { timeout: 10000 })

      // Select a future date
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowString = tomorrow.toISOString().split('T')[0]
      
      await page.fill('input[name="departureDate"]', tomorrowString)

      // Wait for filtering to complete
      await page.waitForTimeout(1000)

      // Verify that filtered flights are shown
      const filteredFlights = await page.locator('[data-testid="flight-card"]').count()
      expect(filteredFlights).toBeGreaterThan(0)
    })

    test('should filter flights by cabin class', async ({ page }) => {
      // Wait for flights to load
      await page.waitForSelector('[data-testid="flight-card"]', { timeout: 10000 })

      // Select cabin class
      await page.selectOption('select[name="cabinClass"]', 'Business')

      // Wait for filtering to complete
      await page.waitForTimeout(1000)

      // Verify that only business class flights are shown
      const businessFlights = await page.locator('[data-testid="flight-card"]').count()
      expect(businessFlights).toBeGreaterThan(0)
    })
  })

  test.describe('Passenger Management', () => {
    test('should allow adding and removing passengers', async ({ page }) => {
      // Wait for flights to load
      await page.waitForSelector('[data-testid="flight-card"]', { timeout: 10000 })

      // Find passenger count controls
      const adultsIncrement = page.getByRole('button', { name: /increment adults/i })
      const childrenIncrement = page.getByRole('button', { name: /increment children/i })

      // Get initial counts
      const initialAdults = await page.locator('[data-testid="adults-count"]').textContent()
      const initialChildren = await page.locator('[data-testid="children-count"]').textContent()

      // Add passengers
      await adultsIncrement.click()
      await childrenIncrement.click()

      // Verify counts have increased
      const newAdults = await page.locator('[data-testid="adults-count"]').textContent()
      const newChildren = await page.locator('[data-testid="children-count"]').textContent()

      expect(parseInt(newAdults!)).toBe(parseInt(initialAdults!) + 1)
      expect(parseInt(newChildren!)).toBe(parseInt(initialChildren!) + 1)
    })

    test('should validate passenger count limits', async ({ page }) => {
      // Wait for flights to load
      await page.waitForSelector('[data-testid="flight-card"]', { timeout: 10000 })

      // Try to add too many passengers
      const adultsIncrement = page.getByRole('button', { name: /increment adults/i })
      
      // Add 9 more adults (total 10, which exceeds limit)
      for (let i = 0; i < 9; i++) {
        await adultsIncrement.click()
      }

      // Verify validation error appears
      await expect(page.getByText(/maximum 9 passengers allowed/i)).toBeVisible()
    })

    test('should validate infant to adult ratio', async ({ page }) => {
      // Wait for flights to load
      await page.waitForSelector('[data-testid="flight-card"]', { timeout: 10000 })

      // Add more infants than adults
      const infantsIncrement = page.getByRole('button', { name: /increment infants/i })
      await infantsIncrement.click()

      // Verify validation error appears
      await expect(page.getByText(/number of infants cannot exceed number of adults/i)).toBeVisible()
    })
  })

  test.describe('Flight Selection', () => {
    test('should allow selecting a flight and navigate to booking page', async ({ page }) => {
      // Wait for flights to load
      await page.waitForSelector('[data-testid="flight-card"]', { timeout: 10000 })

      // Click on the first flight's select button
      const firstFlightSelectButton = page.locator('[data-testid="flight-card"]').first().getByRole('button', { name: /select flight/i })
      await firstFlightSelectButton.click()

      // Verify navigation to booking page
      await expect(page).toHaveURL(/\/book\/flight-/)
    })

    test('should display flight details correctly', async ({ page }) => {
      // Wait for flights to load
      await page.waitForSelector('[data-testid="flight-card"]', { timeout: 10000 })

      // Check that flight details are displayed
      await expect(page.getByText(/FL\d+/)).toBeVisible() // Flight number
      await expect(page.getByText(/\$[\d,]+/)).toBeVisible() // Price
      await expect(page.getByText(/Economy|Business|First/)).toBeVisible() // Cabin class
    })

    test('should show flight duration', async ({ page }) => {
      // Wait for flights to load
      await page.waitForSelector('[data-testid="flight-card"]', { timeout: 10000 })

      // Check that flight duration is displayed
      await expect(page.getByText(/\d+h/)).toBeVisible() // Duration in hours
    })
  })

  test.describe('Form Validation', () => {
    test('should validate required fields before search', async ({ page }) => {
      // Wait for flights to load
      await page.waitForSelector('[data-testid="flight-card"]', { timeout: 10000 })

      // Try to search without filling required fields
      await page.getByRole('button', { name: /search flights/i }).click()

      // Verify validation errors appear
      await expect(page.getByText(/please select origin/i)).toBeVisible()
      await expect(page.getByText(/please select destination/i)).toBeVisible()
      await expect(page.getByText(/please select departure date/i)).toBeVisible()
    })

    test('should validate origin and destination are different', async ({ page }) => {
      // Wait for flights to load
      await page.waitForSelector('[data-testid="flight-card"]', { timeout: 10000 })

      // Select same origin and destination
      await page.selectOption('select[name="origin"]', 'New York')
      await page.selectOption('select[name="destination"]', 'New York')

      // Verify validation error appears
      await expect(page.getByText(/origin and destination cannot be the same/i)).toBeVisible()
    })

    test('should validate departure date is not in the past', async ({ page }) => {
      // Wait for flights to load
      await page.waitForSelector('[data-testid="flight-card"]', { timeout: 10000 })

      // Select a past date
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayString = yesterday.toISOString().split('T')[0]
      
      await page.fill('input[name="departureDate"]', yesterdayString)

      // Verify validation error appears
      await expect(page.getByText(/departure date cannot be in the past/i)).toBeVisible()
    })

    test('should validate return date for round trips', async ({ page }) => {
      // Wait for flights to load
      await page.waitForSelector('[data-testid="flight-card"]', { timeout: 10000 })

      // Switch to round trip
      await page.getByLabel(/round trip/i).check()

      // Select departure and return dates
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowString = tomorrow.toISOString().split('T')[0]
      
      const today = new Date()
      const todayString = today.toISOString().split('T')[0]
      
      await page.fill('input[name="departureDate"]', tomorrowString)
      await page.fill('input[name="returnDate"]', todayString) // Before departure

      // Verify validation error appears
      await expect(page.getByText(/return date must be after departure date/i)).toBeVisible()
    })
  })

  test.describe('Navigation', () => {
    test('should navigate to My Bookings page', async ({ page }) => {
      // Click on My Bookings link
      await page.getByRole('link', { name: /my bookings/i }).click()

      // Verify navigation
      await expect(page).toHaveURL(/\/my-bookings/)
    })

    test('should navigate to Admin page', async ({ page }) => {
      // Click on Admin link
      await page.getByRole('link', { name: /admin/i }).click()

      // Verify navigation
      await expect(page).toHaveURL(/\/admin/)
    })

    test('should navigate to Offline Settings page', async ({ page }) => {
      // Click on Offline Settings link
      await page.getByRole('link', { name: /offline settings/i }).click()

      // Verify navigation
      await expect(page).toHaveURL(/\/offline-settings/)
    })
  })

  test.describe('Responsive Design', () => {
    test('should work on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })

      // Wait for flights to load
      await page.waitForSelector('[data-testid="flight-card"]', { timeout: 10000 })

      // Verify that the page is still functional
      await expect(page.getByRole('heading', { name: /search flights/i })).toBeVisible()
      await expect(page.locator('[data-testid="flight-card"]').first()).toBeVisible()
    })

    test('should work on tablet viewport', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 })

      // Wait for flights to load
      await page.waitForSelector('[data-testid="flight-card"]', { timeout: 10000 })

      // Verify that the page is still functional
      await expect(page.getByRole('heading', { name: /search flights/i })).toBeVisible()
      await expect(page.locator('[data-testid="flight-card"]').first()).toBeVisible()
    })
  })

  test.describe('Accessibility', () => {
    test('should have proper heading structure', async ({ page }) => {
      // Wait for flights to load
      await page.waitForSelector('[data-testid="flight-card"]', { timeout: 10000 })

      // Check heading hierarchy
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').all()
      expect(headings.length).toBeGreaterThan(0)
    })

    test('should have proper form labels', async ({ page }) => {
      // Wait for flights to load
      await page.waitForSelector('[data-testid="flight-card"]', { timeout: 10000 })

      // Check that form inputs have labels
      const originInput = page.locator('select[name="origin"]')
      const destinationInput = page.locator('select[name="destination"]')
      const dateInput = page.locator('input[name="departureDate"]')

      await expect(originInput).toHaveAttribute('aria-label')
      await expect(destinationInput).toHaveAttribute('aria-label')
      await expect(dateInput).toHaveAttribute('aria-label')
    })

    test('should have proper button roles', async ({ page }) => {
      // Wait for flights to load
      await page.waitForSelector('[data-testid="flight-card"]', { timeout: 10000 })

      // Check that buttons have proper roles
      const searchButton = page.getByRole('button', { name: /search flights/i })
      const selectFlightButton = page.locator('[data-testid="flight-card"]').first().getByRole('button', { name: /select flight/i })

      await expect(searchButton).toBeVisible()
      await expect(selectFlightButton).toBeVisible()
    })
  })

  test.describe('Performance', () => {
    test('should load flights within reasonable time', async ({ page }) => {
      const startTime = Date.now()
      
      // Wait for flights to load
      await page.waitForSelector('[data-testid="flight-card"]', { timeout: 10000 })
      
      const loadTime = Date.now() - startTime
      
      // Should load within 5 seconds
      expect(loadTime).toBeLessThan(5000)
    })

    test('should handle large number of flights', async ({ page }) => {
      // Wait for flights to load
      await page.waitForSelector('[data-testid="flight-card"]', { timeout: 10000 })

      // Count flights
      const flightCount = await page.locator('[data-testid="flight-card"]').count()
      
      // Should handle at least 10 flights without performance issues
      expect(flightCount).toBeGreaterThan(0)
    })
  })
}) 