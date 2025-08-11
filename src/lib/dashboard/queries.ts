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

  // Get top performing interventions with a working approach
  const topInterventions: InsightData['topInterventions'] = []
  
  if (clientIdArray.length > 0) {
    // First get all client interventions with ratings
    const { data: interventionStats } = await supabase
      .from('client_interventions')
      .select('intervention_id, intervention_type, effectiveness_rating, times_used')
      .in('client_id', clientIdArray)
      .not('effectiveness_rating', 'is', null)

    if (interventionStats && interventionStats.length > 0) {
      const interventionMap = new Map()
      
      // Get intervention details for each type
      const cravingIds = interventionStats.filter(s => s.intervention_type === 'craving').map(s => s.intervention_id)
      const energyIds = interventionStats.filter(s => s.intervention_type === 'energy').map(s => s.intervention_id)
      
      const cravingPromise = cravingIds.length > 0 
        ? supabase.from('craving_interventions').select('id, name, success_rate').in('id', cravingIds)
        : Promise.resolve({ data: [] })
        
      const energyPromise = energyIds.length > 0
        ? supabase.from('energy_interventions').select('id, name, success_rate').in('id', energyIds)
        : Promise.resolve({ data: [] })
      
      const [{ data: cravingData }, { data: energyData }] = await Promise.all([cravingPromise, energyPromise])
      
      // Create lookup maps
      const interventionLookup = new Map()
      ;[...(cravingData || []), ...(energyData || [])].forEach(item => {
        interventionLookup.set(item.id, item)
      })
      
      // Process stats with intervention details
      interventionStats.forEach(stat => {
        const interventionData = interventionLookup.get(stat.intervention_id)
        
        if (interventionData) {
          const key = stat.intervention_id
          if (!interventionMap.has(key)) {
            interventionMap.set(key, {
              id: key,
              name: interventionData.name,
              successRate: Number(interventionData.success_rate) || 0,
              usageCount: 0
            })
          }
          
          const intervention = interventionMap.get(key)
          intervention.usageCount += stat.times_used || 0
        }
      })

      // Convert to array and sort
      topInterventions.push(...Array.from(interventionMap.values())
        .sort((a, b) => b.successRate - a.successRate)
        .slice(0, 5))
    }
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
        if (hour < 6) period = 'Late Night'
        else if (hour < 12) period = 'Morning'
        else if (hour < 18) period = 'Afternoon'
        else period = 'Evening'

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

  // Calculate most active day
  const { data: sessionDates } = await supabase
    .from('craving_incidents')
    .select('created_at')
    .in('client_id', clientIdArray)
    .not('created_at', 'is', null)

  const { data: movementDates } = await supabase
    .from('movement_incidents')
    .select('created_at')
    .in('client_id', clientIdArray)
    .not('created_at', 'is', null)

  const dayCount = new Map()
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  ;[...(sessionDates || []), ...(movementDates || [])].forEach(session => {
    const dayOfWeek = new Date(session.created_at).getDay()
    const dayName = dayNames[dayOfWeek]
    dayCount.set(dayName, (dayCount.get(dayName) || 0) + 1)
  })

  let mostActiveDay = 'No data'
  let maxCount = 0
  for (const [day, count] of dayCount.entries()) {
    if (count > maxCount) {
      maxCount = count
      mostActiveDay = day
    }
  }

  // Calculate average response time from coach messages
  // First get incident IDs for this coach's clients
  const { data: incidentIds } = await supabase
    .from('craving_incidents')
    .select('id')
    .in('client_id', clientIdArray)
  
  const { data: movementIncidentIds } = await supabase
    .from('movement_incidents')
    .select('id')
    .in('client_id', clientIdArray)

  const allIncidentIds = [
    ...(incidentIds?.map(i => i.id) || []),
    ...(movementIncidentIds?.map(i => i.id) || [])
  ]

  const { data: messages } = allIncidentIds.length > 0 ? await supabase
    .from('client_sos_messages')
    .select('created_at, sender_type')
    .in('incident_id', allIncidentIds)
    .order('created_at', { ascending: true }) : { data: null }

  let totalResponseTime = 0
  let responseCount = 0
  
  if (messages && messages.length > 1) {
    for (let i = 1; i < messages.length; i++) {
      const currentMessage = messages[i]
      const previousMessage = messages[i - 1]
      
      // If current is coach response to client message
      if (currentMessage.sender_type === 'coach' && previousMessage.sender_type === 'client') {
        const responseTime = new Date(currentMessage.created_at).getTime() - new Date(previousMessage.created_at).getTime()
        totalResponseTime += responseTime
        responseCount++
      }
    }
  }

  let averageResponseTime = 'No data'
  if (responseCount > 0) {
    const avgMinutes = Math.round(totalResponseTime / responseCount / 60000)
    if (avgMinutes < 1) averageResponseTime = '< 1 min'
    else if (avgMinutes < 60) averageResponseTime = `${avgMinutes} min`
    else averageResponseTime = `${Math.round(avgMinutes / 60)} hr`
  }

  const engagementTrends: InsightData['engagementTrends'] = {
    totalSessions: (totalSessions || 0) + (totalMovementSessions || 0),
    averageResponseTime,
    mostActiveDay
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