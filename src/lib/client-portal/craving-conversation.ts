// Conversation flow logic for Craving SOS
import { ConversationStep, Message, Intervention } from './craving-types';
import { getRandomClientInterventions, updateIncidentByClientId } from './craving-db';
import { generateCoachResponse, getFallbackResponse } from '../openai/coach-ai';

export interface Option {
  emoji?: string;
  name: string;
  value?: string;
  text?: string;
}

export type CoachResponse = {
  response: Message;
  nextStep: ConversationStep;
  options?: Array<Option | string>;
  interventions?: Intervention[];
};

// Main async function to get the coach's response for a given step
export async function getCoachResponse({
  currentStep,
  clientName,
  clientId,
  selectedFood,
  chosenIntervention,
  coachName,
  intensity,
  location,
  trigger
}: {
  currentStep: ConversationStep;
  clientName: string;
  clientId: string;
  selectedFood?: string;
  chosenIntervention?: { name: string; description: string };
  coachName?: string;
  intensity?: number;
  location?: string;
  trigger?: string;
}): Promise<CoachResponse> {
  const now = new Date();
  
  // Helper function to get AI response with fallback
  const getResponseText = async (step: ConversationStep, interventions?: Intervention[]): Promise<string> => {
    try {
      const aiResponse = await generateCoachResponse({
        clientName,
        coachName,
        selectedFood,
        intensity,
        location,
        trigger,
        chosenIntervention,
        interventions,
        currentStep: step
      });
      return aiResponse;
    } catch (error) {
      console.log('🤖 Falling back to standard response for', step, 'due to:', error);
      return getFallbackResponse(step, {
        clientName,
        coachName,
        selectedFood,
        intensity,
        location,
        trigger,
        chosenIntervention,
        interventions,
        currentStep: step
      });
    }
  };
  
  switch (currentStep) {
    case ConversationStep.WELCOME:
      const welcomeText = await getResponseText(ConversationStep.WELCOME);
      return {
        response: {
          id: `coach-${now.getTime()}`,
          sender: 'coach',
          text: welcomeText,
          type: 'text',
          timestamp: now,
        },
        nextStep: ConversationStep.IDENTIFY_CRAVING
      };
    case ConversationStep.IDENTIFY_CRAVING:
      const cravingText = await getResponseText(ConversationStep.IDENTIFY_CRAVING);
      return {
        response: {
          id: `coach-${now.getTime()}`,
          sender: 'coach',
          text: cravingText,
          type: 'option_selection',
          timestamp: now,
        },
        nextStep: ConversationStep.GAUGE_INTENSITY,
        options: [
          { emoji: '🍫', name: 'Chocolate' },
          { emoji: '🍕', name: 'Pizza' },
          { emoji: '🍸', name: 'Drink' },
          { emoji: '🍦', name: 'Ice Cream' },
          { emoji: '🍪', name: 'Cookies' },
        ]
      };
    case ConversationStep.GAUGE_INTENSITY:
      const intensityText = await getResponseText(ConversationStep.GAUGE_INTENSITY);
      return {
        response: {
          id: `coach-${now.getTime()}`,
          sender: 'coach',
          text: intensityText,
          type: 'intensity_rating',
          timestamp: now,
        },
        nextStep: ConversationStep.IDENTIFY_LOCATION
      };
    case ConversationStep.IDENTIFY_LOCATION:
      return {
        response: {
          id: `coach-${now.getTime()}`,
          sender: 'coach',
          text: await getResponseText(ConversationStep.IDENTIFY_LOCATION),
          type: 'location_selection',
          timestamp: now,
        },
        nextStep: ConversationStep.IDENTIFY_TRIGGER,
        options: [
          { emoji: '🏠', name: 'Home' },
          { emoji: '🏢', name: 'Work' },
          { emoji: '🚗', name: 'Car' },
          { emoji: '🛒', name: 'Store' },
          { emoji: '🍽️', name: 'Restaurant' },
        ]
      };
    case ConversationStep.IDENTIFY_TRIGGER:
      return {
        response: {
          id: `coach-${now.getTime()}`,
          sender: 'coach',
          text: await getResponseText(ConversationStep.IDENTIFY_TRIGGER),
          type: 'option_selection',
          timestamp: now,
        },
        nextStep: ConversationStep.SUGGEST_TACTIC,
        options: [
          { emoji: '😐', name: 'Boredom' },
          { emoji: '😣', name: 'Stress' },
          { emoji: '👀', name: 'Saw food' },
          { emoji: '🔁', name: 'Habit' },
          { emoji: '👥', name: 'Social pressure' },
        ]
      };
    case ConversationStep.SUGGEST_TACTIC:
      // Fetch interventions for the client
      const interventions = await getRandomClientInterventions(clientId, 1); // Just get one intervention initially
      
      if (interventions.length === 0) {
        // Fallback if no interventions found
        const fallbackInterventions = [{ id: '', name: 'Deep breathing and water', description: 'Take 3-5 deep breaths and drink a full glass of water slowly.' }];
        const tacticText = await getResponseText(ConversationStep.SUGGEST_TACTIC, fallbackInterventions);
        return {
          response: {
            id: `coach-${now.getTime()}`,
            sender: 'coach',
            text: tacticText,
            type: 'tactic_response',
            timestamp: now,
          },
          nextStep: ConversationStep.ENCOURAGEMENT,
          options: [
            { emoji: '👍', name: "Yes, I'll try it" },
            { emoji: '💡', name: "Another idea" }
          ],
          interventions: fallbackInterventions
        };
      }
      
      // We have an intervention to suggest
      const tacticText = await getResponseText(ConversationStep.SUGGEST_TACTIC, interventions);
      return {
        response: {
          id: `coach-${now.getTime()}`,
          sender: 'coach',
          text: tacticText,
          type: 'tactic_response',
          timestamp: now,
        },
        nextStep: ConversationStep.ENCOURAGEMENT,
        options: [
          { emoji: '👍', name: "Yes, I'll try it" },
          { emoji: '💡', name: "Another idea" }
        ],
        interventions
      };
    case ConversationStep.ENCOURAGEMENT:
      // Check if this is a response to "Another idea" or if we're accepting a second intervention
      console.log('ENCOURAGEMENT step with chosenIntervention:', chosenIntervention);
      const isSecondOption = chosenIntervention && chosenIntervention.name === "Another idea";
      // If we're accepting a second intervention (after "Another idea" was selected)
      // Use a more specific type to avoid the 'any' TypeScript error
      const isAcceptingSecondIntervention = chosenIntervention && 
                                          (chosenIntervention as { isSecondInterventionAccepted?: boolean }).isSecondInterventionAccepted === true;
      console.log('isSecondOption:', isSecondOption, 'isAcceptingSecondIntervention:', isAcceptingSecondIntervention);
      
      // If we're accepting the second intervention (after clicking "Yes, I'll try it" for the second option)
      if (isAcceptingSecondIntervention) {
        console.log('User accepted the second intervention');
        // Show encouragement for the second intervention
        const secondEncouragementText = await getResponseText(ConversationStep.ENCOURAGEMENT);
        return {
          response: {
            id: `coach-${now.getTime()}`,
            sender: 'coach',
            text: secondEncouragementText,
            type: 'text',
            timestamp: now,
          },
          nextStep: ConversationStep.RATE_RESULT
        };
      } else if (isSecondOption) {
        console.log('Getting second intervention option for client:', clientId);
        // Get a second intervention option
        const secondIntervention = await getRandomClientInterventions(clientId, 1);
        
        if (secondIntervention.length === 0) {
          // Fallback if no interventions found
          const fallbackSecondInterventions = [{ id: '', name: 'Physical activity', description: 'Take a short walk or do some gentle stretching to redirect your attention and energy.' }];
          const secondOptionText = await getResponseText(ConversationStep.ENCOURAGEMENT, fallbackSecondInterventions);
          return {
            response: {
              id: `coach-${now.getTime()}`,
              sender: 'coach',
              text: secondOptionText,
              type: 'text',
              timestamp: now,
            },
            nextStep: ConversationStep.RATE_RESULT,
            options: [
              { emoji: '👍', name: "Yes, I'll try it" }
            ],
            interventions: fallbackSecondInterventions
          };
        }
        
        // We have a second intervention to suggest
        const secondInterventionText = await getResponseText(ConversationStep.ENCOURAGEMENT, secondIntervention);
        return {
          response: {
            id: `coach-${now.getTime()}`,
            sender: 'coach',
            text: secondInterventionText,
            type: 'text',
            timestamp: now,
          },
          nextStep: ConversationStep.ENCOURAGEMENT, // Use ENCOURAGEMENT instead of FOLLOWUP
          options: [
            { emoji: '👍', name: "Yes, I'll try it" }
          ],
          interventions: secondIntervention
        };
      }
      
      // First option was accepted - show encouragement and include full description of the chosen intervention
      const encouragementText = await getResponseText(ConversationStep.ENCOURAGEMENT);
      return {
        response: {
          id: `coach-${now.getTime()}`,
          sender: 'coach',
          text: encouragementText,
          type: 'text',
          timestamp: now,
        },
        nextStep: ConversationStep.RATE_RESULT
      };
    case ConversationStep.RATE_RESULT:
      // When we reach the rate result step, mark the incident as resolved
      if (clientId) {
        try {
          // Update the incident to set resolved_at
          console.log('Setting resolved_at for incident');
          await updateIncidentByClientId(clientId, { resolvedAt: new Date() });
        } catch (error) {
          console.error('Failed to update resolved_at:', error);
        }
      }
      
      const rateResultText = await getResponseText(ConversationStep.RATE_RESULT);
      return {
        response: {
          id: `coach-${now.getTime()}`,
          sender: 'coach',
          text: rateResultText,
          type: 'intensity_rating',
          timestamp: now,
        },
        nextStep: ConversationStep.RATE_RESULT
      };
    case ConversationStep.CLOSE:
      const closeText = await getResponseText(ConversationStep.CLOSE);
      return {
        response: {
          id: `coach-${now.getTime()}`,
          sender: 'coach',
          text: closeText,
          type: 'text',
          timestamp: now,
        },
        nextStep: ConversationStep.CLOSE
      };
    default:
      const defaultText = await getResponseText(ConversationStep.CLOSE);
      return {
        response: {
          id: `coach-${now.getTime()}`,
          sender: 'coach',
          text: defaultText,
          type: 'text',
          timestamp: now,
        },
        nextStep: ConversationStep.CLOSE
      };
  }
}
