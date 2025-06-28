"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { NotificationService } from "@/lib/notifications";
import Header from "@/components/Header";

interface NotificationStats {
  total: number;
  sent: number;
  failed: number;
  byType: Record<string, number>;
  byDate: Record<string, number>;
}

interface EmailNotification {
  id: string;
  booking_id: string;
  type: string;
  recipient_email: string;
  sent_at: string;
  status: string;
  metadata?: any;
}

export default function NotificationsAdminPage() {
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [recentNotifications, setRecentNotifications] = useState<EmailNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingReminders, setSendingReminders] = useState(false);
  const [resendingFailed, setResendingFailed] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load notification stats
      const notificationStats = await NotificationService.getNotificationStats();
      setStats(notificationStats);

      // Load recent notifications
      const { data: notifications, error } = await supabase
        .from('email_notifications')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(20);

      if (!error && notifications) {
        setRecentNotifications(notifications);
      }
    } catch (error) {
      console.error('Error loading notification data:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendDailyReminders = async () => {
    try {
      setSendingReminders(true);
      const results = await NotificationService.sendReminder(1);
      console.log('Daily reminders sent:', results);
      await loadData(); // Refresh data
      alert('Daily reminders sent successfully!');
    } catch (error) {
      console.error('Error sending daily reminders:', error);
      alert('Failed to send daily reminders');
    } finally {
      setSendingReminders(false);
    }
  };

  const resendFailedNotifications = async () => {
    try {
      setResendingFailed(true);
      const resentCount = await NotificationService.resendFailedNotifications();
      console.log('Resent notifications:', resentCount);
      await loadData(); // Refresh data
      alert(`Resent ${resentCount} failed notifications`);
    } catch (error) {
      console.error('Error resending failed notifications:', error);
      alert('Failed to resend notifications');
    } finally {
      setResendingFailed(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'text-green-600 bg-green-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      case 'resent':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'booking_confirmation':
        return '🎉';
      case 'flight_update':
        return '✈️';
      case 'reminder':
        return '⏰';
      default:
        return '📧';
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading notification data...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Email Notifications</h1>
            <p className="text-gray-600">Manage and monitor email notifications</p>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <span className="text-2xl">📊</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Notifications</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <span className="text-2xl">✅</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Sent Successfully</p>
                    <p className="text-2xl font-bold text-green-600">{stats.sent}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <span className="text-2xl">❌</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Failed</p>
                    <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <span className="text-2xl">📈</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Success Rate</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {stats.total > 0 ? Math.round((stats.sent / stats.total) * 100) : 0}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={sendDailyReminders}
                disabled={sendingReminders}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center"
              >
                {sendingReminders ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <span className="mr-2">⏰</span>
                    Send Daily Reminders
                  </>
                )}
              </button>

              <button
                onClick={resendFailedNotifications}
                disabled={resendingFailed}
                className="bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center"
              >
                {resendingFailed ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Resending...
                  </>
                ) : (
                  <>
                    <span className="mr-2">🔄</span>
                    Resend Failed
                  </>
                )}
              </button>

              <button
                onClick={loadData}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 flex items-center"
              >
                <span className="mr-2">🔄</span>
                Refresh Data
              </button>
            </div>
          </div>

          {/* Recent Notifications */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Notifications</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Recipient
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sent At
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Booking ID
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentNotifications.map((notification) => (
                    <tr key={notification.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="mr-2">{getTypeIcon(notification.type)}</span>
                          <span className="text-sm font-medium text-gray-900">
                            {notification.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{notification.recipient_email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(notification.status)}`}>
                          {notification.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(notification.sent_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {notification.booking_id}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 