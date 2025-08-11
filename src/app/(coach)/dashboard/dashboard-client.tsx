'use client'

import { useEffect, useState } from 'react'
import { StatCard } from '@/components/dashboard/stat-card'
import { ActivityFeed } from '@/components/dashboard/activity-feed'
import { ClientInsights } from '@/components/dashboard/client-insights'
import type { ActivityItem } from '@/components/dashboard/activity-feed'
import type { InsightData } from '@/components/dashboard/client-insights'

interface DashboardStats {
  activeClients: number
  todaySOSCalls: number
  successRate: number
}

interface DashboardData {
  stats: DashboardStats
  activities: ActivityItem[]
  insights: InsightData | null
}

export function DashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const response = await fetch('/api/dashboard')
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data')
        }
        const dashboardData = await response.json()
        setData(dashboardData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  if (error) {
    return (
      <div className="space-y-6">
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-lg font-semibold text-red-800 mb-2">Error loading dashboard</h3>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Active Clients"
          value={data?.stats.activeClients || 0}
          loading={loading}
          valueColor="text-primary"
        />
        <StatCard
          title="Today's SOS Calls"
          value={data?.stats.todaySOSCalls || 0}
          loading={loading}
          valueColor="text-secondary"
        />
        <StatCard
          title="Success Rate"
          value={data?.stats ? `${data.stats.successRate}%` : '0%'}
          loading={loading}
          valueColor="text-accent"
        />
      </div>

      {/* Recent Activity */}
      <ActivityFeed
        activities={data?.activities || []}
        loading={loading}
      />

      {/* Client Insights - Full Width */}
      <ClientInsights
        data={data?.insights || undefined}
        loading={loading}
      />

      {/* Quick Actions - Compact Row */}
      <div className="p-4 bg-card rounded-lg border border-border">
        <h3 className="text-lg font-semibold mb-3 text-gray-900">Quick Actions</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <button className="flex-1 p-3 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors text-sm font-medium">
            Add New Client
          </button>
          <button className="flex-1 p-3 bg-secondary/10 hover:bg-secondary/20 text-secondary rounded-lg transition-colors text-sm font-medium">
            Create Intervention Template
          </button>
        </div>
      </div>
    </div>
  )
}