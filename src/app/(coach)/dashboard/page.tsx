import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardClient } from './dashboard-client'

export const metadata: Metadata = {
  title: 'Dashboard | HeyCoach',
  description: 'Your coaching dashboard',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return redirect('/auth/login')
  }

  return <DashboardClient />
}
