'use client'

import { formatDistanceToNow } from 'date-fns'
import { Clock, User, CheckCircle, TrendingUp, AlertCircle } from 'lucide-react'

export interface ActivityItem {
  id: string
  type: 'client_added' | 'session_completed' | 'intervention_rated' | 'milestone' | 'alert'
  title: string
  description: string
  timestamp: Date
  clientName?: string
}

interface ActivityFeedProps {
  activities: ActivityItem[]
  loading?: boolean
}

function getActivityIcon(type: ActivityItem['type']) {
  switch (type) {
    case 'client_added':
      return <User className="h-4 w-4 text-blue-500" />
    case 'session_completed':
      return <CheckCircle className="h-4 w-4 text-green-500" />
    case 'intervention_rated':
      return <TrendingUp className="h-4 w-4 text-purple-500" />
    case 'milestone':
      return <CheckCircle className="h-4 w-4 text-yellow-500" />
    case 'alert':
      return <AlertCircle className="h-4 w-4 text-red-500" />
    default:
      return <Clock className="h-4 w-4 text-gray-500" />
  }
}

function ActivityItemComponent({ activity }: { activity: ActivityItem }) {
  return (
    <div className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
      <div className="flex-shrink-0 mt-0.5">
        {getActivityIcon(activity.type)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">{activity.title}</p>
            <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
            {activity.clientName && (
              <p className="text-xs text-blue-600 mt-1">Client: {activity.clientName}</p>
            )}
          </div>
          <div className="flex-shrink-0 ml-4">
            <p className="text-xs text-gray-500">
              {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ActivityFeed({ activities, loading = false }: ActivityFeedProps) {
  if (loading) {
    return (
      <div className="p-6 bg-card rounded-lg border border-border">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
          <p className="text-sm text-gray-600 mt-1">Latest client interactions and session completions</p>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-start space-x-3">
                <div className="w-4 h-4 bg-gray-200 rounded-full flex-shrink-0 mt-0.5"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="w-16 h-3 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-card rounded-lg border border-border">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
        <p className="text-sm text-gray-600 mt-1">Latest client interactions and session completions</p>
      </div>
      {activities.length === 0 ? (
        <div className="text-muted-foreground text-center py-8">
          No recent activity
        </div>
      ) : (
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {activities.map((activity) => (
            <ActivityItemComponent key={activity.id} activity={activity} />
          ))}
        </div>
      )}
    </div>
  )
}