import { ConversationStep, Intervention } from '../client-portal/craving-types';

interface CoachContext {
  clientName: string;
  coachName?: string;
  coachTone?: string;
  selectedFood?: string;
  intensity?: number;
  location?: string;
  trigger?: string;
  chosenIntervention?: { name: string; description: string };
  interventions?: Intervention[];
  conversationHistory?: Array<{ sender: string; text: string; timestamp: Date }>;
  currentStep: ConversationStep;
}


/**
 * Generate AI-powered coach response via API route
 */
export async function generateCoachResponse(context: CoachContext): Promise<string> {
  try {
    const response = await fetch('/api/ai/coach-response', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(context)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown API error' }));
      throw new Error(`API error: ${errorData.error || response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.response) {
      throw new Error('Empty response from AI API');
    }

    return data.response;
  } catch (error) {
    console.error('❌ AI response generation failed:', error);
    throw error;
  }
}


/**
 * Fallback responses in case AI fails
 */
export const fallbackResponses: Record<ConversationStep, string> = {
  [ConversationStep.WELCOME]: `Hi {clientName}, I see you're having a craving moment. Let's work through this together.`,
  [ConversationStep.IDENTIFY_CRAVING]: `What's calling your name? (tap or type)`,
  [ConversationStep.GAUGE_INTENSITY]: `How intense is the pull right now? (1-10)`,
  [ConversationStep.IDENTIFY_LOCATION]: `Where are you right now?`,
  [ConversationStep.IDENTIFY_TRIGGER]: `What do you think may have triggered this craving?`,
  [ConversationStep.SUGGEST_TACTIC]: `I understand how challenging this can be. Instead of reaching for {selectedFood}, how about trying "{interventionName}"? {interventionDescription}. Want to give it a try?`,
  [ConversationStep.CONSENT_CHECK]: `Are you ready to try this strategy?`,
  [ConversationStep.ENCOURAGEMENT]: `Great choice! After your strategy, take a moment to notice how you feel. I'll check back with you in 15 minutes to see how you did. You've got this!`,
  [ConversationStep.RATE_RESULT]: `Okay! How would you rate the effectiveness of the strategy in reducing your craving? (1-10)`,
  [ConversationStep.CLOSE]: `Thanks for sharing. Every craving is an opportunity to learn what works for you. I'm proud of your effort today!`
};

/**
 * Get fallback response with context substitution
 */
export function getFallbackResponse(step: ConversationStep, context: CoachContext): string {
  let response = fallbackResponses[step];
  
  // Simple string substitution for context
  response = response.replace('{clientName}', context.clientName);
  response = response.replace('{selectedFood}', context.selectedFood || 'that');
  response = response.replace('{interventionName}', context.chosenIntervention?.name || 'this strategy');
  response = response.replace('{interventionDescription}', context.chosenIntervention?.description || '');
  
  // Handle conversation history awareness for CLOSE step
  if (step === ConversationStep.CLOSE && context.conversationHistory && context.conversationHistory.length > 0) {
    const lastClientMessage = context.conversationHistory.slice().reverse().find(msg => msg.sender === 'client');
    const effectivenessRating = lastClientMessage ? parseInt(lastClientMessage.text) : null;
    
    if (effectivenessRating !== null) {
      if (effectivenessRating >= 7) {
        response = `That's wonderful! A ${effectivenessRating}/10 shows the strategy really worked for you. You handled that craving like a champion!`;
      } else if (effectivenessRating >= 4) {
        response = `Thanks for being honest about the ${effectivenessRating}/10. Even partial success teaches us what works for you. That's progress!`;
      } else {
        response = `I appreciate your honesty with the ${effectivenessRating}/10 rating. Every attempt gives us valuable information about what to try next time.`;
      }
    }
  }
  
  return response;
}