import { createClient } from '@/lib/supabase/client';
import {
  Message,
  Coach,
  Client,
  ConversationStep,
  Intervention,
  MovementIncident,
  MessageType
} from './craving-types';
import * as EnergyDB from './energy-db';
import { getEnergyResponse, type EnergyResponse, type Option } from './energy-conversation';
import { selectSmartInterventions, getCurrentContextInfo } from './smart-interventions';

export type { Message } from './craving-types';
export { ConversationStep } from './craving-types';

export class EnergyService {
  private supabase = createClient()
  private clientId: string | null = null
  private coachId: string | null = null
  private incidentId: string | null = null
  private currentStep: ConversationStep = ConversationStep.WELCOME
  private selectedBlocker: string | null = null // Store selected blocker across conversation steps
  private energyLevel: number | null = null // Store energy level rating
  private location: string | null = null // Store location
  private approach: string | null = null // Store preferred approach to getting unstuck
  private coachName: string | null = null // Store coach name for AI responses
  private coachTone: string | null = null // Store coach communication style
  private primaryIntervention: Intervention | null = null // Store smart-selected primary intervention
  private secondaryIntervention: Intervention | null = null // Store smart-selected secondary intervention
  
  constructor() {
    // Constructor can't be async, initialization will be handled by the page component
  }

  async initialize(): Promise<boolean> {
    try {
      await this.initializeSession()
      return !!this.clientId
    } catch (error) {
      console.error('❌ EnergyService initialization failed:', error);
      return false;
    }
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
          const clientDetails = await EnergyDB.fetchClientDetails(storedClientId);
          if (clientDetails) {
            this.clientId = storedClientId;
            this.coachId = clientDetails.coach_id;
            return;
          }
        } catch (error) {
          console.error('❌ Failed to fetch client details from stored ID:', error);
        }
      }
      
      // Final fallback: check API session
      const response = await fetch('/api/client-portal/auth');
      const data = await response.json();
      
      if (data.authenticated && data.client) {
        this.clientId = data.client.id;
        this.coachId = data.client.coach_id;
      }
    } catch (error) {
      console.error('❌ initializeSession failed:', error);
    }
  }
  
  async validateToken(token: string): Promise<boolean> {
    try {
      const { clientId, coachId } = await EnergyDB.fetchClientByToken(token);
      
      if (clientId && coachId) {
        this.clientId = clientId;
        this.coachId = coachId;
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('❌ validateToken failed:', error);
      return false;
    }
  }

  async getCoachInfo(): Promise<Coach | null> {
    if (!this.coachId) return null;
    return await EnergyDB.getCoachInfo(this.coachId);
  }

  async getClientInfo(): Promise<Client | null> {
    if (!this.clientId) return null;
    return await EnergyDB.fetchClientDetails(this.clientId);
  }

  async fetchClientDetails(clientId: string) {
    return await EnergyDB.fetchClientDetails(clientId);
  }

  async getCoachDetails(coachId: string) {
    return await EnergyDB.getCoachInfo(coachId);
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
              const clientDetails = await EnergyDB.fetchClientDetails(clientId);
              if (clientDetails) {
                this.clientId = clientId;
                this.coachId = clientDetails.coach_id;
              }
            } catch (error) {
              console.error('❌ Failed to fetch client details in getSessionInfo:', error);
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
          } catch (error) {
            console.error('❌ Failed to fetch client from API auth:', error);
          }
        }
      }
    }
    
    const client = this.clientId ? await this.getClientInfo() : null;
    const coach = this.coachId ? await this.getCoachInfo() : null;
    
    // Store coach info for AI responses
    if (coach) {
      this.coachName = coach.full_name;
      this.coachTone = coach.tone_preset || 'friendly';
    }
    
    return { client, coach };
  }

  // Check if there's an active incident for this client (created within the last hour)
  async hasActiveIncident(): Promise<boolean> {
    if (!this.clientId) return false;
    
    try {
      const { hasActive, incidentId } = await EnergyDB.hasActiveMovementIncident(this.clientId);
      
      if (hasActive && incidentId) {
        // If we have an active incident, store its ID
        this.incidentId = incidentId;
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ hasActiveIncident failed:', error);
      return false;
    }
  }

  // Create a new movement incident
  async createMovementIncident(): Promise<string | null> {
    try {
      // First check if there's already an active incident
      const hasActive = await this.hasActiveIncident();
      if (hasActive && this.incidentId) {
        return this.incidentId;
      }
      
      // Delegate to DB module for real implementation, fallback to mock for dev
      if (!this.clientId) {
        const mockId = `mock-movement-${Date.now()}`;
        this.incidentId = mockId;
        return mockId;
      }
      
      const incidentId = await EnergyDB.createMovementIncident(this.clientId);
      if (!incidentId) {
        console.error('❌ Failed to create movement incident for client:', this.clientId);
        return null;
      }
      
      this.incidentId = incidentId;
      return incidentId;
    } catch (error) {
      console.error('❌ createMovementIncident failed:', error);
      return null;
    }
  }

  // Get the current incident ID
  getIncidentId(): string | null {
    return this.incidentId;
  }

  // Update the blocker type for the current incident
  async updateBlockerType(blocker: string): Promise<boolean> {
    if (!this.incidentId) return false;
    return this.updateIncident({ blockerType: blocker });
  }

  // Save a message to the database
  async saveMessage(message: Omit<Message, 'id'>): Promise<Message | null> {
    if (!this.incidentId) {
      console.error('❌ Cannot save message: no incident ID');
      return null;
    }
    
    try {
      const result = await EnergyDB.saveMessage(this.incidentId, message);
      if (!result) {
        console.error('❌ Message save returned null for incident:', this.incidentId);
      }
      return result;
    } catch (error) {
      console.error('❌ saveMessage service failed:', error);
      return null;
    }
  }

  // Get all messages for the current incident
  async getMessages(): Promise<Message[]> {
    if (!this.incidentId) return [];
    return EnergyDB.getMessages(this.incidentId);
  }

  // Update the movement incident with new information
  async updateIncident(updates: Partial<MovementIncident>): Promise<boolean> {
    if (!this.incidentId) return false;
    return EnergyDB.updateMovementIncident(this.incidentId, updates);
  }

  // Get conversation history for AI context
  private async getConversationHistory(): Promise<Message[]> {
    try {
      if (!this.incidentId) return [];
      return await this.getMessages();
    } catch (error) {
      console.error('❌ Failed to get conversation history:', error);
      return [];
    }
  }

  // Perform smart intervention selection when we have enough context
  private async performSmartInterventionSelection(): Promise<void> {
    if (!this.clientId || !this.selectedBlocker || !this.energyLevel || !this.location || !this.approach) {
      console.log('❌ Missing context for smart intervention selection');
      return;
    }

    try {
      const allInterventions = await EnergyDB.getActiveClientInterventions(this.clientId, 'energy', 25);
      
      if (allInterventions.length === 0) {
        console.log('❌ No energy interventions available for smart selection');
        return;
      }

      const { timeOfDay, dayOfWeek } = getCurrentContextInfo();
      
      const smartSelection = await selectSmartInterventions({
        clientName: this.coachName || 'Client', // Use coach name as backup
        cravingType: this.selectedBlocker,
        intensity: this.energyLevel,
        location: this.location,
        trigger: this.approach,
        timeOfDay,
        dayOfWeek,
        interventionType: 'energy',
        availableInterventions: allInterventions
      });

      this.primaryIntervention = smartSelection.primaryIntervention;
      this.secondaryIntervention = smartSelection.secondaryIntervention;
      
      console.log('✅ Smart energy intervention selection completed:', {
        primary: smartSelection.primaryIntervention.name,
        secondary: smartSelection.secondaryIntervention.name,
        reasoning: smartSelection.reasoning
      });

    } catch (error) {
      console.error('❌ Smart energy intervention selection failed:', error);
    }
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
    console.log('🔍 Processing energy input:', { input: cleanValue, currentStep, isOption });
    
    // NOTE: Database updates happen when ENTERING a step (using input from previous step)
    // This "on-entry" pattern ensures data is captured immediately when user provides it
    if (isOption) {
      console.log('🔍 Processing as OPTION for energy step:', currentStep);
      switch (currentStep) {
        case ConversationStep.GAUGE_ENERGY:
          messageType = 'option_selection';
          // Entering GAUGE_ENERGY: save blocker selection from IDENTIFY_BLOCKER
          this.selectedBlocker = cleanValue; // Store selected blocker for later use
          await this.updateIncident({ blockerType: cleanValue });
          break;
          
        case ConversationStep.IDENTIFY_LOCATION:
          messageType = 'intensity_rating';
          // Entering IDENTIFY_LOCATION: save energy level from GAUGE_ENERGY
          const energyLevel = parseInt(cleanValue, 10);
          if (!isNaN(energyLevel)) {
            this.energyLevel = energyLevel;
            await this.updateIncident({ energyLevel: energyLevel });
          }
          break;
          
        case ConversationStep.IDENTIFY_APPROACH:
          messageType = 'option_selection';
          // Entering IDENTIFY_APPROACH: save location from IDENTIFY_LOCATION
          this.location = cleanValue;
          // Note: location isn't directly stored in movement_incidents table
          break;
          
        case ConversationStep.SUGGEST_TACTIC:
          messageType = 'option_selection';
          // Entering SUGGEST_TACTIC: save goal/preference from IDENTIFY_GOAL
          this.approach = cleanValue;
          // Note: goal/preference isn't directly stored in movement_incidents table
          // Now we have all context - perform smart intervention selection
          await this.performSmartInterventionSelection();
          break;

        case ConversationStep.RATE_RESULT:
          console.log('🔍 Energy RATE_RESULT option case - setting messageType to intensity_rating');
          messageType = 'intensity_rating';
          const resultRating = parseInt(cleanValue, 10);
          console.log('Energy RATE_RESULT: cleanValue =', cleanValue, 'resultRating =', resultRating);
          if (!isNaN(resultRating)) {
            console.log('Updating movement incident with post_energy_level:', resultRating);
            await this.updateIncident({ 
              postEnergyLevel: resultRating,
              resolvedAt: new Date() // Mark as resolved when rating is provided
            });
            // Transition to CLOSE step after rating is provided
            currentStep = ConversationStep.CLOSE;
          } else {
            console.log('ERROR: resultRating is NaN, not updating movement incident');
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
                  activityType: selectedIntervention.name
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
                activityType: intervention.name
              });
            }
          }
          break;
      }
    }
    
    // Handle text input for certain steps
    if (!isOption) {
      switch (currentStep) {
        case ConversationStep.GAUGE_ENERGY:
          // Text input for blocker selection (like "too tired")
          messageType = 'option_selection';
          this.selectedBlocker = cleanValue; // Store selected blocker for later use
          await this.updateIncident({ blockerType: cleanValue });
          break;
          
        case ConversationStep.IDENTIFY_LOCATION:
          // Text input for energy level rating (like "3")
          messageType = 'intensity_rating';
          const energyLevel = parseInt(cleanValue, 10);
          if (!isNaN(energyLevel)) {
            this.energyLevel = energyLevel;
            await this.updateIncident({ energyLevel: energyLevel });
          }
          break;
          
        case ConversationStep.SUGGEST_TACTIC:
          // Text input for approach/preference (from IDENTIFY_APPROACH step)
          messageType = 'option_selection';
          this.approach = cleanValue;
          // Note: approach preference isn't directly stored in movement_incidents table
          // Now we have all context - perform smart intervention selection
          await this.performSmartInterventionSelection();
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
                  activityType: selectedIntervention.name
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
          console.log('🔍 Energy RATE_RESULT text case - setting messageType to intensity_rating');
          messageType = 'intensity_rating';
          const resultRating = parseInt(cleanValue, 10);
          console.log('Energy RATE_RESULT (text): cleanValue =', cleanValue, 'resultRating =', resultRating);
          if (!isNaN(resultRating)) {
            console.log('Updating movement incident with post_energy_level:', resultRating);
            await this.updateIncident({ 
              postEnergyLevel: resultRating,
              resolvedAt: new Date() // Mark as resolved when rating is provided
            });
            // Transition to CLOSE step after rating is provided
            currentStep = ConversationStep.CLOSE;
          } else {
            console.log('ERROR: resultRating is NaN, not updating movement incident');
          }
          break;
      }
    }
    
    // Create and save client message
    console.log('🔍 Final messageType before creating energy message:', messageType);
    const clientMessage: Message = {
      id: `client-${Date.now()}`,
      sender: 'client',
      text: cleanValue,
      type: messageType,
      timestamp: new Date(),
    };
    
    await onMessage(clientMessage);
    
    // Get conversation history for AI context
    const conversationHistory = await this.getConversationHistory();
    
    // Get coach's response
    const coachRes: EnergyResponse = await getEnergyResponse({
      currentStep,
      clientName,
      clientId: this.clientId || '',
      selectedBlocker: this.selectedBlocker || undefined, // Pass stored selectedBlocker to coach response
      chosenIntervention: updatedChosenIntervention || undefined,
      coachName: this.coachName || undefined,
      coachTone: this.coachTone || undefined,
      energyLevel: this.energyLevel || undefined,
      location: this.location || undefined,
      approach: this.approach || undefined,
      conversationHistory,
      primaryIntervention: this.primaryIntervention || undefined,
      secondaryIntervention: this.secondaryIntervention || undefined,
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
      const followUpConversationHistory = await this.getConversationHistory();
      const followUpRes = await getEnergyResponse({
        currentStep: ConversationStep.RATE_RESULT,
        clientName,
        clientId: this.clientId || '',
        selectedBlocker: this.selectedBlocker || undefined, // Pass stored selectedBlocker to coach response
        chosenIntervention,
        coachName: this.coachName || undefined,
        coachTone: this.coachTone || undefined,
        energyLevel: this.energyLevel || undefined,
        location: this.location || undefined,
        approach: this.approach || undefined,
        conversationHistory: followUpConversationHistory,
        primaryIntervention: this.primaryIntervention || undefined,
        secondaryIntervention: this.secondaryIntervention || undefined,
      });
      
      await onMessage(followUpRes.response);
      onStateUpdate({
        currentStep: followUpRes.nextStep,
        optionChoices: followUpRes.options || []
      });
    }, 30 * 1000); // 30 seconds for testing
  }

  async getWelcomeMessage(clientName: string): Promise<{ response: Message; nextStep: ConversationStep; options?: Array<Option | string> }> {
    const welcomeConversationHistory = await this.getConversationHistory();
    const welcomeRes = await getEnergyResponse({
      currentStep: ConversationStep.WELCOME,
      clientName,
      clientId: this.clientId || '',
      selectedBlocker: this.selectedBlocker || undefined, // Pass stored selectedBlocker to coach response
      coachName: this.coachName || undefined,
      coachTone: this.coachTone || undefined,
      energyLevel: this.energyLevel || undefined,
      location: this.location || undefined,
      approach: this.approach || undefined,
      conversationHistory: welcomeConversationHistory,
      primaryIntervention: this.primaryIntervention || undefined,
      secondaryIntervention: this.secondaryIntervention || undefined,
    });
    return welcomeRes;
  }

  async getBlockerIdentificationMessage(clientName: string): Promise<{ response: Message; nextStep: ConversationStep; options?: Array<Option | string> }> {
    const blockerConversationHistory = await this.getConversationHistory();
    const blockerRes = await getEnergyResponse({
      currentStep: ConversationStep.IDENTIFY_BLOCKER,
      clientName,
      clientId: this.clientId || '',
      selectedBlocker: this.selectedBlocker || undefined, // Pass stored selectedBlocker to coach response
      coachName: this.coachName || undefined,
      coachTone: this.coachTone || undefined,
      energyLevel: this.energyLevel || undefined,
      location: this.location || undefined,
      approach: this.approach || undefined,
      conversationHistory: blockerConversationHistory,
      primaryIntervention: this.primaryIntervention || undefined,
      secondaryIntervention: this.secondaryIntervention || undefined,
    });
    return blockerRes;
  }

  // Helper method to get the initial energy level
  private async getInitialEnergyLevel(): Promise<number> {
    if (!this.incidentId) return 0;
    // This would need to be implemented in energy-db.ts if needed
    return 0;
  }
}

export default EnergyService