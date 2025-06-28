import { NextRequest, NextResponse } from 'next/server'
import { NotificationService } from '@/lib/notifications'

export async function POST(request: NextRequest) {
  try {
    // Verify the request is from a legitimate cron service
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('Starting daily reminder cron job...')

    // Send reminders for flights in 1, 2, and 7 days
    const results = []
    
    for (const days of [1, 2, 7]) {
      try {
        const success = await NotificationService.sendReminder(days)
        results.push({ days, success })
        console.log(`Reminders for ${days} day(s) sent: ${success}`)
      } catch (error) {
        console.error(`Error sending ${days}-day reminders:`, error)
        results.push({ days, success: false, error: error instanceof Error ? error.message : 'Unknown error' })
      }
    }

    const successCount = results.filter(r => r.success).length
    const totalCount = results.length

    console.log(`Daily reminder cron job completed: ${successCount}/${totalCount} successful`)

    return NextResponse.json({
      success: true,
      message: `Daily reminders sent: ${successCount}/${totalCount} successful`,
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error in daily reminder cron job:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Also support GET for manual testing
export async function GET(request: NextRequest) {
  return await POST(request)
} 