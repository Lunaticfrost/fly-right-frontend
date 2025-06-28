import { 
  generateBookingConfirmationEmail, 
  generateFlightUpdateEmail, 
  generateReminderEmail,
  sendEmail,
  verifyEmailConfig
} from '../email'

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
    verify: jest.fn().mockResolvedValue(true)
  }))
}))

describe('Email Service', () => {
  const mockBookingData = {
    bookingId: 'test-booking-123',
    passengerName: 'John Doe',
    passengerEmail: 'john@example.com',
    flightNumber: 'FR123',
    airline: 'FlyRight Airlines',
    origin: 'New York',
    destination: 'Los Angeles',
    departureTime: '2024-01-15T10:00:00Z',
    arrivalTime: '2024-01-15T13:00:00Z',
    cabinClass: 'Economy',
    totalPrice: 299.99,
    passengers: [
      { name: 'John Doe', age: '30', gender: 'Male' }
    ],
    bookingDate: '2024-01-10T15:30:00Z'
  }

  const mockFlightUpdateData = {
    bookingId: 'test-booking-123',
    passengerName: 'John Doe',
    passengerEmail: 'john@example.com',
    flightNumber: 'FR123',
    airline: 'FlyRight Airlines',
    origin: 'New York',
    destination: 'Los Angeles',
    departureTime: '2024-01-15T10:00:00Z',
    arrivalTime: '2024-01-15T13:00:00Z',
    oldStatus: 'Scheduled',
    newStatus: 'Delayed',
    updateTime: '2024-01-15T08:00:00Z'
  }

  const mockReminderData = {
    bookingId: 'test-booking-123',
    passengerName: 'John Doe',
    passengerEmail: 'john@example.com',
    flightNumber: 'FR123',
    airline: 'FlyRight Airlines',
    origin: 'New York',
    destination: 'Los Angeles',
    departureTime: '2024-01-15T10:00:00Z',
    arrivalTime: '2024-01-15T13:00:00Z',
    cabinClass: 'Economy',
    daysUntilFlight: 1
  }

  describe('generateBookingConfirmationEmail', () => {
    it('should generate booking confirmation email template', () => {
      const template = generateBookingConfirmationEmail(mockBookingData)

      expect(template.subject).toBe('Booking Confirmed - FlyRight Airlines FR123')
      expect(template.html).toContain('🎉 Booking Confirmed!')
      expect(template.html).toContain('John Doe')
      expect(template.html).toContain('FR123')
      expect(template.html).toContain('$299.99')
      expect(template.text).toContain('Booking Confirmed - FlyRight Airlines FR123')
      expect(template.text).toContain('John Doe')
    })

    it('should handle multiple passengers', () => {
      const dataWithMultiplePassengers = {
        ...mockBookingData,
        passengers: [
          { name: 'John Doe', age: '30', gender: 'Male' },
          { name: 'Jane Doe', age: '28', gender: 'Female' }
        ]
      }

      const template = generateBookingConfirmationEmail(dataWithMultiplePassengers)
      expect(template.html).toContain('Passengers (2)')
      expect(template.html).toContain('John Doe')
      expect(template.html).toContain('Jane Doe')
    })
  })

  describe('generateFlightUpdateEmail', () => {
    it('should generate flight update email template', () => {
      const template = generateFlightUpdateEmail(mockFlightUpdateData)

      expect(template.subject).toBe('Flight Update - FlyRight Airlines FR123')
      expect(template.html).toContain('✈️ Flight Update')
      expect(template.html).toContain('Scheduled')
      expect(template.html).toContain('Delayed')
      expect(template.text).toContain('Flight Update - FlyRight Airlines FR123')
      expect(template.text).toContain('Scheduled → Delayed')
    })

    it('should handle different status changes', () => {
      const cancelledData = {
        ...mockFlightUpdateData,
        oldStatus: 'Scheduled',
        newStatus: 'Cancelled'
      }

      const template = generateFlightUpdateEmail(cancelledData)
      expect(template.html).toContain('Cancelled')
      expect(template.text).toContain('Scheduled → Cancelled')
    })
  })

  describe('generateReminderEmail', () => {
    it('should generate reminder email template', () => {
      const template = generateReminderEmail(mockReminderData)

      expect(template.subject).toBe('Flight Reminder - FlyRight Airlines FR123 in 1 day')
      expect(template.html).toContain('⏰ Flight Reminder')
      expect(template.html).toContain('1 day until your flight!')
      expect(template.html).toContain('Check in online')
      expect(template.text).toContain('Flight Reminder - FlyRight Airlines FR123')
      expect(template.text).toContain('1 day')
    })

    it('should handle multiple days', () => {
      const twoDayData = {
        ...mockReminderData,
        daysUntilFlight: 2
      }

      const template = generateReminderEmail(twoDayData)
      expect(template.subject).toBe('Flight Reminder - FlyRight Airlines FR123 in 2 days')
      expect(template.html).toContain('2 days until your flight!')
    })
  })

  describe('sendEmail', () => {
    it('should send email successfully', async () => {
      const template = generateBookingConfirmationEmail(mockBookingData)
      const result = await sendEmail('test@example.com', template)

      expect(result).toBe(true)
    })

    it('should handle email sending errors', async () => {
      // Mock sendMail to throw an error
      const mockSendMail = jest.fn().mockRejectedValue(new Error('SMTP error'))
      const mockTransporter = {
        sendMail: mockSendMail
      }
      
      // Mock createTransport to return our mock transporter
      const nodemailer = jest.requireMock('nodemailer')
      nodemailer.createTransport.mockReturnValue(mockTransporter)

      const template = generateBookingConfirmationEmail(mockBookingData)
      const result = await sendEmail('test@example.com', template)

      expect(result).toBe(false)
    })
  })

  describe('verifyEmailConfig', () => {
    it('should verify email configuration successfully', async () => {
      const result = await verifyEmailConfig()
      expect(result).toBe(true)
    })

    it('should handle verification errors', async () => {
      // Mock verify to throw an error
      const mockVerify = jest.fn().mockRejectedValue(new Error('Invalid config'))
      const mockTransporter = {
        verify: mockVerify
      }
      
      const nodemailer = jest.requireMock('nodemailer')
      nodemailer.createTransport.mockReturnValue(mockTransporter)

      const result = await verifyEmailConfig()
      expect(result).toBe(false)
    })
  })

  describe('Email template formatting', () => {
    it('should format dates correctly', () => {
      const template = generateBookingConfirmationEmail(mockBookingData)
      
      // Check that dates are formatted in the template
      expect(template.html).toContain('2024')
      expect(template.text).toContain('2024')
    })

    it('should calculate flight duration correctly', () => {
      const template = generateBookingConfirmationEmail(mockBookingData)
      
      // 3 hour flight (10:00 to 13:00)
      expect(template.html).toContain('3h')
      expect(template.text).toContain('3h')
    })

    it('should handle edge cases', () => {
      // Test with missing data
      const minimalData = {
        bookingId: 'test',
        passengerName: 'Test',
        passengerEmail: 'test@example.com',
        flightNumber: 'TEST',
        airline: 'Test Air',
        origin: 'A',
        destination: 'B',
        departureTime: '2024-01-15T10:00:00Z',
        arrivalTime: '2024-01-15T10:30:00Z',
        cabinClass: 'Economy',
        totalPrice: 100,
        passengers: [],
        bookingDate: '2024-01-10T00:00:00Z'
      }

      const template = generateBookingConfirmationEmail(minimalData)
      expect(template.subject).toBe('Booking Confirmed - Test Air TEST')
      expect(template.html).toContain('Test')
      expect(template.text).toContain('Test')
    })
  })
}) 