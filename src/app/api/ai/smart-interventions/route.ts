import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Intervention } from '@/lib/client-portal/craving-types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface SmartInterventionContext {
  clientName: string;
  cravingType: string; // For craving: food type, for energy: blocker type
  intensity: number; // For craving: craving intensity, for energy: energy level
  location: string;
  trigger: string; // For craving: trigger context, for energy: activity goal/preference
  timeOfDay: string;
  dayOfWeek: string;
  interventionType?: 'craving' | 'energy'; // New field to distinguish context type
  availableInterventions: Intervention[];
  previousEffectiveness?: Array<{
    interventionId: string;
    interventionName: string;
    effectiveness: number; // 1-10 rating
    context: string; // Similar context where it was used
    timesSuggested: number;
    lastSuggestedAt: string | null;
    recentlySuggested: boolean;
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

    // Filter interventions by location before processing
    const locationMapping: { [key: string]: string } = {
      'Home': 'home',
      'Work': 'work', 
      'Car': 'car',
      'Store': 'store',
      'Restaurant': 'restaurant',
      'Gym': 'gym',
      "Friend's house": 'social',
      'Hotel/Travel': 'travel',
      'Outdoors': 'outdoors',
      'Car/Transit': 'car',
      'Public space': 'public'
    };

    const locationTag = locationMapping[context.location] || 'universal';
    
    const locationFilteredInterventions = context.availableInterventions.filter(intervention => {
      // If no context_tags, assume it works everywhere (legacy data)
      if (!intervention.context_tags || intervention.context_tags.length === 0) {
        return true;
      }
      
      // Include if intervention is tagged for this location OR is universal
      return intervention.context_tags.includes(locationTag) || 
             intervention.context_tags.includes('universal');
    });

    if (locationFilteredInterventions.length === 0) {
      return NextResponse.json(
        { error: `No interventions available for location: ${context.location}` },
        { status: 400 }
      );
    }

    if (locationFilteredInterventions.length === 1) {
      // Only one intervention available - use it for both primary and secondary
      return NextResponse.json({
        primaryIntervention: locationFilteredInterventions[0],
        secondaryIntervention: locationFilteredInterventions[0],
        reasoning: "Only one location-appropriate intervention was available, so it was selected for both primary and secondary options."
      });
    }

    // Update context to use filtered interventions
    context.availableInterventions = locationFilteredInterventions;

    // Add variety boost: separate fresh vs recently suggested interventions
    if (context.previousEffectiveness && context.previousEffectiveness.length > 0) {
      const recentlySuggestedIds = new Set(
        context.previousEffectiveness
          .filter(prev => prev.recentlySuggested)
          .map(prev => prev.interventionId)
      );

      const freshInterventions = context.availableInterventions.filter(
        intervention => !recentlySuggestedIds.has(intervention.id)
      );

      // If we have fresh options, prefer those. Otherwise use all available.
      if (freshInterventions.length >= 2) {
        context.availableInterventions = freshInterventions;
        console.log(`🎯 Variety boost: Using ${freshInterventions.length} fresh interventions (avoiding ${recentlySuggestedIds.size} recently suggested)`);
      } else {
        console.log(`⚠️ Limited variety: Only ${freshInterventions.length} fresh interventions available, using all ${context.availableInterventions.length} options`);
      }
    }

    const isEnergyContext = context.interventionType === 'energy';
    
    const systemPrompt = `You are an expert ${isEnergyContext ? 'fitness and wellness' : 'nutrition'} coach AI that selects the most effective interventions for clients ${isEnergyContext ? 'experiencing low energy or motivation blocks' : 'experiencing food cravings'}.

Your task is to analyze the client's current situation and select:
1. PRIMARY intervention: The best strategy for their specific context
2. SECONDARY intervention: A different backup strategy that complements the primary choice

Consider these factors when selecting interventions:
${isEnergyContext ? 
`- **Energy level**: Lower energy may need gentler, easier-to-start interventions
- **Blocker type**: Different blockers (tired, no time, not motivated, overwhelmed) need specific approaches
- **Activity goal**: Match intervention intensity to client's available time and desired activity level` :
`- **Craving intensity**: Higher intensity may need more immediate/physical interventions
- **Food type**: Different cravings may respond better to specific intervention types`}
- **Location**: All provided interventions are already location-appropriate for "${context.location}"
- **${isEnergyContext ? 'Goal/preference' : 'Trigger type'}**: ${isEnergyContext ? 'Different activity preferences (quick boost, light movement, full workout) need different approaches' : 'Different triggers (stress, boredom, habit, seeing food) respond to different approaches'}
- **Time of day**: Energy levels and appropriate activities vary by time (late night = quieter strategies)
- **Previous effectiveness**: STRONGLY prioritize interventions with high effectiveness ratings (8+/10) from similar contexts. Consider interventions with 6-7/10 as secondary options. Avoid interventions with effectiveness below 5/10 unless no alternatives exist
- **Suggestion variety**: STRONGLY PREFER interventions that have NOT been recently suggested (recentlySuggested: false). Only choose recently suggested interventions if no other contextually appropriate options exist
- **Intervention categories**: Balance different types (physical, mental, behavioral, etc.)
- **Complementary strategies**: Choose secondary that uses different mechanisms than primary

Available intervention categories typically include:
${isEnergyContext ?
`- Movement (walking, stretching, exercise)
- Motivational (goal-setting, visualization, accountability)
- Environmental (lighting, music, space changes)
- Cognitive (mindfulness, energy reframing, focus techniques)
- Social (workout buddy, group activities)
- Physiological (breathing, posture, hydration)` :
`- Physical (movement, breathing, sensory)
- Cognitive (mindfulness, reframing, distraction)
- Behavioral (replacement activities, environmental changes)
- Social (reaching out, accountability)
- Nutritional (healthy alternatives, hydration)`}

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
- ${isEnergyContext ? `Blocker: ${context.cravingType} (energy level ${context.intensity}/10)` : `Craving: ${context.cravingType} (intensity ${context.intensity}/10)`}
- Location: ${context.location} ⚠️  MUST consider location constraints when selecting interventions
- ${isEnergyContext ? `Activity Goal: ${context.trigger}` : `Trigger: ${context.trigger}`}
- Time: ${context.timeOfDay} on ${getDayName(parseInt(context.dayOfWeek))}

${context.previousEffectiveness && context.previousEffectiveness.length > 0 ? `
Previous Effectiveness & Suggestion History:
${context.previousEffectiveness.map(prev => {
  const recentFlag = prev.recentlySuggested ? ' ⚠️ RECENTLY SUGGESTED' : ' ✅ Fresh option';
  const suggestedTimes = prev.timesSuggested > 0 ? ` (suggested ${prev.timesSuggested} times)` : '';
  return `- ${prev.interventionName}: ${prev.effectiveness}/10 effectiveness in "${prev.context}"${suggestedTimes}${recentFlag}`;
}).join('\n')}` : 'No previous effectiveness data available.'}

Available Interventions:
${context.availableInterventions.map(intervention => 
  `- ID: ${intervention.id}, Name: "${intervention.name}", Category: ${intervention.category || 'Unknown'}, Description: "${intervention.description}"`
).join('\n')}

Select the PRIMARY and SECONDARY interventions that would be most effective for this specific situation.

IMPORTANT REMINDERS:
1. All interventions provided are location-appropriate - focus on other selection criteria
2. Consider the ${isEnergyContext ? `activity goal "${context.trigger}"` : `trigger "${context.trigger}"`} - ${isEnergyContext ? 'match intervention intensity to available time and desired outcome' : 'match intervention type to trigger (boredom→engagement, stress→calming, etc.)'}
3. Time context matters - "${context.timeOfDay}" affects energy levels and appropriate activities
4. ${isEnergyContext ? `Energy level ${context.intensity}/10 informs how gentle or intensive the intervention should be` : `Intensity ${context.intensity}/10 informs urgency of intervention needed`}
5. **CRITICAL SELECTION PRIORITY**:
   a) First, filter for contextually appropriate interventions (location, trigger, time)
   b) Second, STRONGLY prefer fresh options (⚠️ RECENTLY SUGGESTED = avoid if possible)  
   c) Third, among fresh options, prioritize high effectiveness (≥8/10)
   d) Only choose recently suggested interventions if NO fresh options exist
6. Choose complementary primary/secondary interventions using different mechanisms`;

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