import { supabase } from './supabase'

export interface NotificationOptions {
  bookingId?: string
  flightId?: string
  daysUntilFlight?: number
  oldStatus?: string
  newStatus?: string
}

export class NotificationService {
  /**
   * Send booking confirmation email
   */
  static async sendBookingConfirmation(bookingId: string): Promise<boolean> {
    try {
      const response = await fetch('/api/notifications/booking-confirmation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bookingId }),
      })

      const result = await response.json()
      return result.success
    } catch (error) {
      console.error('Error sending booking confirmation:', error)
      return false
    }
  }

  /**
   * Send flight update notification
   */
  static async sendFlightUpdate(
    flightId: string,
    oldStatus: string,
    newStatus: string
  ): Promise<boolean> {
    try {
      const response = await fetch('/api/notifications/flight-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ flightId, oldStatus, newStatus }),
      })

      const result = await response.json()
      return result.success
    } catch (error) {
      console.error('Error sending flight update:', error)
      return false
    }
  }

  /**
   * Send flight reminder notification
   */
  static async sendReminder(daysUntilFlight: number = 1): Promise<boolean> {
    try {
      const response = await fetch('/api/notifications/reminder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ daysUntilFlight }),
      })

      const result = await response.json()
      return result.success
    } catch (error) {
      console.error('Error sending reminder:', error)
      return false
    }
  }

  /**
   * Get notification history for a booking
   */
  static async getNotificationHistory(bookingId: string) {
    try {
      const { data, error } = await supabase
        .from('email_notifications')
        .select('*')
        .eq('booking_id', bookingId)
        .order('sent_at', { ascending: false })

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching notification history:', error)
      return []
    }
  }

  /**
   * Get notification statistics
   */
  static async getNotificationStats() {
    try {
      const { data, error } = await supabase
        .from('email_notifications')
        .select('type, status, sent_at')

      if (error) throw error

      const stats = {
        total: data.length,
        sent: data.filter(n => n.status === 'sent').length,
        failed: data.filter(n => n.status === 'failed').length,
        byType: {} as Record<string, number>,
        byDate: {} as Record<string, number>,
      }

      // Count by type
      data.forEach(notification => {
        stats.byType[notification.type] = (stats.byType[notification.type] || 0) + 1
      })

      // Count by date
      data.forEach(notification => {
        const date = new Date(notification.sent_at).toISOString().split('T')[0]
        stats.byDate[date] = (stats.byDate[date] || 0) + 1
      })

      return stats
    } catch (error) {
      console.error('Error fetching notification stats:', error)
      return null
    }
  }

  /**
   * Resend failed notifications
   */
  static async resendFailedNotifications(): Promise<number> {
    try {
      // Get failed notifications from the last 24 hours
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)

      const { data: failedNotifications, error } = await supabase
        .from('email_notifications')
        .select('*')
        .eq('status', 'failed')
        .gte('sent_at', yesterday.toISOString())

      if (error) throw error

      let resentCount = 0

      for (const notification of failedNotifications || []) {
        let success = false

        switch (notification.type) {
          case 'booking_confirmation':
            success = await this.sendBookingConfirmation(notification.booking_id)
            break
          case 'flight_update':
            if (notification.metadata) {
              success = await this.sendFlightUpdate(
                notification.metadata.flightId,
                notification.metadata.oldStatus,
                notification.metadata.newStatus
              )
            }
            break
          case 'reminder':
            if (notification.metadata) {
              success = await this.sendReminder(notification.metadata.daysUntilFlight)
            }
            break
        }

        if (success) {
          // Update the notification status
          await supabase
            .from('email_notifications')
            .update({ status: 'resent', resent_at: new Date().toISOString() })
            .eq('id', notification.id)

          resentCount++
        }
      }

      return resentCount
    } catch (error) {
      console.error('Error resending failed notifications:', error)
      return 0
    }
  }
}

// Utility functions for common notification patterns
export const Notifications = {
  /**
   * Send notification when a booking is created
   */
  onBookingCreated: async (bookingId: string) => {
    return await NotificationService.sendBookingConfirmation(bookingId)
  },

  /**
   * Send notification when flight status changes
   */
  onFlightStatusChanged: async (
    flightId: string,
    oldStatus: string,
    newStatus: string
  ) => {
    return await NotificationService.sendFlightUpdate(flightId, oldStatus, newStatus)
  },

  /**
   * Send daily reminders for upcoming flights
   */
  sendDailyReminders: async () => {
    const results = []
    
    // Send reminders for flights in 1, 2, and 7 days
    for (const days of [1, 2, 7]) {
      const success = await NotificationService.sendReminder(days)
      results.push({ days, success })
    }
    
    return results
  },

  /**
   * Send weekly reminder for flights in 7 days
   */
  sendWeeklyReminders: async () => {
    return await NotificationService.sendReminder(7)
  },
} 