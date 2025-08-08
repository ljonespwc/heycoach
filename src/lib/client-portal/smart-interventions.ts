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
}): Promise<Array<{
  interventionId: string;
  interventionName: string;
  effectiveness: number;
  context: string;
}>> {
  // TODO: Implement database query to get historical effectiveness
  // For now, return empty array
  console.log('Getting previous effectiveness for client:', clientId, context);
  return [];
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