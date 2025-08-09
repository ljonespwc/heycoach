// Conversation flow logic for Craving SOS
import { ConversationStep, Message, Intervention } from './craving-types';
import { getActiveClientInterventions, updateIncidentByClientId } from './craving-db';
import { generateCoachResponse } from '../openai/coach-ai';
import { selectSmartInterventions, getCurrentContextInfo, filterInterventionsByLocation, getPreviousEffectiveness } from './smart-interventions';

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
  coachTone,
  intensity,
  location,
  trigger,
  conversationHistory,
  primaryIntervention,
  secondaryIntervention
}: {
  currentStep: ConversationStep;
  clientName: string;
  clientId: string;
  selectedFood?: string;
  chosenIntervention?: { name: string; description: string };
  coachName?: string;
  coachTone?: string;
  intensity?: number;
  location?: string;
  trigger?: string;
  conversationHistory?: Message[];
  primaryIntervention?: Intervention;
  secondaryIntervention?: Intervention;
}): Promise<CoachResponse> {
  const now = new Date();
  
  // Helper function to get AI response - throw error on failure
  const getResponseText = async (step: ConversationStep, interventions?: Intervention[]): Promise<string> => {
    try {
      const aiResponse = await generateCoachResponse({
        clientName,
        coachName,
        coachTone,
        selectedFood,
        intensity,
        location,
        trigger,
        chosenIntervention,
        interventions,
        conversationHistory,
        currentStep: step
      });
      return aiResponse;
    } catch (error) {
      console.error('❌ AI response generation failed:', error);
      throw new Error('Unable to generate coach response. Please try again.');
    }
  };
  
  switch (currentStep) {
    case ConversationStep.IDENTIFY_STRUGGLE:
      return {
        response: {
          id: `coach-${now.getTime()}`,
          sender: 'coach',
          text: `Hi ${clientName}! I'm here to help you get the support you need. What are you struggling with right now?`,
          type: 'option_selection',
          timestamp: now,
        },
        nextStep: ConversationStep.IDENTIFY_STRUGGLE,
        options: [
          { emoji: '🍰', name: 'I\'m having a craving', value: 'craving' },
          { emoji: '⚡', name: 'I need an energy boost', value: 'energy' }
        ]
      };
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
          { emoji: '🍟', name: 'Chips/Fries' },
          { emoji: '🍰', name: 'Cake/Dessert' },
          { emoji: '🍞', name: 'Bread/Carbs' },
          { emoji: '🍭', name: 'Candy/Sweets' },
          { emoji: '🍔', name: 'Fast Food' },
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
          { emoji: '🏋️', name: 'Gym' },
          { emoji: '👫', name: "Friend's house" },
          { emoji: '🏨', name: 'Hotel/Travel' },
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
          { emoji: '🎉', name: 'Celebration' },
          { emoji: '🌙', name: 'Late night' },
          { emoji: '🍷', name: 'Social event' },
        ]
      };
    case ConversationStep.SUGGEST_TACTIC:
      // Use the pre-selected primary intervention from smart selection
      if (primaryIntervention) {
        const tacticText = await getResponseText(ConversationStep.SUGGEST_TACTIC, [primaryIntervention]);
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
          interventions: [primaryIntervention]
        };
      }
      
      // Fallback to old behavior if no smart selection available (shouldn't happen)
      const allInterventions = await getActiveClientInterventions(clientId, 25);
      const locationFilteredInterventions = filterInterventionsByLocation(allInterventions, location || 'Home');
      
      if (locationFilteredInterventions.length === 0) {
        // No interventions available - return error message
        return {
          response: {
            id: `coach-${now.getTime()}`,
            sender: 'coach',
            text: "I don't have any interventions configured for you yet. Please contact your coach to set up your personalized strategies.",
            type: 'text',
            timestamp: now,
          },
          nextStep: ConversationStep.CLOSE
        };
      }

      // Use smart intervention selection
      const { timeOfDay, dayOfWeek } = getCurrentContextInfo();
      
      try {
        // Get previous effectiveness data
        const previousEffectiveness = await getPreviousEffectiveness(clientId, {
          cravingType: selectedFood,
          location,
          trigger,
          interventionType: 'craving'
        });

        const smartSelection = await selectSmartInterventions({
          clientName,
          cravingType: selectedFood || 'food',
          intensity: intensity || 5,
          location: location || 'unknown',
          trigger: trigger || 'unknown',
          timeOfDay,
          dayOfWeek,
          interventionType: 'craving',
          availableInterventions: allInterventions,
          previousEffectiveness
        });

        const tacticText = await getResponseText(ConversationStep.SUGGEST_TACTIC, [smartSelection.primaryIntervention]);
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
          interventions: [smartSelection.primaryIntervention]
        };
      } catch (error) {
        console.error('❌ Smart intervention selection failed, using first available:', error);
        // Fallback to first intervention if smart selection fails
        const tacticText = await getResponseText(ConversationStep.SUGGEST_TACTIC, [locationFilteredInterventions[0]]);
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
          interventions: [locationFilteredInterventions[0]]
        };
      }
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
        const secondEncouragementText = await getResponseText(ConversationStep.ENCOURAGEMENT, secondaryIntervention ? [secondaryIntervention] : []);
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
        
        // Use the pre-selected secondary intervention from smart selection
        if (secondaryIntervention) {
          const secondInterventionText = await getResponseText(ConversationStep.SUGGEST_TACTIC, [secondaryIntervention]);
          return {
            response: {
              id: `coach-${now.getTime()}`,
              sender: 'coach',
              text: secondInterventionText,
              type: 'text',
              timestamp: now,
            },
            nextStep: ConversationStep.ENCOURAGEMENT,
            options: [
              { emoji: '👍', name: "Yes, I'll try it" }
            ],
            interventions: [secondaryIntervention]
          };
        }
        
        // Fallback - get all interventions and pick a different one
        const allInterventions = await getActiveClientInterventions(clientId, 25);
        const locationFilteredInterventions = filterInterventionsByLocation(allInterventions, location || 'Home');
        const filteredInterventions = locationFilteredInterventions.filter(i => 
          !primaryIntervention || i.id !== primaryIntervention.id
        );
        
        if (filteredInterventions.length === 0) {
          // No more interventions available
          return {
            response: {
              id: `coach-${now.getTime()}`,
              sender: 'coach',
              text: "I don't have any other interventions to suggest right now. Please contact your coach for more strategies.",
              type: 'text',
              timestamp: now,
            },
            nextStep: ConversationStep.CLOSE
          };
        }
        
        // We have a second intervention to suggest
        const secondInterventionText = await getResponseText(ConversationStep.SUGGEST_TACTIC, [filteredInterventions[0]]);
        return {
          response: {
            id: `coach-${now.getTime()}`,
            sender: 'coach',
            text: secondInterventionText,
            type: 'text',
            timestamp: now,
          },
          nextStep: ConversationStep.ENCOURAGEMENT,
          options: [
            { emoji: '👍', name: "Yes, I'll try it" }
          ],
          interventions: [filteredInterventions[0]]
        };
      }
      
      // First option was accepted - show encouragement and include full description of the chosen intervention
      console.log('🔍 ENCOURAGEMENT DEBUG:');
      console.log('  chosenIntervention:', chosenIntervention);
      console.log('  primaryIntervention:', primaryIntervention?.name);
      console.log('  secondaryIntervention:', secondaryIntervention?.name);
      console.log('  conversationHistory last 2:', conversationHistory?.slice(-2).map(m => ({ sender: m.sender, text: m.text.slice(0, 50) })));
      
      // SIMPLE LOGIC: Use primary intervention UNLESS we can prove we're in secondary flow
      // Only use secondary if the user previously clicked "Another idea" in this conversation
      let interventionForEncouragement = primaryIntervention;
      
      if (conversationHistory && secondaryIntervention) {
        // Look for "Another idea" in the client's message history
        const clientMessages = conversationHistory.filter(m => m.sender === 'client');
        const hasClickedAnotherIdea = clientMessages.some(msg => msg.text.includes('Another idea'));
        
        if (hasClickedAnotherIdea) {
          // User clicked "Another idea" at some point, so we're in secondary intervention flow
          interventionForEncouragement = secondaryIntervention;
          console.log('✅ Found "Another idea" in history - using secondary intervention');
        } else {
          console.log('✅ No "Another idea" found - using primary intervention');
        }
      }
      
      console.log('✅ Final intervention for encouragement:', interventionForEncouragement?.name);
      const encouragementText = await getResponseText(ConversationStep.ENCOURAGEMENT, interventionForEncouragement ? [interventionForEncouragement] : []);
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
