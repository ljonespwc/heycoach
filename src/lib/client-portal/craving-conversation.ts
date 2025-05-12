// Conversation flow logic for Craving SOS
import { ConversationStep, Message } from './craving-types';
import { getRandomClientInterventions } from './craving-db';

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
  interventions?: { name: string; description: string }[];
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
        nextStep: ConversationStep.IDENTIFY_LOCATION,
        options: Array.from({length: 10}, (_, i) => ({ 
          name: String(i + 1),
          value: String(i + 1)
        }))
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
      const interventions = await getRandomClientInterventions(clientId, 3);
      return {
        response: {
          id: `coach-${now.getTime()}`,
          sender: 'coach',
          text: `I understand how challenging this can be. Instead of reaching for ${selectedFood || 'that'}, how about trying one of these strategies:\n\n${interventions.map((iv, i) => `${i + 1}. ${iv.name}`).join('\n')}\n\nWhich one would you like to try right now?`,
          type: 'text',
          timestamp: now,
        },
        nextStep: ConversationStep.ENCOURAGEMENT,
        options: interventions.map(iv => iv.name),
        interventions
      };
    case ConversationStep.ENCOURAGEMENT:
      // Show encouragement and include full description of the chosen intervention
      return {
        response: {
          id: `coach-${now.getTime()}`,
          sender: 'coach',
          text: `Great choice! ${chosenIntervention?.name ? chosenIntervention.name + ': ' + chosenIntervention.description : ''}\nAfter your strategy, take a moment to notice how you feel. I'll check back with you in 15 minutes to see how you did. You've got this!`,
          type: 'text',
          timestamp: now,
        },
        nextStep: ConversationStep.FOLLOWUP
      };
    case ConversationStep.FOLLOWUP:
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
