import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Intervention } from '@/lib/client-portal/craving-types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface SmartInterventionContext {
  clientName: string;
  cravingType: string;
  intensity: number;
  location: string;
  trigger: string;
  timeOfDay: string;
  dayOfWeek: string;
  availableInterventions: Intervention[];
  previousEffectiveness?: Array<{
    interventionId: string;
    interventionName: string;
    effectiveness: number; // 1-10 rating
    context: string; // Similar context where it was used
  }>;
}

interface SmartInterventionResponse {
  primaryIntervention: Intervention;
  secondaryIntervention: Intervention;
  reasoning: string;
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const context: SmartInterventionContext = await request.json();
    
    if (!context.availableInterventions || context.availableInterventions.length === 0) {
      return NextResponse.json(
        { error: 'No interventions available for selection' },
        { status: 400 }
      );
    }

    if (context.availableInterventions.length === 1) {
      // Only one intervention available - use it for both primary and secondary
      return NextResponse.json({
        primaryIntervention: context.availableInterventions[0],
        secondaryIntervention: context.availableInterventions[0],
        reasoning: "Only one intervention was available, so it was selected for both primary and secondary options."
      });
    }

    const systemPrompt = `You are an expert nutrition coach AI that selects the most effective interventions for clients experiencing food cravings.

Your task is to analyze the client's current situation and select:
1. PRIMARY intervention: The best strategy for their specific context
2. SECONDARY intervention: A different backup strategy that complements the primary choice

Consider these factors when selecting interventions:
- **Craving intensity**: Higher intensity may need more immediate/physical interventions
- **Location**: Some strategies work better in specific environments (home vs work vs public)
- **Trigger type**: Different triggers (stress, boredom, habit) respond to different approaches
- **Time of day**: Energy levels and appropriate activities vary by time
- **Previous effectiveness**: Prioritize interventions that have worked well in similar contexts
- **Intervention categories**: Balance different types (physical, mental, behavioral, etc.)
- **Complementary strategies**: Choose secondary that uses different mechanisms than primary

Available intervention categories typically include:
- Physical (movement, breathing, sensory)
- Cognitive (mindfulness, reframing, distraction)
- Behavioral (replacement activities, environmental changes)
- Social (reaching out, accountability)
- Nutritional (healthy alternatives, hydration)

Return your response as valid JSON with exactly this structure:
{
  "primaryIntervention": {
    "id": "exact_id_from_available_list",
    "name": "exact_name_from_available_list", 
    "description": "exact_description_from_available_list",
    "category": "exact_category_from_available_list"
  },
  "secondaryIntervention": {
    "id": "different_exact_id_from_available_list",
    "name": "different_exact_name_from_available_list",
    "description": "different_exact_description_from_available_list", 
    "category": "different_exact_category_from_available_list"
  },
  "reasoning": "Brief explanation of why these interventions were selected for this specific context"
}

CRITICAL: You must select interventions ONLY from the provided available list. Do not modify names, descriptions, or create new interventions.`;

    const contextDetails = `
Current Situation:
- Client: ${context.clientName}
- Craving: ${context.cravingType} (intensity ${context.intensity}/10)
- Location: ${context.location}
- Trigger: ${context.trigger}
- Time: ${context.timeOfDay} on ${getDayName(parseInt(context.dayOfWeek))}

${context.previousEffectiveness && context.previousEffectiveness.length > 0 ? `
Previous Effectiveness Data:
${context.previousEffectiveness.map(prev => 
  `- ${prev.interventionName}: ${prev.effectiveness}/10 effectiveness in "${prev.context}"`
).join('\n')}` : 'No previous effectiveness data available.'}

Available Interventions:
${context.availableInterventions.map(intervention => 
  `- ID: ${intervention.id}, Name: "${intervention.name}", Category: ${intervention.category || 'Unknown'}, Description: "${intervention.description}"`
).join('\n')}

Select the PRIMARY and SECONDARY interventions that would be most effective for this specific situation.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: contextDetails }
      ],
      max_tokens: 500,
      temperature: 0.3, // Lower temperature for more consistent selections
      response_format: { type: "json_object" }
    });

    const aiResponse = response.choices[0]?.message?.content?.trim();
    
    if (!aiResponse) {
      return NextResponse.json(
        { error: 'Empty response from AI' },
        { status: 500 }
      );
    }

    try {
      const parsedResponse: SmartInterventionResponse = JSON.parse(aiResponse);
      
      // Validate that selected interventions exist in available list
      const primaryExists = context.availableInterventions.find(i => i.id === parsedResponse.primaryIntervention.id);
      const secondaryExists = context.availableInterventions.find(i => i.id === parsedResponse.secondaryIntervention.id);
      
      if (!primaryExists || !secondaryExists) {
        throw new Error('AI selected interventions not in available list');
      }
      
      // Ensure primary and secondary are different (unless only one available)
      if (context.availableInterventions.length > 1 && parsedResponse.primaryIntervention.id === parsedResponse.secondaryIntervention.id) {
        // Find a different secondary intervention
        const alternatives = context.availableInterventions.filter(i => i.id !== parsedResponse.primaryIntervention.id);
        if (alternatives.length > 0) {
          parsedResponse.secondaryIntervention = alternatives[0];
          parsedResponse.reasoning += " (Secondary was automatically adjusted to ensure variety.)";
        }
      }

      return NextResponse.json(parsedResponse);
    } catch (parseError) {
      console.error('❌ Failed to parse AI response:', parseError);
      console.error('❌ Raw AI response:', aiResponse);
      
      // Fallback to simple selection if AI response is malformed
      const fallbackResponse = {
        primaryIntervention: context.availableInterventions[0],
        secondaryIntervention: context.availableInterventions[Math.min(1, context.availableInterventions.length - 1)],
        reasoning: "AI response was malformed, used fallback selection."
      };
      
      return NextResponse.json(fallbackResponse);
    }

  } catch (error) {
    console.error('❌ Smart intervention selection failed:', error);
    return NextResponse.json(
      { error: 'Smart intervention selection failed' },
      { status: 500 }
    );
  }
}

function getDayName(dayOfWeek: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayOfWeek] || 'Unknown';
}