'use client'

import { TrendingUp, Clock, Users, Target } from 'lucide-react'

export interface InsightData {
  topInterventions: Array<{
    id: string
    name: string
    successRate: number
    usageCount: number
  }>
  strugglesData: Array<{
    timeOfDay: string
    count: number
    type: 'craving' | 'energy'
  }>
  engagementTrends: {
    totalSessions: number
    averageResponseTime: string
    mostActiveDay: string
  }
  riskIndicators: Array<{
    clientName: string
    risk: 'high' | 'medium' | 'low'
    reason: string
  }>
}

interface ClientInsightsProps {
  data?: InsightData
  loading?: boolean
}

function TopInterventionsWidget({ interventions }: { interventions: InsightData['topInterventions'] }) {
  if (interventions.length === 0) {
    return <p className="text-sm text-gray-500">No intervention data available</p>
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2 mb-3">
        <Target className="h-4 w-4 text-green-600" />
        <h4 className="text-sm font-medium text-gray-900">Top Performing Interventions</h4>
      </div>
      {interventions.slice(0, 3).map((intervention) => (
        <div key={intervention.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">{intervention.name}</p>
            <p className="text-xs text-gray-500">{intervention.usageCount} uses</p>
          </div>
          <div className="text-right">
            <span className={`text-sm font-semibold ${
              intervention.successRate >= 80 ? 'text-green-600' :
              intervention.successRate >= 60 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {Math.round(intervention.successRate)}%
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

function StrugglePatterns({ struggles }: { struggles: InsightData['strugglesData'] }) {
  if (struggles.length === 0) {
    return <p className="text-sm text-gray-500">No pattern data available</p>
  }

  const totalStruggles = struggles.reduce((sum, item) => sum + item.count, 0)

  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2 mb-3">
        <Clock className="h-4 w-4 text-blue-600" />
        <h4 className="text-sm font-medium text-gray-900">Common Struggle Times</h4>
      </div>
      {struggles.slice(0, 4).map((struggle, index) => {
        const percentage = Math.round((struggle.count / totalStruggles) * 100)
        return (
          <div key={`${struggle.timeOfDay}-${struggle.type}-${index}`} className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-700">{struggle.timeOfDay}</span>
              <div className="flex items-center space-x-2">
                <span className={`inline-block w-2 h-2 rounded-full ${
                  struggle.type === 'craving' ? 'bg-purple-500' : 'bg-orange-500'
                }`}></span>
                <span className="text-xs text-gray-500">{struggle.count} ({percentage}%)</span>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1">
              <div 
                className={`h-1 rounded-full ${
                  struggle.type === 'craving' ? 'bg-purple-500' : 'bg-orange-500'
                }`}
                style={{ width: `${percentage}%` }}
              ></div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function EngagementStats({ trends }: { trends: InsightData['engagementTrends'] }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2 mb-3">
        <TrendingUp className="h-4 w-4 text-purple-600" />
        <h4 className="text-sm font-medium text-gray-900">Engagement Overview</h4>
      </div>
      <div className="grid grid-cols-1 gap-3">
        <div className="p-3 bg-gray-50 rounded-md">
          <div className="text-2xl font-bold text-purple-600">{trends.totalSessions}</div>
          <div className="text-xs text-gray-500">Total SOS Sessions</div>
        </div>
        <div className="p-3 bg-gray-50 rounded-md">
          <div className="text-sm font-medium text-gray-900">{trends.averageResponseTime}</div>
          <div className="text-xs text-gray-500">Avg Response Time</div>
        </div>
        <div className="p-3 bg-gray-50 rounded-md">
          <div className="text-sm font-medium text-gray-900">{trends.mostActiveDay}</div>
          <div className="text-xs text-gray-500">Most Active Day</div>
        </div>
      </div>
    </div>
  )
}

function RiskIndicators({ risks }: { risks: InsightData['riskIndicators'] }) {
  if (risks.length === 0) {
    return <p className="text-sm text-gray-500">No risk indicators</p>
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2 mb-3">
        <Users className="h-4 w-4 text-red-600" />
        <h4 className="text-sm font-medium text-gray-900">Client Risk Indicators</h4>
      </div>
      {risks.slice(0, 3).map((risk, index) => (
        <div key={`${risk.clientName}-${risk.risk}-${index}`} className="p-2 bg-gray-50 rounded-md">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-900">{risk.clientName}</span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              risk.risk === 'high' ? 'bg-red-100 text-red-800' :
              risk.risk === 'medium' ? 'bg-yellow-100 text-yellow-800' :
              'bg-green-100 text-green-800'
            }`}>
              {risk.risk} risk
            </span>
          </div>
          <p className="text-xs text-gray-600">{risk.reason}</p>
        </div>
      ))}
    </div>
  )
}

export function ClientInsights({ data, loading = false }: ClientInsightsProps) {
  if (loading) {
    return (
      <div className="p-6 bg-card rounded-lg border border-border">
        <h3 className="text-lg font-semibold mb-4 text-gray-900">Client Insights</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-3 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                <div className="h-3 bg-gray-200 rounded w-4/6"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-6 bg-card rounded-lg border border-border">
        <h3 className="text-lg font-semibold mb-4 text-gray-900">Client Insights</h3>
        <div className="text-muted-foreground text-center py-8">
          Add clients to see insights
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-card rounded-lg border border-border">
      <h3 className="text-lg font-semibold mb-4 text-gray-900">Client Insights</h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopInterventionsWidget interventions={data.topInterventions} />
        <StrugglePatterns struggles={data.strugglesData} />
        <EngagementStats trends={data.engagementTrends} />
        <RiskIndicators risks={data.riskIndicators} />
      </div>
    </div>
  )
}