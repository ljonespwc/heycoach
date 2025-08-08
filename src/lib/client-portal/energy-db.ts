// Supabase data access functions for energy service
import { createClient } from '@/lib/supabase/client';
import { Message, MessageSender, MessageType, MovementIncident, Intervention } from './craving-types';

const supabase = createClient();

// Create a new movement incident
export async function createMovementIncident(clientId: string | null): Promise<string | null> {
  if (!clientId) {
    // For dev/demo fallback
    return `mock-movement-${Date.now()}`;
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
      .from('movement_incidents')
      .insert({
        client_id: clientId,
        created_at: now.toISOString(),
        day_of_week: dayOfWeek,
        time_of_day: timeOfDay
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error creating movement incident:', error);
      return null;
    }
    if (!data) {
      console.error('❌ No data returned from movement incident creation');
      return null;
    }
    return data.id;
  } catch (e) {
    console.error('Exception creating movement incident:', e);
    return null;
  }
}

// Fetch active client energy interventions with details from energy_interventions table
export async function getActiveClientInterventions(clientId: string, interventionType: 'craving' | 'energy', count: number = 25): Promise<Intervention[]> {
  if (!clientId) {
    return [];
  }
  
  try {
    // Step 1: Get active client interventions
    console.log(`🔍 Querying client_interventions table for clientId: ${clientId}, type: ${interventionType}`);
    const { data: clientInterventions, error: clientError } = await supabase
      .from('client_interventions')
      .select('intervention_id')
      .eq('client_id', clientId)
      .eq('intervention_type', interventionType)
      .eq('active', true)
      .limit(count);
    
    if (clientError) {
      console.error('Error fetching client interventions:', clientError);
      return [];
    }
    
    if (!clientInterventions || clientInterventions.length === 0) {
      console.log('No client interventions found');
      return [];
    }
    
    // Extract intervention IDs
    const interventionIds = clientInterventions.map(item => item.intervention_id);
    console.log('Extracted intervention IDs:', interventionIds);
    
    // Step 2: Get intervention details including category from appropriate table
    const tableName = interventionType === 'craving' ? 'craving_interventions' : 'energy_interventions';
    console.log(`Querying ${tableName} table...`);
    const { data: interventionDetails, error: detailsError } = await supabase
      .from(tableName)
      .select('id, name, description, category')
      .in('id', interventionIds);
    
    console.log('Intervention details query result:', { interventionDetails, detailsError });
    
    if (detailsError) {
      console.error('Error fetching intervention details:', detailsError);
      return [];
    }
    
    if (!interventionDetails || interventionDetails.length === 0) {
      console.log('No intervention details found');
      return [];
    }
    
    // Map the intervention details to the expected structure
    const result = interventionDetails.map(item => ({
      id: item.id,
      name: item.name,
      description: item.description,
      category: item.category
    }));
    
    console.log('Successfully fetched interventions:', result);
    return result;
  } catch (e) {
    console.error('Exception fetching active interventions:', e);
    return [];
  }
}

// Fetch random energy interventions for a client
export async function getRandomClientInterventions(clientId: string, count: number = 3): Promise<Intervention[]> {
  console.log(`Getting ${count} random energy interventions for client:`, clientId);
  const interventions = await getActiveClientInterventions(clientId, 'energy', 25); // Get up to 25 interventions
  
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

// Save a message to the database with movement incident type
export async function saveMessage(incidentId: string, message: Omit<Message, 'id'>): Promise<Message | null> {
  console.log('Saving energy message to database:', { incidentId, message: message.text, type: message.type });
  if (!incidentId) {
    console.error('No incident ID provided for saving message');
    return null;
  }
  // For dev/demo fallback
  if (incidentId.startsWith('mock-movement-')) {
    console.log('Using mock movement incident ID for message');
    return {
      id: `msg-${Date.now()}`,
      ...message
    };
  }
  try {
    const messageData = {
      incident_type: 'movement',
      incident_id: incidentId,
      sender_type: message.sender,
      message_text: message.text,
      message_type: message.type,
      metadata: message.metadata || {},
      created_at: message.timestamp.toISOString()
    };
    console.log('Inserting movement message data:', messageData);
    const { data, error } = await supabase
      .from('client_sos_messages')
      .insert(messageData)
      .select()
      .single();
    if (error) {
      console.error('❌ Error saving movement message:', error);
      return null;
    }
    if (!data) {
      console.error('❌ No data returned from movement message insert');
      return null;
    }
    console.log('Successfully saved movement message:', data.id);
    return {
      id: data.id,
      sender: data.sender_type as MessageSender,
      text: data.message_text,
      type: data.message_type as MessageType,
      timestamp: new Date(data.created_at),
      metadata: data.metadata
    };
  } catch (e) {
    console.error('❌ saveMessage failed:', e);
    return null;
  }
}

// Get all messages for a movement incident
export async function getMessages(incidentId: string): Promise<Message[]> {
  if (!incidentId) return [];
  // For dev/demo fallback
  if (incidentId.startsWith('mock-movement-')) return [];
  try {
    const { data, error } = await supabase
      .from('client_sos_messages')
      .select('*')
      .eq('incident_type', 'movement')
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
  } catch (e) {
    console.error('❌ getMessages failed:', e);
    return [];
  }
}

// Update a movement incident by its ID
export async function updateMovementIncident(
  incidentId: string,
  updates: Partial<MovementIncident> & { tacticUsed?: string }
): Promise<boolean> {
  if (!incidentId) {
    console.error('No incident ID provided for movement incident update');
    return false;
  }
  // For dev/demo fallback
  if (incidentId.startsWith('mock-movement-')) {
    console.log('Mock movement incident update:', updates);
    return true;
  }
  try {
    const updateObj: Record<string, unknown> = {};
    if (updates.blockerType !== undefined) updateObj.blocker_type = updates.blockerType;
    if (updates.energyLevel !== undefined) updateObj.energy_level = updates.energyLevel;
    if (updates.activityCompleted !== undefined) updateObj.activity_completed = updates.activityCompleted;
    if (updates.activityType !== undefined) updateObj.activity_type = updates.activityType;
    if (updates.durationMinutes !== undefined) updateObj.duration_minutes = updates.durationMinutes;
    if (updates.postEnergyLevel !== undefined) updateObj.post_energy_level = updates.postEnergyLevel;
    if (updates.interventionId && !updates.interventionId.startsWith('fallback-')) {
      updateObj.intervention_id = updates.interventionId;
    }
    if (updates.resolvedAt !== undefined) {
      updateObj.resolved_at = updates.resolvedAt ? updates.resolvedAt.toISOString() : null;
    }
    // Note: tacticUsed is not stored in the database, it's just for logging purposes

    // Don't send empty updates
    if (Object.keys(updateObj).length === 0) {
      return true;
    }
    
    const { error } = await supabase
      .from('movement_incidents')
      .update(updateObj)
      .eq('id', incidentId);

    if (error) {
      console.error('❌ Error updating movement incident:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Exception updating movement incident:', e);
    return false;
  }
}

// Update the most recent active movement incident for a client
export async function updateMovementIncidentByClientId(
  clientId: string,
  updates: Partial<MovementIncident> & { tacticUsed?: string }
): Promise<boolean> {
  console.log('Updating most recent movement incident for client:', clientId);
  if (!clientId) {
    console.error('No client ID provided for movement incident update');
    return false;
  }
  
  try {
    // First, find the most recent active incident for this client
    const { data, error } = await supabase
      .from('movement_incidents')
      .select('id')
      .eq('client_id', clientId)
      .is('resolved_at', null)
      .order('created_at', { ascending: false })
      .limit(1);
      
    if (error) {
      console.error('❌ Error finding active movement incident for client:', error);
      return false;
    }
    if (!data || data.length === 0) {
      console.error('❌ No active movement incidents found for client:', clientId);
      return false;
    }
    
    const incidentId = data[0].id;
    console.log('Found active movement incident:', incidentId);
    
    // Now update this incident
    return updateMovementIncident(incidentId, updates);
  } catch (e) {
    console.error('Exception updating movement incident by client ID:', e);
    return false;
  }
}

// Check if there's an active movement incident for this client
export async function hasActiveMovementIncident(clientId: string): Promise<{ hasActive: boolean; incidentId?: string }> {
  if (!clientId) return { hasActive: false };
  
  try {
    const { data, error } = await supabase
      .from('movement_incidents')
      .select('id, created_at')
      .eq('client_id', clientId)
      .is('resolved_at', null)
      .order('created_at', { ascending: false })
      .limit(1);
      
    if (error || !data || data.length === 0) return { hasActive: false };
    
    // Check if the incident was created within the last hour
    const createdAt = new Date(data[0].created_at);
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    
    if (createdAt > oneHourAgo) {
      return { hasActive: true, incidentId: data[0].id };
    }
    
    return { hasActive: false };
  } catch (error) {
    console.error('❌ hasActiveMovementIncident failed:', error);
    return { hasActive: false };
  }
}

// Re-export functions from craving-db for shared functionality
export { fetchClientByToken, fetchClientDetails, getCoachInfo } from './craving-db';