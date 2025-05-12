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
    return null;
  }
}

// Create a new craving incident
export async function createCravingIncident(clientId: string | null): Promise<string | null> {
  console.log('Creating craving incident for client:', clientId);
  if (!clientId) {
    console.log('No client ID provided, using mock');
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
      console.error('Error creating craving incident:', error);
      return null;
    }
    if (!data) {
      console.error('No data returned from craving incident creation');
      return null;
    }
    console.log('Successfully created craving incident:', data.id);
    return data.id;
  } catch (e) {
    console.error('Exception creating craving incident:', e);
    return null;
  }
}

// Save a message to the database
import { Message, MessageSender, MessageType } from './craving-types';

// Fetch 3 random interventions for a client
export async function getRandomClientInterventions(clientId: string, count: number = 3): Promise<{ name: string; description: string }[]> {
  if (!clientId) return [];
  try {
    const { data, error } = await supabase
      .from('client_interventions')
      .select('name, description')
      .eq('client_id', clientId);
    if (error || !data || data.length === 0) return [];
    // Shuffle and pick count
    const shuffled = data.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  } catch {
    return [];
  }
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
      console.error('Error saving message:', error);
      return null;
    }
    if (!data) {
      console.error('No data returned from message insert');
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
    return [];
  }
}

// Update the craving incident
import type { CravingIncident } from './craving-types';
export async function updateIncident(
  incidentId: string,
  updates: Partial<CravingIncident> & { tacticUsed?: string }
): Promise<boolean> {
  console.log('Updating incident:', incidentId, 'with updates:', updates);
  if (!incidentId) {
    console.error('No incident ID provided for update');
    return false;
  }
  // For dev/demo fallback
  if (incidentId.startsWith('mock-')) {
    console.log('Mock incident, simulating success');
    return true;
  }
  try {
    const updateObj: Record<string, unknown> = {};
    if (updates.triggerFood) updateObj.trigger_food = updates.triggerFood;
    if (updates.initialIntensity) updateObj.initial_intensity = updates.initialIntensity;
    if (updates.finalIntensity) updateObj.final_intensity = updates.finalIntensity;
    if (updates.location) updateObj.location = updates.location;
    if (updates.context) updateObj.context = updates.context;
    if (updates.resisted !== undefined) updateObj.resisted = updates.resisted;
    if (updates.resolvedAt) updateObj.resolved_at = updates.resolvedAt.toISOString();
    if (updates.interventionId) updateObj.intervention_id = updates.interventionId;
    if (updates.tacticUsed) updateObj.tactic_used = updates.tacticUsed;

    console.log('Sending update to database:', updateObj);
    const { error } = await supabase
      .from('craving_incidents')
      .update(updateObj)
      .eq('id', incidentId);

    if (error) {
      console.error('Error updating incident:', error);
      return false;
    }
    console.log('Successfully updated incident');
    return true;
  } catch (e) {
    console.error('Exception updating incident:', e);
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
