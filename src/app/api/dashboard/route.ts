import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDashboardStats, getRecentActivity, getClientInsights } from '@/lib/dashboard/queries'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get coach info
    const { data: coach, error: coachError } = await supabase
      .from('coaches')
      .select('id')
      .eq('id', user.id)
      .single()

    if (coachError || !coach) {
      return NextResponse.json({ error: 'Coach not found' }, { status: 404 })
    }

    // Fetch all dashboard data in parallel
    const [stats, activities, insights] = await Promise.all([
      getDashboardStats(coach.id),
      getRecentActivity(coach.id, 10),
      getClientInsights(coach.id)
    ])

    return NextResponse.json({
      stats,
      activities,
      insights
    })
  } catch (error) {
    console.error('Dashboard API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}