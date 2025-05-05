import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

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
  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-card rounded-lg border border-border feature-card">
          <h3 className="text-lg font-semibold mb-2 text-gray-900">Active Clients</h3>
          <p className="text-3xl font-bold text-primary">0</p>
        </div>
        <div className="p-6 bg-card rounded-lg border border-border feature-card">
          <h3 className="text-lg font-semibold mb-2 text-gray-900">Today&apos;s SOS Calls</h3>
          <p className="text-3xl font-bold text-secondary">0</p>
        </div>
        <div className="p-6 bg-card rounded-lg border border-border feature-card">
          <h3 className="text-lg font-semibold mb-2 text-gray-900">Success Rate</h3>
          <p className="text-3xl font-bold text-accent">0%</p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="p-6 bg-card rounded-lg border border-border">
        <h3 className="text-lg font-semibold mb-4 text-gray-900">Recent Activity</h3>
        <div className="text-muted-foreground text-center py-8">
          No recent activity
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 bg-card rounded-lg border border-border">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">Quick Actions</h3>
          <div className="space-y-4">
            <button className="w-full p-4 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors">
              Add New Client
            </button>
            <button className="w-full p-4 bg-secondary/10 hover:bg-secondary/20 text-secondary rounded-lg transition-colors">
              Create Intervention Template
            </button>
          </div>
        </div>

        {/* Client Insights */}
        <div className="p-6 bg-card rounded-lg border border-border">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">Client Insights</h3>
          <div className="text-muted-foreground text-center py-8">
            Add clients to see insights
          </div>
        </div>
      </div>
    </div>
  )
}
