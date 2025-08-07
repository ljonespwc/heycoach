// Supabase data access functions for craving service
import { createClient } from '@/lib/supabase/client';
import { Client, Coach } from './craving-types';

const supabase = createClient();

export async function fetchClientByToken(token: string): Promise<{ clientId: string | null; coachId: string | null }> {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('id, coach_id, full_name')
      .eq('access_token', token)
      .single();
    if (error || !data) return { clientId: null, coachId: null };
    return { clientId: data.id, coachId: data.coach_id };
  } catch {
    console.error('❌ fetchClientByToken failed');
    return { clientId: null, coachId: null };
  }
}

export async function fetchClientDetails(clientId: string): Promise<Client | null> {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();
    if (error) return null;
    return data;
  } catch {
    console.error('❌ fetchClientDetails failed');
    return null;
  }
}

export async function getCoachInfo(coachId: string): Promise<Coach | null> {
  try {
    const coachResult = await supabase
      .from('coaches')
      .select('*')
      .eq('id', coachId);
    if (coachResult.data && coachResult.data.length > 0 && !coachResult.error) {
      const coachData = coachResult.data[0];
      if (!coachData.avatar_url) {
        coachData.avatar_url = 'https://randomuser.me/api/portraits/men/32.jpg';
      }
      return coachData as Coach;
    }
    return null;
  } catch {
    console.error('❌ getCoachInfo failed');
    return null;
  }
}

// Create a new craving incident
export async function createCravingIncident(clientId: string | null): Promise<string | null> {
  if (!clientId) {
    // For dev/demo fallback
    return `mock-${Date.now()}`;
  }
  try {
    // Get current date/time for day_of_week and time_of_day
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0-6, where 0 is Sunday
    
    // Format time as HH:MM:SS for PostgreSQL time without timezone
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    const timeOfDay = `${hours}:${minutes}:${seconds}`;
    
    const { data, error } = await supabase
      .from('craving_incidents')
      .insert({
        client_id: clientId,
        created_at: now.toISOString(),
        day_of_week: dayOfWeek,
        time_of_day: timeOfDay
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error creating craving incident');
      return null;
    }
    if (!data) {
      console.error('❌ No data returned from craving incident creation');
      return null;
    }
    return data.id;
  } catch (e) {
    console.error('Exception creating craving incident:', e);
    return null;
  }
}

// Save a message to the database
import { Message, MessageSender, MessageType } from './craving-types';

import { Intervention } from './craving-types';

// Fetch active client interventions with details from craving_interventions table
export async function getActiveClientInterventions(clientId: string, count: number = 3): Promise<Intervention[]> {
  if (!clientId) {
    return [];
  }
  
  try {
    // If we don't have any client interventions, use default fallback interventions
    const fallbackInterventions: Intervention[] = [
      {
        id: 'fallback-1',
        name: 'Deep breathing',
        description: 'Take 5 deep breaths, inhaling for 4 counts and exhaling for 6 counts.'
      },
      {
        id: 'fallback-2',
        name: 'Drink water',
        description: 'Drink a full glass of water slowly, focusing on the sensation.'
      },
      {
        id: 'fallback-3',
        name: 'Take a walk',
        description: 'Take a short 5-minute walk to redirect your attention.'
      }
    ];
    
    // Step 1: Get active client interventions
    const { data: clientInterventions, error: clientError } = await supabase
      .from('client_interventions')
      .select('intervention_id')
      .eq('client_id', clientId)
      .eq('intervention_type', 'craving')
      .eq('active', true)
      .limit(count);
    
    if (clientError) {
      console.error('Error fetching client interventions:', clientError);
      console.log('Using fallback interventions due to error');
      return fallbackInterventions;
    }
    
    if (!clientInterventions || clientInterventions.length === 0) {
      console.log('No client interventions found, using fallback interventions');
      return fallbackInterventions;
    }
    
    // Extract intervention IDs
    const interventionIds = clientInterventions.map(item => item.intervention_id);
    console.log('Extracted intervention IDs:', interventionIds);
    
    // Step 2: Get intervention details
    console.log('Querying craving_interventions table...');
    const { data: interventionDetails, error: detailsError } = await supabase
      .from('craving_interventions')
      .select('id, name, description')
      .in('id', interventionIds);
    
    console.log('Intervention details query result:', { interventionDetails, detailsError });
    
    if (detailsError) {
      console.error('Error fetching intervention details:', detailsError);
      console.log('Using fallback interventions due to error');
      return fallbackInterventions;
    }
    
    if (!interventionDetails || interventionDetails.length === 0) {
      console.log('No intervention details found, using fallback interventions');
      return fallbackInterventions;
    }
    
    // Map the intervention details to the expected structure
    const result = interventionDetails.map(item => ({
      id: item.id,
      name: item.name,
      description: item.description
    }));
    
    console.log('Successfully fetched interventions:', result);
    return result;
  } catch (e) {
    console.error('Exception fetching active interventions:', e);
    console.log('Using fallback interventions due to exception');
    return [
      {
        id: 'fallback-1',
        name: 'Deep breathing',
        description: 'Take 5 deep breaths, inhaling for 4 counts and exhaling for 6 counts.'
      },
      {
        id: 'fallback-2',
        name: 'Drink water',
        description: 'Drink a full glass of water slowly, focusing on the sensation.'
      }
    ];
  }
}

// Fetch random interventions for a client
export async function getRandomClientInterventions(clientId: string, count: number = 3): Promise<Intervention[]> {
  console.log(`Getting ${count} random interventions for client:`, clientId);
  const interventions = await getActiveClientInterventions(clientId, 10); // Get more than we need so we can shuffle
  
  if (interventions.length === 0) {
    console.log('No interventions found, returning empty array');
    return [];
  }
  
  // Shuffle and pick count
  const shuffled = interventions.sort(() => 0.5 - Math.random());
  const result = shuffled.slice(0, Math.min(count, shuffled.length));
  console.log(`Returning ${result.length} random interventions:`, result);
  return result;
}

export async function saveMessage(incidentId: string, message: Omit<Message, 'id'>): Promise<Message | null> {
  console.log('Saving message to database:', { incidentId, message: message.text, type: message.type });
  if (!incidentId) {
    console.error('No incident ID provided for saving message');
    return null;
  }
  // For dev/demo fallback
  if (incidentId.startsWith('mock-')) {
    console.log('Using mock incident ID for message');
    return {
      id: `msg-${Date.now()}`,
      ...message
    };
  }
  try {
    const messageData = {
      incident_type: 'craving',
      incident_id: incidentId,
      sender_type: message.sender,
      message_text: message.text,
      message_type: message.type,
      metadata: message.metadata || {},
      created_at: message.timestamp.toISOString()
    };
    console.log('Inserting message data:', messageData);
    const { data, error } = await supabase
      .from('client_sos_messages')
      .insert(messageData)
      .select()
      .single();
    if (error) {
      console.error('❌ Error saving message');
      return null;
    }
    if (!data) {
      console.error('❌ No data returned from message insert');
      return null;
    }
    console.log('Successfully saved message:', data.id);
    return {
      id: data.id,
      sender: data.sender_type as MessageSender,
      text: data.message_text,
      type: data.message_type as MessageType,
      timestamp: new Date(data.created_at),
      metadata: data.metadata
    };
  } catch {
    console.error('❌ saveMessage failed');
    return null;
  }
}

// Get all messages for an incident
export async function getMessages(incidentId: string): Promise<Message[]> {
  if (!incidentId) return [];
  // For dev/demo fallback
  if (incidentId.startsWith('mock-')) return [];
  try {
    const { data, error } = await supabase
      .from('client_sos_messages')
      .select('*')
      .eq('incident_type', 'craving')
      .eq('incident_id', incidentId)
      .order('created_at', { ascending: true });
    if (error || !data) return [];
    return data.map((msg: Record<string, unknown>) => ({
      id: msg.id as string,
      sender: msg.sender_type as MessageSender,
      text: msg.message_text as string,
      type: msg.message_type as MessageType,
      timestamp: new Date(msg.created_at as string),
      metadata: msg.metadata as Record<string, unknown>
    }));
  } catch {
    console.error('❌ getMessages failed');
    return [];
  }
}

// Update the craving incident
import type { CravingIncident } from './craving-types';

// Update an incident by its ID
export async function updateIncident(
  incidentId: string,
  updates: Partial<CravingIncident> & { tacticUsed?: string }
): Promise<boolean> {
  if (!incidentId) {
    console.error('No incident ID provided for update');
    return false;
  }
  // For dev/demo fallback
  if (incidentId.startsWith('mock-')) {
    return true;
  }
  try {
    const updateObj: Record<string, unknown> = {};
    if (updates.triggerFood) updateObj.trigger_food = updates.triggerFood;
    if (updates.initialIntensity) updateObj.initial_intensity = updates.initialIntensity;
    if (updates.result_rating) {
      updateObj.result_rating = updates.result_rating;
    }
    if (updates.location) updateObj.location = updates.location;
    if (updates.context) updateObj.context = updates.context;
    if (updates.resolvedAt) updateObj.resolved_at = updates.resolvedAt.toISOString();
    if (updates.interventionId && !updates.interventionId.startsWith('fallback-')) {
      updateObj.intervention_id = updates.interventionId;
    }
    // Note: tacticUsed is not stored in the database, it's just for logging purposes

    // Don't send empty updates
    if (Object.keys(updateObj).length === 0) {
      return true;
    }
    
    const { error } = await supabase
      .from('craving_incidents')
      .update(updateObj)
      .eq('id', incidentId);

    if (error) {
      console.error('❌ Error updating incident');
      return false;
    }
    return true;
  } catch (e) {
    console.error('Exception updating incident:', e);
    return false;
  }
}

// Update the most recent active incident for a client
export async function updateIncidentByClientId(
  clientId: string,
  updates: Partial<CravingIncident> & { tacticUsed?: string }
): Promise<boolean> {
  console.log('Updating most recent incident for client:', clientId);
  if (!clientId) {
    console.error('No client ID provided for update');
    return false;
  }
  
  try {
    // First, find the most recent active incident for this client
    const { data, error } = await supabase
      .from('craving_incidents')
      .select('id')
      .eq('client_id', clientId)
      .is('resolved_at', null)
      .order('created_at', { ascending: false })
      .limit(1);
      
    if (error) {
      console.error('❌ Error finding active incident for client');
      return false;
    }
    if (!data || data.length === 0) {
      console.error('❌ No active incidents found for client:', clientId);
      return false;
    }
    
    const incidentId = data[0].id;
    console.log('Found active incident:', incidentId);
    
    // Now update this incident
    return updateIncident(incidentId, updates);
  } catch (e) {
    console.error('Exception updating incident by client ID:', e);
    return false;
  }
}

// Get the initial intensity for an incident
export async function getInitialIntensity(incidentId: string): Promise<number> {
  if (!incidentId) return 0;
  // For dev/demo fallback
  if (incidentId.startsWith('mock-')) return 0;
  try {
    const { data, error } = await supabase
      .from('craving_incidents')
      .select('initial_intensity')
      .eq('id', incidentId)
      .single();
    if (error || !data) return 0;
    return data.initial_intensity || 0;
  } catch {
    return 0;
  }
}
