import { createClient } from '@/lib/supabase/client';
import {
  Message,
  Coach,
  Client,
  ConversationStep,
  Intervention,
  CravingIncident,
  MessageType
} from './craving-types';
import * as CravingDB from './craving-db';
import { getCoachResponse, type CoachResponse, type Option } from './craving-conversation';

export type { Message } from './craving-types';
export { ConversationStep } from './craving-types';

export class CravingService {
  private supabase = createClient()
  private clientId: string | null = null
  private coachId: string | null = null
  private incidentId: string | null = null
  private currentStep: ConversationStep = ConversationStep.WELCOME
  private selectedFood: string | null = null // Store selected food across conversation steps
  
  constructor() {
    // Constructor can't be async, initialization will be handled by the page component
  }

  async initialize(): Promise<boolean> {
    await this.initializeSession()
    return !!this.clientId
  }
  
  private async initializeSession(): Promise<void> {
    try {
      // Get token from URL or localStorage
      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get('token');
      const storedToken = localStorage.getItem('clientToken');
      const token = urlToken || storedToken;
      
      if (token) {
        // Validate token and get client/coach IDs
        const validated = await this.validateToken(token);
        if (validated) {
          // Store for future use
          localStorage.setItem('clientToken', token);
          if (this.clientId) {
            localStorage.setItem('clientId', this.clientId);
          }
          return;
        } else {
          // Clear invalid token
          localStorage.removeItem('clientToken');
        }
      }
      
      // Fallback: try stored client ID
      const storedClientId = localStorage.getItem('clientId');
      if (storedClientId) {
        try {
          const clientDetails = await CravingDB.fetchClientDetails(storedClientId);
          if (clientDetails) {
            this.clientId = storedClientId;
            this.coachId = clientDetails.coach_id;
            return;
          }
        } catch {
          // Silent fallback
        }
      }
      
      // Final fallback: check API session
      const response = await fetch('/api/client-portal/auth');
      const data = await response.json();
      
      if (data.authenticated && data.client) {
        this.clientId = data.client.id;
        this.coachId = data.client.coach_id;
      }
    } catch {
      // Silent error handling
    }
  }
  
  async validateToken(token: string): Promise<boolean> {
    try {
      const { clientId, coachId } = await CravingDB.fetchClientByToken(token);
      
      if (clientId && coachId) {
        this.clientId = clientId;
        this.coachId = coachId;
        return true;
      } else {
        return false;
      }
    } catch {
      return false;
    }
  }

  async getCoachInfo(): Promise<Coach | null> {
    if (!this.coachId) return null;
    return await CravingDB.getCoachInfo(this.coachId);
  }

  async getClientInfo(): Promise<Client | null> {
    if (!this.clientId) return null;
    return await CravingDB.fetchClientDetails(this.clientId);
  }

  async fetchClientDetails(clientId: string) {
    return await CravingDB.fetchClientDetails(clientId);
  }

  async getCoachDetails(coachId: string) {
    return await CravingDB.getCoachInfo(coachId);
  }

  // Get both client and coach information
  async getSessionInfo(): Promise<{ client: Client | null, coach: Coach | null }> {
    if (!this.clientId || !this.coachId) {
      // First try URL token
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      
      if (token) {
        // Store token in localStorage for PWA persistence
        localStorage.setItem('clientToken', token);
        await this.validateToken(token);
      } else {
        // Then try localStorage token (for PWA)
        const storedToken = localStorage.getItem('clientToken');
        if (storedToken) {
          await this.validateToken(storedToken);
        } 
        
        // If we still don't have client/coach IDs, try using stored clientId
        if ((!this.clientId || !this.coachId) && localStorage.getItem('clientId')) {
          const clientId = localStorage.getItem('clientId');
          if (clientId) {
            // Get client details from database using the stored ID
            try {
              const clientDetails = await CravingDB.fetchClientDetails(clientId);
              if (clientDetails) {
                this.clientId = clientId;
                this.coachId = clientDetails.coach_id;
              }
            } catch {
              // Silent error handling
            }
          }
        }
        
        // Finally try API auth as last resort
        if (!this.clientId || !this.coachId) {
          try {
            const response = await fetch('/api/client-portal/auth');
            const data = await response.json();
            if (data.authenticated && data.client) {
              this.clientId = data.client.id;
              this.coachId = data.client.coach_id;
              
              // Store the client ID for future use
              localStorage.setItem('clientId', data.client.id);
            }
          } catch {
            // Silent error handling
          }
        }
      }
    }
    
    const client = this.clientId ? await this.getClientInfo() : null;
    const coach = this.coachId ? await this.getCoachInfo() : null;
    
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

  // Centralized message processing - handles both text input and option selection
  async processUserInput({
    input,
    currentStep,
    clientName,
    chosenIntervention,
    interventions = [],
    isOption = false,
    onMessage,
    onStateUpdate
  }: {
    input: string;
    currentStep: ConversationStep;
    clientName: string;
    chosenIntervention?: Intervention | null;
    interventions?: Intervention[];
    isOption?: boolean;
    onMessage: (message: Message) => Promise<void>;
    onStateUpdate: (updates: {
      currentStep: ConversationStep;
      optionChoices: Array<Option | string>;
      interventions?: Intervention[];
      chosenIntervention?: Intervention | null;
    }) => void;
  }): Promise<void> {
    
    let messageType: MessageType = 'text';
    let updatedChosenIntervention = chosenIntervention;
    const cleanValue = input.trim();
    
    // Handle different conversation steps and message types
    console.log('🔍 Processing input:', { input: cleanValue, currentStep, isOption });
    
    // NOTE: Database updates happen when ENTERING a step (using input from previous step)
    // This "on-entry" pattern ensures data is captured immediately when user provides it
    if (isOption) {
      console.log('🔍 Processing as OPTION for step:', currentStep);
      switch (currentStep) {
        case ConversationStep.GAUGE_INTENSITY:
          messageType = 'option_selection';
          // Entering GAUGE_INTENSITY: save food selection from IDENTIFY_CRAVING
          this.selectedFood = cleanValue; // Store selected food for later use
          await this.updateIncident({ triggerFood: cleanValue });
          break;
          
        case ConversationStep.IDENTIFY_LOCATION:
          messageType = 'intensity_rating';
          // Entering IDENTIFY_LOCATION: save intensity rating from GAUGE_INTENSITY
          const intensity = parseInt(cleanValue, 10);
          if (!isNaN(intensity)) {
            await this.updateIncident({ initialIntensity: intensity });
          }
          break;
          
        case ConversationStep.IDENTIFY_TRIGGER:
          messageType = 'option_selection';
          // Entering IDENTIFY_TRIGGER: save location from IDENTIFY_LOCATION
          await this.updateIncident({ location: cleanValue });
          break;
          
        case ConversationStep.SUGGEST_TACTIC:
          messageType = 'option_selection';
          // Entering SUGGEST_TACTIC: save trigger context from IDENTIFY_TRIGGER
          await this.updateIncident({ context: cleanValue });
          break;

        case ConversationStep.RATE_RESULT:
          console.log('🔍 RATE_RESULT option case - setting messageType to intensity_rating');
          messageType = 'intensity_rating';
          const resultRating = parseInt(cleanValue, 10);
          console.log('RATE_RESULT: cleanValue =', cleanValue, 'resultRating =', resultRating);
          if (!isNaN(resultRating)) {
            console.log('Updating incident with result_rating:', resultRating);
            await this.updateIncident({ 
              result_rating: resultRating,
              resolvedAt: new Date() // Mark as resolved when rating is provided
            });
            // Transition to CLOSE step after rating is provided
            currentStep = ConversationStep.CLOSE;
          } else {
            console.log('ERROR: resultRating is NaN, not updating incident');
          }
          break;
          
        case ConversationStep.ENCOURAGEMENT:
          messageType = 'tactic_response';
          
          // Handle special cases for intervention acceptance
          if (cleanValue === "Another idea") {
            updatedChosenIntervention = {
              id: 'another-idea',
              name: "Another idea",
              description: "User requested another intervention option"
            };
          } else if (cleanValue === "Yes, I'll try it") {
            // User accepted the intervention - use the first intervention in the list
            if (interventions.length > 0) {
              const selectedIntervention = interventions[0];
              if (selectedIntervention?.id) {
                updatedChosenIntervention = selectedIntervention;
                await this.updateIncident({
                  interventionId: selectedIntervention.id,
                  tacticUsed: selectedIntervention.name
                });
              }
            }
          } else {
            // Handle regular interventions
            const intervention = interventions.find(i => i.name === cleanValue);
            if (intervention?.id) {
              updatedChosenIntervention = intervention;
              await this.updateIncident({
                interventionId: intervention.id,
                tacticUsed: intervention.name
              });
            }
          }
          break;
      }
    }
    
    // Handle text input for certain steps
    if (!isOption) {
      switch (currentStep) {
        case ConversationStep.GAUGE_INTENSITY:
          // Text input for food selection (like "hot dog")
          messageType = 'option_selection';
          this.selectedFood = cleanValue; // Store selected food for later use
          await this.updateIncident({ triggerFood: cleanValue });
          break;
          
        case ConversationStep.IDENTIFY_LOCATION:
          // Text input for intensity rating (like "8")
          messageType = 'intensity_rating';
          const intensity = parseInt(cleanValue, 10);
          if (!isNaN(intensity)) {
            await this.updateIncident({ initialIntensity: intensity });
          }
          break;
          
        case ConversationStep.IDENTIFY_TRIGGER:
          // Text input for location (like "kitchen")
          messageType = 'option_selection';
          await this.updateIncident({ location: cleanValue });
          break;
          
        case ConversationStep.SUGGEST_TACTIC:
          // Text input for trigger context (like "feeling lonely")
          messageType = 'option_selection';
          await this.updateIncident({ context: cleanValue });
          break;
          
        case ConversationStep.ENCOURAGEMENT:
          // Text input for intervention acceptance (like "yes" or "no")
          messageType = 'tactic_response';
          
          // Handle text variations of acceptance
          const lowerInput = cleanValue.toLowerCase();
          if (lowerInput === "yes" || lowerInput === "y" || lowerInput === "ok" || lowerInput === "sure") {
            // User accepted the intervention - use the first intervention in the list
            if (interventions.length > 0) {
              const selectedIntervention = interventions[0];
              if (selectedIntervention?.id) {
                updatedChosenIntervention = selectedIntervention;
                await this.updateIncident({
                  interventionId: selectedIntervention.id,
                  tacticUsed: selectedIntervention.name
                });
              }
            }
          } else if (lowerInput === "no" || lowerInput === "n" || lowerInput.includes("another") || lowerInput.includes("different")) {
            // User wants another option
            updatedChosenIntervention = {
              id: 'another-idea',
              name: "Another idea",
              description: "User requested another intervention option"
            };
          }
          break;
          
        case ConversationStep.RATE_RESULT:
          console.log('🔍 RATE_RESULT text case - setting messageType to intensity_rating');
          messageType = 'intensity_rating';
          const resultRating = parseInt(cleanValue, 10);
          console.log('RATE_RESULT (text): cleanValue =', cleanValue, 'resultRating =', resultRating);
          if (!isNaN(resultRating)) {
            console.log('Updating incident with result_rating:', resultRating);
            await this.updateIncident({ 
              result_rating: resultRating,
              resolvedAt: new Date() // Mark as resolved when rating is provided
            });
            // Transition to CLOSE step after rating is provided
            currentStep = ConversationStep.CLOSE;
          } else {
            console.log('ERROR: resultRating is NaN, not updating incident');
          }
          break;
      }
    }
    
    // Create and save client message
    console.log('🔍 Final messageType before creating message:', messageType);
    const clientMessage: Message = {
      id: `client-${Date.now()}`,
      sender: 'client',
      text: cleanValue,
      type: messageType,
      timestamp: new Date(),
    };
    
    await onMessage(clientMessage);
    
    // Get coach's response
    const coachRes: CoachResponse = await getCoachResponse({
      currentStep,
      clientName,
      clientId: this.clientId || '',
      selectedFood: this.selectedFood || undefined, // Pass stored selectedFood to coach response
      chosenIntervention: updatedChosenIntervention || undefined,
    });
    
    // Add coach's response with a slight delay
    setTimeout(async () => {
      await onMessage(coachRes.response);
      
      // Update UI state
      onStateUpdate({
        currentStep: coachRes.nextStep,
        optionChoices: coachRes.options || [],
        interventions: coachRes.interventions,
        chosenIntervention: updatedChosenIntervention
      });
      
      // Schedule follow-up if transitioning to RATE_RESULT step
      if (coachRes.nextStep === ConversationStep.RATE_RESULT && updatedChosenIntervention) {
        this.scheduleInternalFollowUp({
          clientName,
          chosenIntervention: updatedChosenIntervention,
          onMessage,
          onStateUpdate
        });
      }
    }, 1000);
  }
  
  // Centralized follow-up scheduling
  private scheduleInternalFollowUp({
    clientName,
    chosenIntervention,
    onMessage,
    onStateUpdate
  }: {
    clientName: string;
    chosenIntervention: Intervention;
    onMessage: (message: Message) => Promise<void>;
    onStateUpdate: (updates: {
      currentStep: ConversationStep;
      optionChoices: Array<Option | string>;
    }) => void;
  }): void {
    setTimeout(async () => {
      const followUpRes = await getCoachResponse({
        currentStep: ConversationStep.RATE_RESULT,
        clientName,
        clientId: this.clientId || '',
        selectedFood: this.selectedFood || undefined, // Pass stored selectedFood to coach response
        chosenIntervention,
      });
      
      await onMessage(followUpRes.response);
      onStateUpdate({
        currentStep: followUpRes.nextStep,
        optionChoices: followUpRes.options || []
      });
    }, 30 * 1000); // 30 seconds for testing
  }

  async getWelcomeMessage(clientName: string): Promise<{ response: Message; nextStep: ConversationStep; options?: Array<Option | string> }> {
    const welcomeRes = await getCoachResponse({
      currentStep: ConversationStep.WELCOME,
      clientName,
      clientId: this.clientId || '',
      selectedFood: this.selectedFood || undefined, // Pass stored selectedFood to coach response
    });
    return welcomeRes;
  }

  async getFoodSelectionMessage(clientName: string): Promise<{ response: Message; nextStep: ConversationStep; options?: Array<Option | string> }> {
    const foodSelectionRes = await getCoachResponse({
      currentStep: ConversationStep.IDENTIFY_CRAVING,
      clientName,
      clientId: this.clientId || '',
      selectedFood: this.selectedFood || undefined, // Pass stored selectedFood to coach response
    });
    return foodSelectionRes;
  }

  // Helper method to get the initial intensity
  private async getInitialIntensity(): Promise<number> {
    if (!this.incidentId) return 0;
    return CravingDB.getInitialIntensity(this.incidentId);
  }
}

export default CravingService
