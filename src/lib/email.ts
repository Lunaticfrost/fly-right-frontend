// Email service

import { createTransport } from 'nodemailer'

// Email configuration
const emailConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
}

// Create transporter
const transporter = createTransport(emailConfig)

// Email templates
export interface EmailTemplate {
  subject: string
  html: string
  text: string
}

export interface BookingConfirmationData {
  bookingId: string
  passengerName: string
  passengerEmail: string
  flightNumber: string
  airline: string
  origin: string
  destination: string
  departureTime: string
  arrivalTime: string
  cabinClass: string
  totalPrice: number
  passengers: Array<{
    name: string
    age: string
    gender: string
  }>
  bookingDate: string
}

export interface FlightUpdateData {
  bookingId: string
  passengerName: string
  passengerEmail: string
  flightNumber: string
  airline: string
  origin: string
  destination: string
  departureTime: string
  arrivalTime: string
  oldStatus: string
  newStatus: string
  updateTime: string
}

export interface ReminderData {
  bookingId: string
  passengerName: string
  passengerEmail: string
  flightNumber: string
  airline: string
  origin: string
  destination: string
  departureTime: string
  arrivalTime: string
  cabinClass: string
  daysUntilFlight: number
}

// Email template generators
export const generateBookingConfirmationEmail = (data: BookingConfirmationData): EmailTemplate => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  }

  const calculateDuration = (departureTime: string, arrivalTime: string) => {
    const departure = new Date(departureTime)
    const arrival = new Date(arrivalTime)
    const durationMs = arrival.getTime() - departure.getTime()
    const durationHours = Math.floor(durationMs / (1000 * 60 * 60))
    const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))
    
    if (durationHours > 0) {
      return `${durationHours}h ${durationMinutes}m`
    } else {
      return `${durationMinutes}m`
    }
  }

  const subject = `Booking Confirmed - ${data.airline} ${data.flightNumber}`

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Booking Confirmation</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
        .flight-card { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .flight-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .route { font-size: 24px; font-weight: bold; color: #2c3e50; }
        .flight-number { background: #3498db; color: white; padding: 5px 10px; border-radius: 15px; font-size: 14px; }
        .flight-details { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
        .detail { text-align: center; }
        .detail-label { font-size: 12px; color: #7f8c8d; text-transform: uppercase; margin-bottom: 5px; }
        .detail-value { font-size: 18px; font-weight: bold; color: #2c3e50; }
        .passengers { margin: 20px 0; }
        .passenger { background: #ecf0f1; padding: 10px; margin: 5px 0; border-radius: 5px; }
        .total { text-align: right; font-size: 20px; font-weight: bold; color: #27ae60; margin-top: 20px; }
        .footer { text-align: center; margin-top: 30px; color: #7f8c8d; font-size: 14px; }
        .button { display: inline-block; background: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Booking Confirmed!</h1>
          <p>Your flight has been successfully booked</p>
        </div>
        
        <div class="content">
          <div class="flight-card">
            <div class="flight-header">
              <div class="route">${data.origin} → ${data.destination}</div>
              <div class="flight-number">${data.flightNumber}</div>
            </div>
            
            <div class="flight-details">
              <div class="detail">
                <div class="detail-label">Departure</div>
                <div class="detail-value">${formatTime(data.departureTime)}</div>
                <div class="detail-label">${formatDate(data.departureTime)}</div>
              </div>
              <div class="detail">
                <div class="detail-label">Arrival</div>
                <div class="detail-value">${formatTime(data.arrivalTime)}</div>
                <div class="detail-label">${formatDate(data.arrivalTime)}</div>
              </div>
            </div>
            
            <div style="text-align: center; margin: 20px 0; color: #7f8c8d;">
              Duration: ${calculateDuration(data.departureTime, data.arrivalTime)} | ${data.cabinClass} Class
            </div>
          </div>
          
          <div class="passengers">
            <h3>Passengers (${data.passengers.length})</h3>
            ${data.passengers.map(passenger => `
              <div class="passenger">
                ${passenger.name} - ${passenger.age} years old - ${passenger.gender}
              </div>
            `).join('')}
          </div>
          
          <div class="total">
            Total: $${data.totalPrice.toFixed(2)}
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/my-bookings" class="button">View My Bookings</a>
          </div>
          
          <div style="background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <strong>Booking Details:</strong><br>
            Booking ID: ${data.bookingId}<br>
            Booking Date: ${formatDate(data.bookingDate)}<br>
            Airline: ${data.airline}
          </div>
        </div>
        
        <div class="footer">
          <p>Thank you for choosing FlyRight!</p>
          <p>If you have any questions, please contact our support team.</p>
        </div>
      </div>
    </body>
    </html>
  `

  const text = `
Booking Confirmed - ${data.airline} ${data.flightNumber}

Dear ${data.passengerName},

Your flight booking has been confirmed! Here are your flight details:

Flight: ${data.airline} ${data.flightNumber}
Route: ${data.origin} to ${data.destination}
Departure: ${formatDate(data.departureTime)} at ${formatTime(data.departureTime)}
Arrival: ${formatDate(data.arrivalTime)} at ${formatTime(data.arrivalTime)}
Duration: ${calculateDuration(data.departureTime, data.arrivalTime)}
Class: ${data.cabinClass}

Passengers:
${data.passengers.map(passenger => `- ${passenger.name} (${passenger.age} years old, ${passenger.gender})`).join('\n')}

Total Amount: $${data.totalPrice.toFixed(2)}
Booking ID: ${data.bookingId}
Booking Date: ${formatDate(data.bookingDate)}

View your bookings: ${process.env.NEXT_PUBLIC_APP_URL}/my-bookings

Thank you for choosing FlyRight!
  `

  return { subject, html, text }
}

export const generateFlightUpdateEmail = (data: FlightUpdateData): EmailTemplate => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delayed': return '#e74c3c'
      case 'cancelled': return '#e74c3c'
      case 'boarding': return '#f39c12'
      case 'departed': return '#f39c12'
      case 'on time': return '#27ae60'
      case 'scheduled': return '#27ae60'
      default: return '#3498db'
    }
  }

  const subject = `Flight Update - ${data.airline} ${data.flightNumber}`

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Flight Update</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
        .update-card { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .status-change { text-align: center; margin: 20px 0; }
        .old-status { display: inline-block; padding: 5px 15px; background: #ecf0f1; border-radius: 15px; margin: 0 10px; }
        .new-status { display: inline-block; padding: 5px 15px; background: ${getStatusColor(data.newStatus)}; color: white; border-radius: 15px; margin: 0 10px; }
        .flight-info { background: #ecf0f1; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #7f8c8d; font-size: 14px; }
        .button { display: inline-block; background: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✈️ Flight Update</h1>
          <p>Important information about your flight</p>
        </div>
        
        <div class="content">
          <div class="update-card">
            <h2>Flight Status Update</h2>
            
            <div class="status-change">
              <span class="old-status">${data.oldStatus}</span>
              <span style="font-size: 20px;">→</span>
              <span class="new-status">${data.newStatus}</span>
            </div>
            
            <div class="flight-info">
              <strong>Flight:</strong> ${data.airline} ${data.flightNumber}<br>
              <strong>Route:</strong> ${data.origin} to ${data.destination}<br>
              <strong>Departure:</strong> ${formatDate(data.departureTime)} at ${formatTime(data.departureTime)}<br>
              <strong>Update Time:</strong> ${formatDate(data.updateTime)} at ${formatTime(data.updateTime)}
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/my-bookings" class="button">View My Bookings</a>
            </div>
          </div>
        </div>
        
        <div class="footer">
          <p>Thank you for choosing FlyRight!</p>
          <p>For immediate assistance, please contact our support team.</p>
        </div>
      </div>
    </body>
    </html>
  `

  const text = `
Flight Update - ${data.airline} ${data.flightNumber}

Dear ${data.passengerName},

Your flight status has been updated:

Flight: ${data.airline} ${data.flightNumber}
Route: ${data.origin} to ${data.destination}
Departure: ${formatDate(data.departureTime)} at ${formatTime(data.departureTime)}

Status Change: ${data.oldStatus} → ${data.newStatus}
Update Time: ${formatDate(data.updateTime)} at ${formatTime(data.updateTime)}

View your bookings: ${process.env.NEXT_PUBLIC_APP_URL}/my-bookings

Thank you for choosing FlyRight!
  `

  return { subject, html, text }
}

export const generateReminderEmail = (data: ReminderData): EmailTemplate => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  }

  const subject = `Flight Reminder - ${data.airline} ${data.flightNumber} in ${data.daysUntilFlight} day${data.daysUntilFlight === 1 ? '' : 's'}`

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Flight Reminder</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
        .reminder-card { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .countdown { text-align: center; font-size: 24px; font-weight: bold; color: #e67e22; margin: 20px 0; }
        .flight-info { background: #ecf0f1; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .checklist { background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #7f8c8d; font-size: 14px; }
        .button { display: inline-block; background: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⏰ Flight Reminder</h1>
          <p>Your flight is coming up soon!</p>
        </div>
        
        <div class="content">
          <div class="reminder-card">
            <div class="countdown">
              ${data.daysUntilFlight} day${data.daysUntilFlight === 1 ? '' : 's'} until your flight!
            </div>
            
            <div class="flight-info">
              <strong>Flight:</strong> ${data.airline} ${data.flightNumber}<br>
              <strong>Route:</strong> ${data.origin} to ${data.destination}<br>
              <strong>Departure:</strong> ${formatDate(data.departureTime)} at ${formatTime(data.departureTime)}<br>
              <strong>Class:</strong> ${data.cabinClass}
            </div>
            
            <div class="checklist">
              <h3>Pre-Flight Checklist:</h3>
              <ul>
                <li>✅ Check in online (24 hours before departure)</li>
                <li>✅ Pack your travel documents</li>
                <li>✅ Arrive at the airport 2 hours before departure</li>
                <li>✅ Have your boarding pass ready</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/my-bookings" class="button">View My Bookings</a>
            </div>
          </div>
        </div>
        
        <div class="footer">
          <p>Thank you for choosing FlyRight!</p>
          <p>Have a great trip!</p>
        </div>
      </div>
    </body>
    </html>
  `

  const text = `
Flight Reminder - ${data.airline} ${data.flightNumber}

Dear ${data.passengerName},

Your flight is coming up in ${data.daysUntilFlight} day${data.daysUntilFlight === 1 ? '' : 's'}!

Flight: ${data.airline} ${data.flightNumber}
Route: ${data.origin} to ${data.destination}
Departure: ${formatDate(data.departureTime)} at ${formatTime(data.departureTime)}
Class: ${data.cabinClass}

Pre-Flight Checklist:
- Check in online (24 hours before departure)
- Pack your travel documents
- Arrive at the airport 2 hours before departure
- Have your boarding pass ready

View your bookings: ${process.env.NEXT_PUBLIC_APP_URL}/my-bookings

Thank you for choosing FlyRight!
  `

  return { subject, html, text }
}

// Email sending functions
export const sendEmail = async (
  to: string,
  template: EmailTemplate,
  from?: string
): Promise<boolean> => {
  try {
    const mailOptions = {
      from: from || process.env.SMTP_FROM || 'noreply@flyright.com',
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    }

    const info = await transporter.sendMail(mailOptions)
    console.log('Email sent successfully:', info.messageId)
    return true
  } catch (error) {
    console.error('Error sending email:', error)
    return false
  }
}

export const sendBookingConfirmation = async (data: BookingConfirmationData): Promise<boolean> => {
  const template = generateBookingConfirmationEmail(data)
  return await sendEmail(data.passengerEmail, template)
}

export const sendFlightUpdate = async (data: FlightUpdateData): Promise<boolean> => {
  const template = generateFlightUpdateEmail(data)
  return await sendEmail(data.passengerEmail, template)
}

export const sendReminder = async (data: ReminderData): Promise<boolean> => {
  const template = generateReminderEmail(data)
  return await sendEmail(data.passengerEmail, template)
}

// Verify email configuration
export const verifyEmailConfig = async (): Promise<boolean> => {
  try {
    await transporter.verify()
    console.log('Email configuration is valid')
    return true
  } catch (error) {
    console.error('Email configuration error:', error)
    return false
  }
}
