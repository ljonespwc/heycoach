// Conversation flow logic for Craving SOS
import { ConversationStep, Message, Intervention } from './craving-types';
import { getRandomClientInterventions, updateIncidentByClientId } from './craving-db';

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
  chosenIntervention
}: {
  currentStep: ConversationStep;
  clientName: string;
  clientId: string;
  selectedFood?: string;
  chosenIntervention?: { name: string; description: string };
}): Promise<CoachResponse> {
  const now = new Date();
  switch (currentStep) {
    case ConversationStep.WELCOME:
      return {
        response: {
          id: `coach-${now.getTime()}`,
          sender: 'coach',
          text: `Hi ${clientName}, I see you're having a craving moment. Let's work through this together.`,
          type: 'text',
          timestamp: now,
        },
        nextStep: ConversationStep.IDENTIFY_CRAVING
      };
    case ConversationStep.IDENTIFY_CRAVING:
      return {
        response: {
          id: `coach-${now.getTime()}`,
          sender: 'coach',
          text: `What's calling your name? (tap or type)`,
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
      return {
        response: {
          id: `coach-${now.getTime()}`,
          sender: 'coach',
          text: `How intense is the pull right now? (1-10)`,
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
          text: `Where are you right now?`,
          type: 'text',
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
          text: `What do you think triggered this craving?`,
          type: 'text',
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
        return {
          response: {
            id: `coach-${now.getTime()}`,
            sender: 'coach',
            text: `I understand how challenging this can be. Instead of reaching for ${selectedFood || 'that'}, let's try **"Deep breathing and water"**: Take 3-5 deep breaths and drink a full glass of water slowly. Want to give it a try?`,
            type: 'text',
            timestamp: now,
          },
          nextStep: ConversationStep.ENCOURAGEMENT,
          options: [
            { emoji: '👍', name: "Yes, I'll try it" },
            { emoji: '💡', name: "Another idea" }
          ],
          interventions: [{ id: '', name: 'Deep breathing and water', description: 'Take 3-5 deep breaths and drink a full glass of water slowly.' }]
        };
      }
      
      // We have an intervention to suggest
      return {
        response: {
          id: `coach-${now.getTime()}`,
          sender: 'coach',
          text: `I understand how challenging this can be. Instead of reaching for ${selectedFood || 'that'}, how about trying **"${interventions[0].name}"**: ${interventions[0].description}. Want to give it a try?`,
          type: 'text',
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
        return {
          response: {
            id: `coach-${now.getTime()}`,
            sender: 'coach',
            text: `Great choice! After your strategy, take a moment to notice how you feel. I'll check back with you in 15 minutes to see how you did. You've got this!`,
            type: 'text',
            timestamp: now,
          },
          nextStep: ConversationStep.FOLLOWUP
        };
      } else if (isSecondOption) {
        console.log('Getting second intervention option for client:', clientId);
        // Get a second intervention option
        const secondIntervention = await getRandomClientInterventions(clientId, 1);
        
        if (secondIntervention.length === 0) {
          // Fallback if no interventions found
          return {
            response: {
              id: `coach-${now.getTime()}`,
              sender: 'coach',
              text: `Let's try a different approach. How about taking a short walk or doing some gentle stretching? This can help redirect your attention and energy. Want to give it a try?`,
              type: 'text',
              timestamp: now,
            },
            nextStep: ConversationStep.FOLLOWUP,
            options: [
              { emoji: '👍', name: "Yes, I'll try it" }
            ],
            interventions: [{ id: '', name: 'Physical activity', description: 'Take a short walk or do some gentle stretching to redirect your attention and energy.' }]
          };
        }
        
        // We have a second intervention to suggest
        return {
          response: {
            id: `coach-${now.getTime()}`,
            sender: 'coach',
            text: `Let's try a different approach. How about ${secondIntervention[0].name}? ${secondIntervention[0].description} Want to give it a try?`,
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
      return {
        response: {
          id: `coach-${now.getTime()}`,
          sender: 'coach',
          text: `Great choice! ${chosenIntervention?.name ? chosenIntervention.name + ': ' + chosenIntervention.description : ''}
After your strategy, take a moment to notice how you feel. I'll check back with you in 15 minutes to see how you did. You've got this!`,
          type: 'text',
          timestamp: now,
        },
        nextStep: ConversationStep.FOLLOWUP
      };
    case ConversationStep.FOLLOWUP:
      // When we reach the follow-up step, mark the incident as resolved directly
      if (clientId) {
        try {
          // Update the incident to set resolved_at
          console.log('Setting resolved_at for incident');
          await updateIncidentByClientId(clientId, { resolvedAt: new Date() });
        } catch (error) {
          console.error('Failed to update resolved_at:', error);
        }
      }
      
      return {
        response: {
          id: `coach-${now.getTime()}`,
          sender: 'coach',
          text: `Hi again! How did that strategy work for you? Did the craving pass?`,
          type: 'text',
          timestamp: now,
        },
        nextStep: ConversationStep.RATE_RESULT,
        options: ['Yes completely', 'Somewhat', 'Not really']
      };
    case ConversationStep.RATE_RESULT:
      return {
        response: {
          id: `coach-${now.getTime()}`,
          sender: 'coach',
          text: `That's still progress! Each time you practice a strategy, you're building your resistance muscle. What worked well and what could you try differently next time?`,
          type: 'text',
          timestamp: now,
        },
        nextStep: ConversationStep.CLOSE
      };
    case ConversationStep.CLOSE:
      return {
        response: {
          id: `coach-${now.getTime()}`,
          sender: 'coach',
          text: `Thanks for sharing. Next time, you might try combining strategies - like a walk followed by a cup of tea or a different healthy snack. Every craving is an opportunity to learn what works for you. I'm proud of your effort today!`,
          type: 'text',
          timestamp: now,
        },
        nextStep: ConversationStep.CLOSE
      };
    default:
      return {
        response: {
          id: `coach-${now.getTime()}`,
          sender: 'coach',
          text: `Session complete. If you need more support, just start a new SOS!`,
          type: 'text',
          timestamp: now,
        },
        nextStep: ConversationStep.CLOSE
      };
  }
}
