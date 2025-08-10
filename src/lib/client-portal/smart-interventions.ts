import { Intervention } from './craving-types';

interface SmartInterventionContext {
  clientName: string;
  cravingType: string; // For craving: food type, for energy: blocker type
  intensity: number; // For craving: craving intensity, for energy: energy level
  location: string;
  trigger: string; // For craving: trigger context, for energy: activity goal/preference
  timeOfDay: string;
  dayOfWeek: string;
  interventionType?: 'craving' | 'energy'; // New field to distinguish context type
  availableInterventions: Intervention[];
  previousEffectiveness?: Array<{
    interventionId: string;
    interventionName: string;
    effectiveness: number; // 1-10 rating
    context: string; // Similar context where it was used
    timesSuggested: number;
    lastSuggestedAt: string | null;
    recentlySuggested: boolean;
  }>;
}

interface SmartInterventionResponse {
  primaryIntervention: Intervention;
  secondaryIntervention: Intervention;
  reasoning: string;
}

/**
 * Use AI to intelligently select primary and secondary interventions
 * based on client context, craving details, and previous effectiveness
 */
export async function selectSmartInterventions(context: SmartInterventionContext): Promise<SmartInterventionResponse> {
  try {
    const response = await fetch('/api/ai/smart-interventions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(context)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown API error' }));
      throw new Error(`Smart intervention API error: ${errorData.error || response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.primaryIntervention || !data.secondaryIntervention) {
      throw new Error('Invalid response from smart intervention API');
    }

    return data;
  } catch (error) {
    console.error('❌ Smart intervention selection failed:', error);
    throw error;
  }
}

/**
 * Get previous effectiveness data for interventions from database
 */
export async function getPreviousEffectiveness(clientId: string, context: {
  cravingType?: string;
  location?: string;
  trigger?: string;
  interventionType?: 'craving' | 'energy';
}): Promise<Array<{
  interventionId: string;
  interventionName: string;
  effectiveness: number;
  context: string;
  timesSuggested: number;
  lastSuggestedAt: string | null;
  recentlySuggested: boolean;
}>> {
  if (!clientId) return [];
  
  try {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    
    const isEnergyContext = context.interventionType === 'energy';
    
    // Query client_interventions with effectiveness ratings and suggestion data
    const { data: clientInterventions, error: clientError } = await supabase
      .from('client_interventions')
      .select(`
        intervention_id,
        effectiveness_rating,
        last_used_at,
        times_used
      `)
      .eq('client_id', clientId)
      .eq('intervention_type', isEnergyContext ? 'energy' : 'craving')
      .not('effectiveness_rating', 'is', null)
      .gte('effectiveness_rating', 1) // Only include rated interventions
      .order('last_used_at', { ascending: false });
    
    if (clientError || !clientInterventions) {
      console.log('No client interventions with effectiveness data found');
      return [];
    }

    // Get intervention names and match with similar contexts
    const interventionIds = clientInterventions.map(ci => ci.intervention_id);
    
    if (interventionIds.length === 0) return [];
    
    // Get intervention names from the appropriate intervention table
    const interventionTable = isEnergyContext ? 'energy_interventions' : 'craving_interventions';
    const { data: interventions, error: interventionError } = await supabase
      .from(interventionTable)
      .select('id, name, description')
      .in('id', interventionIds);
      
    if (interventionError || !interventions) {
      console.log('Error fetching intervention details');
      return [];
    }
    
    // Get recent incident data for contextual matching
    const incidentTable = isEnergyContext ? 'movement_incidents' : 'craving_incidents';
    const contextField = isEnergyContext ? 'blocker_type' : 'trigger_food';
    const locationField = 'location';
    
    const { data: recentIncidents } = await supabase
      .from(incidentTable)
      .select(`
        intervention_id,
        ${contextField},
        ${locationField},
        context,
        created_at
      `)
      .eq('client_id', clientId)
      .not('intervention_id', 'is', null)
      .in('intervention_id', interventionIds)
      .order('created_at', { ascending: false })
      .limit(50); // Get recent usage contexts
    
    // Build effectiveness data with context matching
    const effectivenessData = clientInterventions
      .map(clientIntervention => {
        const intervention = interventions.find(i => i.id === clientIntervention.intervention_id);
        if (!intervention) return null;
        
        // Find related incidents for context
        const relatedIncidents = recentIncidents?.filter(
          inc => inc.intervention_id === clientIntervention.intervention_id
        ) || [];
        
        // Build context description
        let contextDescription = '';
        if (relatedIncidents.length > 0) {
          const incident = relatedIncidents[0]; // Most recent
          const contexts = [];
          
          const contextValue = isEnergyContext ? 
            (incident as Record<string, unknown>).blocker_type : 
            (incident as Record<string, unknown>).trigger_food;
          
          if (contextValue) {
            contexts.push(isEnergyContext ? `${contextValue} blocker` : `${contextValue} craving`);
          }
          if (incident.location) {
            contexts.push(`at ${incident.location}`);
          }
          if (incident.context) {
            contexts.push(incident.context);
          }
          
          contextDescription = contexts.join(', ') || 'general usage';
        } else {
          contextDescription = 'general usage';
        }
        
        // Calculate if recently suggested (within last 7 days)
        const now = new Date();
        const lastUsed = clientIntervention.last_used_at ? new Date(clientIntervention.last_used_at) : null;
        const daysSinceLastSuggestion = lastUsed ? 
          (now.getTime() - lastUsed.getTime()) / (1000 * 60 * 60 * 24) : Infinity;
        const recentlySuggested = daysSinceLastSuggestion <= 7; // Suggested within last week
        
        return {
          interventionId: clientIntervention.intervention_id,
          interventionName: intervention.name,
          effectiveness: clientIntervention.effectiveness_rating,
          context: contextDescription,
          timesSuggested: clientIntervention.times_used || 0,
          lastSuggestedAt: clientIntervention.last_used_at,
          recentlySuggested: recentlySuggested
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => b.effectiveness - a.effectiveness); // Sort by effectiveness descending
    
    console.log(`Found ${effectivenessData.length} previous effectiveness records for client:`, clientId);
    return effectivenessData;
    
  } catch (error) {
    console.error('Error getting previous effectiveness:', error);
    return [];
  }
}

/**
 * Filter interventions by location appropriateness
 * Includes interventions that are either location-specific OR universal
 */
export function filterInterventionsByLocation(interventions: Intervention[], location: string): Intervention[] {
  // Map location names to database tag values
  const locationMapping: { [key: string]: string } = {
    'Home': 'home',
    'Work': 'work', 
    'Car': 'car',
    'Store': 'store',
    'Restaurant': 'restaurant',
    'Gym': 'gym',
    "Friend's house": 'social',
    'Hotel/Travel': 'travel',
    'Outdoors': 'outdoors',
    'Car/Transit': 'car',
    'Public space': 'public'
  };

  const locationTag = locationMapping[location] || 'universal';
  
  return interventions.filter(intervention => {
    // If no context_tags, assume it works everywhere (legacy data)
    if (!intervention.context_tags || intervention.context_tags.length === 0) {
      return true;
    }
    
    // Include if intervention is tagged for this location OR is universal
    return intervention.context_tags.includes(locationTag) || 
           intervention.context_tags.includes('universal');
  });
}

/**
 * Format current date/time info for intervention selection
 */
export function getCurrentContextInfo(): { timeOfDay: string; dayOfWeek: string } {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  
  let timeOfDay = '';
  if (hours < 6) timeOfDay = 'Late Night';
  else if (hours < 12) timeOfDay = 'Morning';
  else if (hours < 17) timeOfDay = 'Afternoon';
  else if (hours < 21) timeOfDay = 'Evening';
  else timeOfDay = 'Night';
  
  const timeString = `${timeOfDay} (${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')})`;
  
  return {
    timeOfDay: timeString,
    dayOfWeek: now.getDay().toString()
  };
}