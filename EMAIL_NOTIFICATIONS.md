# Email Notifications System

This document provides a comprehensive guide to the email notification system implemented in the FlyRight flight booking application.

## Overview

The email notification system automatically sends emails to passengers for various events:
- **Booking Confirmations**: When a flight is successfully booked
- **Flight Updates**: When flight status changes (delayed, cancelled, etc.)
- **Flight Reminders**: Before departure (1, 2, and 7 days)

## Architecture

### Components

1. **Email Service** (`src/lib/email.ts`)
   - Handles email sending using Nodemailer
   - Generates HTML and text email templates
   - Supports multiple email types

2. **Notification Service** (`src/lib/notifications.ts`)
   - High-level API for sending notifications
   - Manages notification history and statistics
   - Provides utility functions for common patterns

3. **API Routes** (`src/app/api/notifications/`)
   - `/booking-confirmation`: Sends booking confirmation emails
   - `/flight-update`: Sends flight status update emails
   - `/reminder`: Sends flight reminder emails

4. **Cron Jobs** (`src/app/api/cron/`)
   - `/daily-reminders`: Automated daily reminder sending

5. **Admin Interface** (`src/app/admin/notifications/`)
   - Dashboard for monitoring notifications
   - Manual trigger for reminders
   - Statistics and history

## Email Templates

### Booking Confirmation Email
- **Trigger**: When a booking is successfully created
- **Content**: Flight details, passenger information, booking ID, total price
- **Design**: Professional HTML template with flight itinerary

### Flight Update Email
- **Trigger**: When flight status changes
- **Content**: Old status, new status, flight details, update time
- **Design**: Status change visualization with color coding

### Flight Reminder Email
- **Trigger**: Automated daily reminders (1, 2, 7 days before flight)
- **Content**: Flight details, countdown, pre-flight checklist
- **Design**: Friendly reminder with helpful travel tips

## Configuration

### Environment Variables

Add these to your `.env.local` file:

```bash
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@flyright.com

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Cron Job Security
CRON_SECRET=your-secret-key
```

### Gmail Setup

1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a password for "Mail"
3. Use the generated password as `SMTP_PASS`

### Database Schema

The system uses an `email_notifications` table to track sent emails:

```sql
CREATE TABLE email_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES bookings(id),
  type VARCHAR(50) NOT NULL,
  recipient_email VARCHAR(255) NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'sent',
  metadata JSONB,
  resent_at TIMESTAMP WITH TIME ZONE
);
```

## Usage

### Automatic Notifications

The system automatically sends notifications in these scenarios:

1. **Booking Confirmation**: Triggered in the booking flow
2. **Flight Status Updates**: Triggered by real-time flight status changes
3. **Daily Reminders**: Triggered by cron job or manual admin action

### Manual Notifications

#### Using the Notification Service

```typescript
import { Notifications } from '@/lib/notifications'

// Send booking confirmation
await Notifications.onBookingCreated(bookingId)

// Send flight status update
await Notifications.onFlightStatusChanged(flightId, 'Scheduled', 'Delayed')

// Send daily reminders
await Notifications.sendDailyReminders()
```

#### Using the Admin Interface

1. Navigate to `/admin/notifications`
2. View notification statistics
3. Use "Send Daily Reminders" button
4. Use "Resend Failed" button to retry failed emails

### API Endpoints

#### Send Booking Confirmation
```bash
POST /api/notifications/booking-confirmation
Content-Type: application/json

{
  "bookingId": "uuid"
}
```

#### Send Flight Update
```bash
POST /api/notifications/flight-update
Content-Type: application/json

{
  "flightId": "uuid",
  "oldStatus": "Scheduled",
  "newStatus": "Delayed"
}
```

#### Send Reminders
```bash
POST /api/notifications/reminder
Content-Type: application/json

{
  "daysUntilFlight": 1
}
```

#### Daily Reminders Cron Job
```bash
POST /api/cron/daily-reminders
Authorization: Bearer your-cron-secret
```

## Monitoring and Analytics

### Notification Statistics

The system tracks:
- Total notifications sent
- Success/failure rates
- Notifications by type
- Notifications by date
- Failed notification retry attempts

### Admin Dashboard Features

- Real-time statistics
- Recent notification history
- Manual trigger buttons
- Failed notification resend
- Export capabilities

## Error Handling

### Email Failures

- Failed emails are logged in the database
- Admin can manually resend failed notifications
- System continues to function even if emails fail
- Detailed error logging for debugging

### Retry Logic

- Failed notifications can be resent via admin interface
- Automatic retry for recent failures
- Status tracking (sent, failed, resent)

## Security Considerations

### Authentication

- Cron jobs require secret token authentication
- Admin interface should be protected
- Email credentials stored securely

### Rate Limiting

- Consider implementing rate limiting for email sending
- Respect SMTP provider limits
- Batch processing for large volumes

### Privacy

- Email addresses are stored for notification purposes
- GDPR compliance for email communications
- Opt-out mechanisms for users

## Testing

### Local Testing

1. Set up environment variables
2. Use a test email service (Mailtrap, etc.)
3. Test email templates with sample data
4. Verify email delivery and formatting

### Integration Testing

```typescript
// Test booking confirmation
const bookingId = 'test-booking-id'
const success = await Notifications.onBookingCreated(bookingId)
expect(success).toBe(true)

// Test flight update
const flightId = 'test-flight-id'
const success = await Notifications.onFlightStatusChanged(flightId, 'Scheduled', 'Delayed')
expect(success).toBe(true)
```

## Deployment

### Production Setup

1. Configure production SMTP settings
2. Set up cron jobs for automated reminders
3. Configure monitoring and alerting
4. Set up email delivery monitoring

### Cron Job Setup

For automated daily reminders, set up a cron job:

```bash
# Daily at 9 AM
0 9 * * * curl -X POST https://your-domain.com/api/cron/daily-reminders \
  -H "Authorization: Bearer your-cron-secret"
```

### Monitoring

- Set up email delivery monitoring
- Monitor SMTP provider quotas
- Track notification success rates
- Alert on high failure rates

## Troubleshooting

### Common Issues

1. **Emails not sending**
   - Check SMTP configuration
   - Verify email credentials
   - Check network connectivity

2. **Template rendering issues**
   - Validate email template syntax
   - Check data availability
   - Test with sample data

3. **High failure rates**
   - Check SMTP provider limits
   - Verify email addresses
   - Review error logs

### Debug Mode

Enable debug logging:

```typescript
// In email service
console.log('Email configuration:', emailConfig)
console.log('Sending email to:', to)
console.log('Email template:', template)
```

## Future Enhancements

### Planned Features

1. **Email Preferences**
   - User preference management
   - Opt-out mechanisms
   - Frequency controls

2. **Advanced Templates**
   - Dynamic content
   - Personalization
   - Multi-language support

3. **Analytics**
   - Open rate tracking
   - Click tracking
   - A/B testing

4. **Integration**
   - SMS notifications
   - Push notifications
   - Slack/Teams integration

### Performance Optimizations

1. **Queue System**
   - Background job processing
   - Retry mechanisms
   - Rate limiting

2. **Template Caching**
   - Pre-rendered templates
   - CDN delivery
   - Compression

3. **Batch Processing**
   - Bulk email sending
   - Rate limit optimization
   - Resource management

## Support

For issues or questions about the email notification system:

1. Check the logs for error messages
2. Verify configuration settings
3. Test with sample data
4. Review this documentation
5. Contact the development team

## Contributing

When contributing to the email notification system:

1. Follow the existing code structure
2. Add comprehensive tests
3. Update documentation
4. Test email templates thoroughly
5. Consider security implications 