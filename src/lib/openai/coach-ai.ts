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
  // Energy-specific context
  isEnergyContext?: boolean;
  selectedBlocker?: string;
  energyLevel?: number;
  approach?: string;
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


// Fallback responses removed - AI failures should throw errors rather than fake responses