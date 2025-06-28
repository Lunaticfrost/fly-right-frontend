# Testing Guide for FlyRight Frontend

This document provides a comprehensive guide to the testing setup for the FlyRight flight booking application.

## Testing Stack

- **Jest**: Unit and integration testing framework
- **React Testing Library**: Component testing utilities
- **Playwright**: End-to-end testing framework
- **TypeScript**: Type-safe testing

## Test Structure

```
src/
├── __tests__/
│   ├── integration/          # Integration tests
│   └── utils/               # Test utilities
├── components/
│   └── __tests__/           # Component unit tests
├── hooks/
│   └── __tests__/           # Hook unit tests
├── lib/
│   └── __tests__/           # Utility unit tests
tests/
└── e2e/                     # End-to-end tests
```

## Running Tests

### Unit and Integration Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- Header.test.tsx

# Run tests matching a pattern
npm test -- --testNamePattern="Header"
```

### End-to-End Tests

```bash
# Install Playwright browsers (first time only)
npx playwright install

# Run E2E tests
npm run test:e2e

# Run E2E tests in headed mode
npx playwright test --headed

# Run E2E tests for specific browser
npx playwright test --project=chromium

# Run E2E tests in debug mode
npx playwright test --debug
```

## Test Types

### 1. Unit Tests

Unit tests focus on testing individual functions, components, or utilities in isolation.

**Location**: `src/**/__tests__/*.test.tsx`

**Examples**:
- Component rendering and behavior
- Hook state management
- Utility function logic
- Data transformation functions

**Key Features**:
- Fast execution
- Isolated testing
- Mocked dependencies
- High coverage

### 2. Integration Tests

Integration tests verify that multiple components or modules work together correctly.

**Location**: `src/__tests__/integration/*.test.tsx`

**Examples**:
- Complete user flows
- Component interactions
- Data flow between components
- API integration

**Key Features**:
- Tests component interactions
- Verifies data flow
- Tests user workflows
- Realistic scenarios

### 3. End-to-End Tests

E2E tests simulate real user interactions across the entire application.

**Location**: `tests/e2e/*.spec.ts`

**Examples**:
- Complete booking flow
- Navigation between pages
- Form submissions
- Responsive design
- Cross-browser compatibility

**Key Features**:
- Real browser testing
- Full application testing
- User journey validation
- Performance testing

## Test Coverage

The testing suite covers:

### Components
- ✅ Header component (authentication, navigation, responsive design)
- ✅ OfflineIndicator component (online/offline state management)
- ✅ LogoutButton component (logout functionality)

### Hooks
- ✅ useOfflineData hook (offline functionality, data syncing)
- ✅ useFlightFilterWorker hook (flight filtering with web workers)

### Utilities
- ✅ IndexedDB service (database operations, data persistence)
- ✅ Supabase integration (authentication, data fetching)

### User Flows
- ✅ Flight search and filtering
- ✅ Passenger management
- ✅ Flight selection and booking
- ✅ Form validation
- ✅ Navigation between pages

### Edge Cases
- ✅ Offline functionality
- ✅ Error handling
- ✅ Loading states
- ✅ Responsive design
- ✅ Accessibility

## Writing Tests

### Component Tests

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import Header from '../Header'

describe('Header Component', () => {
  it('renders navigation links', () => {
    render(<Header />)
    
    expect(screen.getByText('Search Flights')).toBeInTheDocument()
    expect(screen.getByText('My Bookings')).toBeInTheDocument()
  })

  it('handles user logout', async () => {
    render(<Header />)
    
    const logoutButton = screen.getByText('Logout')
    fireEvent.click(logoutButton)
    
    // Verify logout behavior
  })
})
```

### Hook Tests

```typescript
import { renderHook, act } from '@testing-library/react'
import { useOfflineData } from '../useOfflineData'

describe('useOfflineData Hook', () => {
  it('manages online/offline state', () => {
    const { result } = renderHook(() => useOfflineData())
    
    expect(result.current.isOnline).toBe(true)
    
    act(() => {
      // Simulate going offline
      Object.defineProperty(navigator, 'onLine', { value: false })
      window.dispatchEvent(new Event('offline'))
    })
    
    expect(result.current.isOnline).toBe(false)
  })
})
```

### Integration Tests

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import HomePage from '@/app/page'

describe('Flight Booking Flow', () => {
  it('completes flight search and selection', async () => {
    render(<HomePage />)
    
    // Wait for flights to load
    await waitFor(() => {
      expect(screen.getByText('FL001')).toBeInTheDocument()
    })
    
    // Select flight
    const selectButton = screen.getByText('Select Flight')
    fireEvent.click(selectButton)
    
    // Verify navigation
    expect(mockRouter.push).toHaveBeenCalledWith('/book/flight-1')
  })
})
```

### E2E Tests

```typescript
import { test, expect } from '@playwright/test'

test('flight booking flow', async ({ page }) => {
  await page.goto('http://localhost:3000')
  
  // Wait for flights to load
  await page.waitForSelector('[data-testid="flight-card"]')
  
  // Select origin and destination
  await page.selectOption('select[name="origin"]', 'New York')
  await page.selectOption('select[name="destination"]', 'Los Angeles')
  
  // Verify filtered flights
  const flightCards = await page.locator('[data-testid="flight-card"]').count()
  expect(flightCards).toBeGreaterThan(0)
})
```

## Mocking

### External Dependencies

The testing setup includes comprehensive mocking for:

- **Supabase**: Database and authentication
- **IndexedDB**: Local storage
- **Web Workers**: Background processing
- **Next.js Router**: Navigation
- **Browser APIs**: Online/offline status, events

### Mock Examples

```typescript
// Mock Supabase response
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: mockUser },
        error: null,
      }),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: mockFlights, error: null })),
      })),
    })),
  },
}))

// Mock IndexedDB
jest.mock('@/lib/indexedDB', () => ({
  indexedDBService: {
    getFlights: jest.fn().mockResolvedValue(mockFlights),
    storeFlights: jest.fn().mockResolvedValue(),
  },
}))
```

## Test Data

### Mock Factories

Use the provided mock factories for consistent test data:

```typescript
import { createMockFlight, createMockBooking, createMockUser } from '@/__tests__/utils/test-utils'

const mockFlight = createMockFlight({
  price: 399,
  cabin_class: 'Business',
})

const mockBooking = createMockBooking({
  status: 'confirmed',
  total_price: 399,
})
```

## Best Practices

### 1. Test Organization
- Group related tests using `describe` blocks
- Use descriptive test names
- Follow the AAA pattern (Arrange, Act, Assert)

### 2. Component Testing
- Test user interactions, not implementation details
- Use semantic queries (getByRole, getByLabelText)
- Test accessibility features

### 3. Async Testing
- Use `waitFor` for async operations
- Mock timers when testing timeouts
- Handle loading states

### 4. Error Handling
- Test error scenarios
- Verify error messages
- Test fallback behavior

### 5. Performance
- Keep tests fast
- Use appropriate timeouts
- Mock heavy operations

## Continuous Integration

The testing setup is configured for CI/CD:

- **Unit tests**: Run on every commit
- **Integration tests**: Run on pull requests
- **E2E tests**: Run on main branch
- **Coverage reports**: Generated automatically

## Debugging Tests

### Jest Debugging

```bash
# Run tests in debug mode
npm test -- --detectOpenHandles

# Run specific test with verbose output
npm test -- --verbose --testNamePattern="Header"
```

### Playwright Debugging

```bash
# Run tests in debug mode
npx playwright test --debug

# Show test traces
npx playwright show-trace trace.zip

# Generate test report
npx playwright show-report
```

## Coverage Reports

Coverage reports are generated automatically and include:

- **Statements**: Percentage of code statements executed
- **Branches**: Percentage of code branches executed
- **Functions**: Percentage of functions called
- **Lines**: Percentage of lines executed

View coverage reports:
```bash
npm run test:coverage
# Open coverage/lcov-report/index.html in browser
```

## Troubleshooting

### Common Issues

1. **Mock not working**: Ensure mocks are defined before imports
2. **Async test failures**: Use `waitFor` for async operations
3. **Component not rendering**: Check for missing providers or context
4. **E2E test timeouts**: Increase timeout values for slow operations

### Performance Issues

1. **Slow tests**: Mock heavy operations
2. **Memory leaks**: Clean up after tests
3. **Flaky tests**: Use proper wait conditions

## Contributing

When adding new features:

1. Write unit tests for new components
2. Add integration tests for new workflows
3. Update E2E tests for user journeys
4. Maintain test coverage above 80%
5. Follow existing test patterns

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library) 