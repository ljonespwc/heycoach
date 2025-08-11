import { createClient } from '@/lib/supabase/server'
import type { ActivityItem } from '@/components/dashboard/activity-feed'
import type { InsightData } from '@/components/dashboard/client-insights'

export interface DashboardStats {
  activeClients: number
  todaySOSCalls: number
  successRate: number
}

// Get basic dashboard statistics
export async function getDashboardStats(coachId: string): Promise<DashboardStats> {
  const supabase = await createClient()
  
  // Get active clients count
  const { count: activeClients } = await supabase
    .from('clients')
    .select('*', { count: 'exact', head: true })
    .eq('coach_id', coachId)
    .eq('status', 'active')

  // Get today's SOS calls (both craving and movement incidents)
  const today = new Date().toISOString().split('T')[0]
  
  // First get client IDs for this coach
  const { data: clientIds } = await supabase
    .from('clients')
    .select('id')
    .eq('coach_id', coachId)
  
  const clientIdArray = clientIds?.map(client => client.id) || []
  
  let cravingIncidents = 0
  let movementIncidents = 0
  
  if (clientIdArray.length > 0) {
    const { count: cravingCount } = await supabase
      .from('craving_incidents')
      .select('client_id', { count: 'exact', head: true })
      .gte('created_at', `${today}T00:00:00.000Z`)
      .lt('created_at', `${today}T23:59:59.999Z`)
      .in('client_id', clientIdArray)

    const { count: movementCount } = await supabase
      .from('movement_incidents')
      .select('client_id', { count: 'exact', head: true })
      .gte('created_at', `${today}T00:00:00.000Z`)
      .lt('created_at', `${today}T23:59:59.999Z`)
      .in('client_id', clientIdArray)
    
    cravingIncidents = cravingCount || 0
    movementIncidents = movementCount || 0
  }

  const todaySOSCalls = cravingIncidents + movementIncidents

  // Calculate overall success rate from completed interventions
  let completedInterventions = null
  if (clientIdArray.length > 0) {
    const { data } = await supabase
      .from('client_interventions')
      .select('effectiveness_rating')
      .not('effectiveness_rating', 'is', null)
      .in('client_id', clientIdArray)
    
    completedInterventions = data
  }

  let successRate = 0
  if (completedInterventions && completedInterventions.length > 0) {
    const effectiveInterventions = completedInterventions.filter(
      intervention => intervention.effectiveness_rating >= 7
    ).length
    successRate = Math.round((effectiveInterventions / completedInterventions.length) * 100)
  }

  return {
    activeClients: activeClients || 0,
    todaySOSCalls,
    successRate
  }
}

// Get recent activity feed
export async function getRecentActivity(coachId: string, limit = 10): Promise<ActivityItem[]> {
  const supabase = await createClient()
  const activities: ActivityItem[] = []

  // First get client IDs for this coach
  const { data: clientIds } = await supabase
    .from('clients')
    .select('id')
    .eq('coach_id', coachId)
  
  const clientIdArray = clientIds?.map(client => client.id) || []

  // Get recent client additions
  const { data: newClients } = await supabase
    .from('clients')
    .select('id, full_name, created_at')
    .eq('coach_id', coachId)
    .order('created_at', { ascending: false })
    .limit(5)

  if (newClients) {
    newClients.forEach(client => {
      activities.push({
        id: `client-${client.id}`,
        type: 'client_added',
        title: 'New client added',
        description: `${client.full_name || 'New client'} joined your coaching program`,
        timestamp: new Date(client.created_at),
        clientName: client.full_name || 'New client'
      })
    })
  }

  // Get recent completed craving incidents
  if (clientIdArray.length > 0) {
    const { data: recentCravingIncidents } = await supabase
      .from('craving_incidents')
      .select(`
        id, 
        resolved_at, 
        result_rating,
        client_id
      `)
      .not('resolved_at', 'is', null)
      .in('client_id', clientIdArray)
      .order('resolved_at', { ascending: false })
      .limit(5)

    if (recentCravingIncidents) {
      // Get client names for the incidents
      const { data: clientsData } = await supabase
        .from('clients')
        .select('id, full_name')
        .in('id', recentCravingIncidents.map(i => i.client_id))

      const clientNameMap = new Map(clientsData?.map(c => [c.id, c.full_name]) || [])

      recentCravingIncidents.forEach(incident => {
        activities.push({
          id: `craving-${incident.id}`,
          type: 'session_completed',
          title: 'Craving SOS completed',
          description: `Session completed with effectiveness rating: ${incident.result_rating}/10`,
          timestamp: new Date(incident.resolved_at),
          clientName: clientNameMap.get(incident.client_id) || 'Client'
        })
      })
    }

    // Get recent completed movement incidents
    const { data: recentMovementIncidents } = await supabase
      .from('movement_incidents')
      .select(`
        id, 
        resolved_at, 
        result_rating,
        client_id
      `)
      .not('resolved_at', 'is', null)
      .in('client_id', clientIdArray)
      .order('resolved_at', { ascending: false })
      .limit(5)

    if (recentMovementIncidents) {
      // Get client names for the movement incidents
      const { data: movementClientsData } = await supabase
        .from('clients')
        .select('id, full_name')
        .in('id', recentMovementIncidents.map(i => i.client_id))

      const movementClientNameMap = new Map(movementClientsData?.map(c => [c.id, c.full_name]) || [])

      recentMovementIncidents.forEach(incident => {
        activities.push({
          id: `movement-${incident.id}`,
          type: 'session_completed',
          title: 'Energy Boost completed',
          description: `Session completed with effectiveness rating: ${incident.result_rating}/10`,
          timestamp: new Date(incident.resolved_at),
          clientName: movementClientNameMap.get(incident.client_id) || 'Client'
        })
      })
    }
  }

  // Sort by timestamp and limit
  return activities
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, limit)
}

// Get client insights data
export async function getClientInsights(coachId: string): Promise<InsightData | null> {
  const supabase = await createClient()

  // Check if coach has any clients
  const { data: clientIds } = await supabase
    .from('clients')
    .select('id')
    .eq('coach_id', coachId)

  const clientIdArray = clientIds?.map(client => client.id) || []

  if (clientIdArray.length === 0) {
    return null
  }

  // Get top performing interventions
  const { data: interventionStats } = await supabase
    .from('client_interventions')
    .select(`
      intervention_id,
      intervention_type,
      effectiveness_rating,
      times_used,
      craving_interventions(name, success_rate),
      energy_interventions(name, success_rate)
    `)
    .in('client_id', clientIdArray)
    .not('effectiveness_rating', 'is', null)

  const topInterventions: InsightData['topInterventions'] = []
  if (interventionStats) {
    const interventionMap = new Map()
    
    interventionStats.forEach(stat => {
      const interventionData = stat.intervention_type === 'craving' 
        ? (Array.isArray(stat.craving_interventions) ? stat.craving_interventions[0] : stat.craving_interventions)
        : (Array.isArray(stat.energy_interventions) ? stat.energy_interventions[0] : stat.energy_interventions)
      
      if (interventionData && interventionData.name) {
        const key = stat.intervention_id
        if (!interventionMap.has(key)) {
          interventionMap.set(key, {
            id: key,
            name: interventionData.name,
            successRate: interventionData.success_rate || 0,
            usageCount: 0,
            totalRating: 0,
            ratingCount: 0
          })
        }
        
        const intervention = interventionMap.get(key)
        intervention.usageCount += stat.times_used || 0
        if (stat.effectiveness_rating) {
          intervention.totalRating += stat.effectiveness_rating
          intervention.ratingCount += 1
        }
      }
    })

    // Convert to array and sort by success rate
    topInterventions.push(...Array.from(interventionMap.values())
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, 5))
  }

  // Get struggle patterns by time of day
  const strugglesData: InsightData['strugglesData'] = []
  
  // Get craving incidents by time
  const { data: cravingTimeData } = await supabase
    .from('craving_incidents')
    .select('time_of_day')
    .in('client_id', clientIdArray)
    .not('time_of_day', 'is', null)

  // Get movement incidents by time  
  const { data: movementTimeData } = await supabase
    .from('movement_incidents')
    .select('time_of_day')
    .in('client_id', clientIdArray)
    .not('time_of_day', 'is', null)

  // Process time data into time periods
  const timeMap = new Map()
  
  const processTimeData = (data: Array<{ time_of_day: string }> | null, type: 'craving' | 'energy') => {
    if (data) {
      data.forEach(item => {
        const hour = parseInt(item.time_of_day.split(':')[0])
        let period: string
        if (hour < 6) period = 'Late Night (12-6 AM)'
        else if (hour < 12) period = 'Morning (6 AM-12 PM)'
        else if (hour < 18) period = 'Afternoon (12-6 PM)'
        else period = 'Evening (6 PM-12 AM)'

        const key = `${period}-${type}`
        timeMap.set(key, (timeMap.get(key) || 0) + 1)
      })
    }
  }

  processTimeData(cravingTimeData, 'craving')
  processTimeData(movementTimeData, 'energy')

  // Convert to array format
  for (const [key, count] of timeMap.entries()) {
    const [timeOfDay, type] = key.split('-')
    strugglesData.push({
      timeOfDay,
      count,
      type: type as 'craving' | 'energy'
    })
  }

  strugglesData.sort((a, b) => b.count - a.count)

  // Get engagement trends
  const { count: totalSessions } = await supabase
    .from('craving_incidents')
    .select('*', { count: 'exact', head: true })
    .in('client_id', clientIdArray)

  const { count: totalMovementSessions } = await supabase
    .from('movement_incidents')
    .select('*', { count: 'exact', head: true })
    .in('client_id', clientIdArray)

  const engagementTrends: InsightData['engagementTrends'] = {
    totalSessions: (totalSessions || 0) + (totalMovementSessions || 0),
    averageResponseTime: '< 2 min', // Placeholder - would need message timestamps to calculate
    mostActiveDay: 'Tuesday' // Placeholder - would need day analysis
  }

  // Get risk indicators (simplified version)
  const riskIndicators: InsightData['riskIndicators'] = []
  
  const { data: clientRiskData } = await supabase
    .from('clients')
    .select(`
      id,
      full_name,
      created_at,
      craving_incidents(result_rating, created_at),
      movement_incidents(result_rating, created_at)
    `)
    .eq('coach_id', coachId)
    .eq('status', 'active')

  if (clientRiskData) {
    clientRiskData.forEach(client => {
      const allIncidents = [
        ...(client.craving_incidents || []),
        ...(client.movement_incidents || [])
      ]
      
      if (allIncidents.length > 0) {
        const recentIncidents = allIncidents
          .filter(incident => incident.result_rating !== null)
          .slice(-5) // Last 5 incidents
        
        if (recentIncidents.length >= 3) {
          const avgRating = recentIncidents.reduce((sum, incident) => 
            sum + incident.result_rating, 0) / recentIncidents.length
          
          if (avgRating < 5) {
            riskIndicators.push({
              clientName: client.full_name || 'Unnamed Client',
              risk: 'high',
              reason: `Low effectiveness ratings (avg: ${avgRating.toFixed(1)}/10)`
            })
          } else if (avgRating < 7) {
            riskIndicators.push({
              clientName: client.full_name || 'Unnamed Client',
              risk: 'medium',
              reason: `Moderate effectiveness ratings (avg: ${avgRating.toFixed(1)}/10)`
            })
          }
        }
      }
    })
  }

  return {
    topInterventions,
    strugglesData,
    engagementTrends,
    riskIndicators
  }
}