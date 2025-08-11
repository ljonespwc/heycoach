import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDashboardStats } from '@/lib/dashboard/queries'

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

    const stats = await getDashboardStats(coach.id)

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Dashboard stats API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    )
  }
}