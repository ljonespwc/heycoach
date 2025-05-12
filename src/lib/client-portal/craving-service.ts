import { createClient } from '@/lib/supabase/client';
import {
  Message,
  CravingIncident,
  Coach,
  Client,
  ConversationStep
} from './craving-types';
import * as CravingDB from './craving-db';

export type { Message } from './craving-types';
export { ConversationStep } from './craving-types';

export class CravingService {
  private supabase = createClient()
  private clientId: string | null = null
  private coachId: string | null = null
  private incidentId: string | null = null
  private currentStep: ConversationStep = ConversationStep.WELCOME
  
  constructor() {
    // Constructor can't be async, initialization will be handled by the page component
  }

  async initialize(): Promise<boolean> {
    await this.initializeSession()
    return !!this.clientId
  }
  
  private async initializeSession(): Promise<void> {
    try {
      // First, use URL token parameter if available
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      
      if (token) {
        // Validate token directly
        const validated = await this.validateToken(token);
        
        if (validated) {
          return;
        }
      }
      
      // Otherwise check for existing session
      const response = await fetch('/api/client-portal/auth');
      const data = await response.json();
      
      if (data.authenticated && data.client) {
        this.clientId = data.client.id;
        this.coachId = data.client.coach_id;
      }
      // If no authenticated session, the user will need to log in
    } catch {
      // Silent error handling
    }
  }
  
  async validateToken(token: string): Promise<boolean> {
    try {
      const { clientId, coachId } = await CravingDB.fetchClientByToken(token);
      this.clientId = clientId;
      this.coachId = coachId;
      return !!clientId;
    } catch {
      return false;
    }
  }

  async getCoachInfo(): Promise<Coach | null> {
    if (!this.coachId) return null;
    return CravingDB.getCoachInfo(this.coachId);
  }

  // Get client information
  async getClientInfo(): Promise<Client | null> {
    if (!this.clientId) return null;
    return CravingDB.fetchClientDetails(this.clientId);
  }
  
  // Get both client and coach information
  async getSessionInfo(): Promise<{ client: Client | null, coach: Coach | null }> {
    if (!this.clientId || !this.coachId) {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      if (token) await this.validateToken(token);
      else {
        try {
          const response = await fetch('/api/client-portal/auth');
          const data = await response.json();
          if (data.authenticated && data.client) {
            this.clientId = data.client.id;
            this.coachId = data.client.coach_id;
          }
        } catch {}
      }
    }
    const client = this.clientId ? await CravingDB.fetchClientDetails(this.clientId) : null;
    const coach = this.coachId ? await CravingDB.getCoachInfo(this.coachId) : null;
    return { client, coach };
  }

  // Check if there's an active incident for this client (created within the last hour)
  async hasActiveIncident(): Promise<boolean> {
    if (!this.clientId) return false;
    
    try {
      const { data, error } = await this.supabase
        .from('craving_incidents')
        .select('id, created_at')
        .eq('client_id', this.clientId)
        .is('resolved_at', null)
        .order('created_at', { ascending: false })
        .limit(1);
        
      if (error || !data || data.length === 0) return false;
      
      // Check if the incident was created within the last hour
      const createdAt = new Date(data[0].created_at);
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);
      
      if (createdAt > oneHourAgo) {
        // If we have an active incident, store its ID
        this.incidentId = data[0].id;
        return true;
      }
      
      return false;
    } catch {
      return false;
    }
  }

  // Create a new craving incident
  async createCravingIncident(): Promise<string | null> {
    // First check if there's already an active incident
    const hasActive = await this.hasActiveIncident();
    if (hasActive && this.incidentId) {
      return this.incidentId;
    }
    
    // Delegate to DB module for real implementation, fallback to mock for dev
    if (!this.clientId) {
      const mockId = `mock-${Date.now()}`;
      this.incidentId = mockId;
      return mockId;
    }
    
    const incidentId = await CravingDB.createCravingIncident(this.clientId);
    this.incidentId = incidentId;
    return incidentId;
  }

  // Get the current incident ID
  getIncidentId(): string | null {
    return this.incidentId;
  }

  // Update the trigger food for the current incident
  async updateTriggerFood(food: string): Promise<boolean> {
    if (!this.incidentId) return false;
    return this.updateIncident({ triggerFood: food });
  }

  // Save a message to the database
  async saveMessage(message: Omit<Message, 'id'>): Promise<Message | null> {
    if (!this.incidentId) return null;
    return CravingDB.saveMessage(this.incidentId, message);
  }

  // Get all messages for the current incident
  async getMessages(): Promise<Message[]> {
    if (!this.incidentId) return [];
    return CravingDB.getMessages(this.incidentId);
  }

  // Update the craving incident with new information
  async updateIncident(updates: Partial<CravingIncident>): Promise<boolean> {
    if (!this.incidentId) return false;
    return CravingDB.updateIncident(this.incidentId, updates);
  }

  scheduleFollowUp(minutes: number): void {
    // For demo purposes, we'll just use setTimeout
    setTimeout(() => {
      // Follow-up would happen here after the specified minutes
    }, minutes * 60 * 1000)
  }
  
  // Helper method to get the initial intensity
  private async getInitialIntensity(): Promise<number> {
    if (!this.incidentId) return 0;
    return CravingDB.getInitialIntensity(this.incidentId);
  }
}

export default CravingService
