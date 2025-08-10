// Conversation flow logic for Energy Boost
import { ConversationStep, Message, Intervention } from './craving-types';
import { getActiveEnergyInterventions, updateMovementIncidentByClientId } from './energy-db';
import { generateCoachResponse } from '../openai/coach-ai';
import { selectSmartInterventions, getCurrentContextInfo, filterInterventionsByLocation, getPreviousEffectiveness } from './smart-interventions';

export interface Option {
  emoji?: string;
  name: string;
  value?: string;
  text?: string;
}

export type EnergyResponse = {
  response: Message;
  nextStep: ConversationStep;
  options?: Array<Option | string>;
  interventions?: Intervention[];
};

// Main async function to get the coach's response for energy boost
export async function getEnergyResponse({
  currentStep,
  clientName,
  clientId,
  selectedBlocker,
  chosenIntervention,
  coachName,
  coachTone,
  energyLevel,
  location,
  approach,
  conversationHistory,
  primaryIntervention,
  secondaryIntervention
}: {
  currentStep: ConversationStep;
  clientName: string;
  clientId: string;
  selectedBlocker?: string;
  chosenIntervention?: { name: string; description: string };
  coachName?: string;
  coachTone?: string;
  energyLevel?: number;
  location?: string;
  approach?: string;
  conversationHistory?: Message[];
  primaryIntervention?: Intervention;
  secondaryIntervention?: Intervention;
}): Promise<EnergyResponse> {
  const now = new Date();

  // Helper function to get AI-enhanced response text
  const getResponseText = async (step: ConversationStep, interventions?: Intervention[]): Promise<string> => {
    try {
      // Build context for AI response - use energy-specific fields
      const context = {
        currentStep: step,
        clientName,
        selectedFood: selectedBlocker, // Still map for AI compatibility
        intensity: energyLevel,
        location,
        trigger: approach, // Map approach to trigger for AI compatibility
        coachName,
        coachTone: coachTone || 'friendly',
        interventions,
        conversationHistory: conversationHistory || [],
        // Energy-specific context
        isEnergyContext: true,
        selectedBlocker,
        energyLevel,
        approach
      };

      const aiResponse = await generateCoachResponse(context);
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
        nextStep: ConversationStep.IDENTIFY_BLOCKER
      };

    case ConversationStep.IDENTIFY_BLOCKER:
      const blockerText = await getResponseText(ConversationStep.IDENTIFY_BLOCKER);
      return {
        response: {
          id: `coach-${now.getTime()}`,
          sender: 'coach',
          text: blockerText,
          type: 'option_selection',
          timestamp: now,
        },
        nextStep: ConversationStep.GAUGE_ENERGY,
        options: [
          { emoji: '😴', name: 'Too tired' },
          { emoji: '⏰', name: 'No time' },
          { emoji: '😑', name: 'Not motivated' },
          { emoji: '🎯', name: "Don't know what to do" },
          { emoji: '😰', name: 'Feeling overwhelmed' },
          { emoji: '🚫', name: "Don't feel like it" },
          { emoji: '🌧️', name: 'Bad weather' },
          { emoji: '🏗️', name: 'Equipment issues' },
          { emoji: '🤒', name: 'Not feeling well' }
        ]
      };

    case ConversationStep.GAUGE_ENERGY:
      const energyText = await getResponseText(ConversationStep.GAUGE_ENERGY);
      return {
        response: {
          id: `coach-${now.getTime()}`,
          sender: 'coach',
          text: energyText,
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
        nextStep: ConversationStep.IDENTIFY_APPROACH,
        options: [
          { emoji: '🏠', name: 'Home' },
          { emoji: '🏢', name: 'Work' },
          { emoji: '🏋️', name: 'Gym' },
          { emoji: '🌳', name: 'Outdoors' },
          { emoji: '🚗', name: 'Car/Transit' },
          { emoji: '🛒', name: 'Public space' }
        ]
      };

    case ConversationStep.IDENTIFY_APPROACH:
      return {
        response: {
          id: `coach-${now.getTime()}`,
          sender: 'coach',
          text: await getResponseText(ConversationStep.IDENTIFY_APPROACH),
          type: 'option_selection',
          timestamp: now,
        },
        nextStep: ConversationStep.SUGGEST_TACTIC,
        options: [
          { emoji: '🎵', name: 'Music or external energy' },
          { emoji: '🤏', name: 'Starting really small' },
          { emoji: '🎯', name: 'Having a clear plan' },
          { emoji: '🤝', name: 'Connecting with someone' },
          { emoji: '🌱', name: 'Changing my environment' },
          { emoji: '🧠', name: 'Shifting how I think about it' }
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
          interventions: primaryIntervention ? [primaryIntervention] : undefined
        };
      }

      // Fallback to getting all client interventions if no smart selection
      try {
        console.log('Getting all client interventions for smart selection...');
        const allInterventions = await getActiveEnergyInterventions(clientId);
        const locationFilteredInterventions = filterInterventionsByLocation(allInterventions, location || 'Home');

        if (locationFilteredInterventions.length > 0) {
          // Perform smart selection using current context
          const contextInfo = getCurrentContextInfo();

          // Get previous effectiveness data
          const previousEffectiveness = await getPreviousEffectiveness(clientId, {
            cravingType: selectedBlocker,
            location,
            trigger: approach,
            interventionType: 'energy'
          });

          const smartSelection = await selectSmartInterventions({
            clientName,
            cravingType: selectedBlocker || '',
            intensity: energyLevel || 5,
            location: location || '',
            trigger: approach || '',
            timeOfDay: contextInfo.timeOfDay,
            dayOfWeek: contextInfo.dayOfWeek,
            interventionType: 'energy',
            availableInterventions: locationFilteredInterventions,
            previousEffectiveness
          });

          if (smartSelection) {
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
              interventions: [smartSelection.primaryIntervention, smartSelection.secondaryIntervention]
            };
          }
        }

        // Final fallback to first available intervention
        if (locationFilteredInterventions.length > 0) {
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

        // No interventions available - return error message
        return {
          response: {
            id: `coach-${now.getTime()}`,
            sender: 'coach',
            text: 'I don\'t have any interventions configured for you yet. Please contact your coach to set up your personalized strategies.',
            type: 'text',
            timestamp: now,
          },
          nextStep: ConversationStep.CLOSE
        };
      } catch (error) {
        console.error('❌ Error getting interventions:', error);
        return {
          response: {
            id: `coach-${now.getTime()}`,
            sender: 'coach',
            text: 'I\'m having trouble accessing your strategies right now. Please try again or contact your coach.',
            type: 'text',
            timestamp: now,
          },
          nextStep: ConversationStep.CLOSE
        };
      }

    case ConversationStep.ENCOURAGEMENT:
      // Check if this is a response to "Another idea" or if we're accepting a second intervention
      const isSecondOption = chosenIntervention && chosenIntervention.name === "Another idea";
      // If we're accepting a second intervention (after "Another idea" was selected)
      // Use a more specific type to avoid the 'any' TypeScript error
      const isAcceptingSecondIntervention = chosenIntervention && 
                                          (chosenIntervention as { isSecondInterventionAccepted?: boolean }).isSecondInterventionAccepted === true;
      
      // If we're accepting the second intervention (after clicking "Yes, I'll try it" for the second option)
      if (isAcceptingSecondIntervention) {
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
        console.log('Getting second energy intervention option for client:', clientId);
        
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
        const allInterventions = await getActiveEnergyInterventions(clientId, 25);
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
      console.log('🔍 ENERGY ENCOURAGEMENT DEBUG:');
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

    case ConversationStep.CHECK_ACTIVITY_COMPLETION:
      const activityText = await getResponseText(ConversationStep.CHECK_ACTIVITY_COMPLETION, 
        primaryIntervention ? [primaryIntervention] : undefined);
      
      // Check if this is a follow-up response (celebration/encouragement)
      const lastClientMessage = conversationHistory?.slice().reverse().find(msg => msg.sender === 'client');
      const isFollowUpResponse = lastClientMessage && (
        lastClientMessage.text === 'I did!' || 
        lastClientMessage.text === "I didn't" ||
        (lastClientMessage.text.toLowerCase().includes('did') && 
         !lastClientMessage.text.toLowerCase().includes("i'll try it"))
      );
      
      if (isFollowUpResponse) {
        // This is the celebration/encouragement response, move to effectiveness rating
        return {
          response: {
            id: `coach-${now.getTime()}`,
            sender: 'coach',
            text: activityText,
            type: 'text',
            timestamp: now,
          },
          nextStep: ConversationStep.RATE_RESULT
        };
      } else {
        // This is the initial activity completion question
        return {
          response: {
            id: `coach-${now.getTime()}`,
            sender: 'coach', 
            text: activityText,
            type: 'option_selection',
            timestamp: now,
          },
          nextStep: ConversationStep.CHECK_ACTIVITY_COMPLETION, // Stay in same step for sub-response
          options: [
            { emoji: '✅', name: 'I did!' },
            { emoji: '😔', name: "I didn't" }
          ]
        };
      }

    case ConversationStep.RATE_RESULT:
      // When we reach the rate result step, mark the incident as resolved
      if (clientId) {
        try {
          await updateMovementIncidentByClientId(clientId, { resolvedAt: new Date() });
        } catch (error) {
          console.error('❌ Failed to mark movement incident as resolved:', error);
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