import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { ConversationStep } from '@/lib/client-portal/craving-types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface CoachContext {
  clientName: string;
  coachName?: string;
  selectedFood?: string;
  intensity?: number;
  location?: string;
  trigger?: string;
  chosenIntervention?: { name: string; description: string };
  interventions?: Array<{ id: string; name: string; description: string }>;
  currentStep: ConversationStep;
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    const context: CoachContext = await request.json();
    
    const promptConfig = getPromptForStep(context);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini", // Use the correct model name
      messages: [
        { role: "system", content: promptConfig.systemPrompt },
        { role: "user", content: promptConfig.userPrompt }
      ],
      max_tokens: promptConfig.maxTokens,
      temperature: 0.7,
      presence_penalty: 0.1,
    });

    const aiResponse = response.choices[0]?.message?.content?.trim();
    
    if (!aiResponse) {
      return NextResponse.json(
        { error: 'Empty response from AI' },
        { status: 500 }
      );
    }

    return NextResponse.json({ response: aiResponse });
  } catch (error) {
    console.error('❌ AI response generation failed:', error);
    return NextResponse.json(
      { error: 'AI response generation failed' },
      { status: 500 }
    );
  }
}

function getPromptForStep(context: CoachContext) {
  const { clientName, coachName, selectedFood, intensity, location, trigger, chosenIntervention, interventions, currentStep } = context;
  
  const coachPersona = `You are ${coachName || 'a supportive nutrition coach'}. You're warm, empathetic, non-judgmental, and experienced in helping people overcome cravings. You speak in a natural, conversational tone - like a friend who cares.`;
  
  switch (currentStep) {
    case ConversationStep.WELCOME:
      return {
        systemPrompt: `${coachPersona}\n\nYou're greeting a client who just reached out for help with a craving. Be warm and reassuring while setting the stage for working through this together.\n\nGuidelines:\n- Be warm and welcoming\n- Acknowledge they did the right thing by reaching out\n- Keep it under 30 words\n- Don't ask specific questions yet - just set a supportive tone`,
        userPrompt: `Greet ${clientName} who just contacted you for craving support. Make them feel supported and ready to work through this together.`,
        maxTokens: 50
      };

    case ConversationStep.IDENTIFY_CRAVING:
      return {
        systemPrompt: `${coachPersona}\n\nNow you need to find out what specific food they're craving. Be curious and non-judgmental.\n\nGuidelines:\n- Ask what they're craving in a warm, curious way\n- Keep it conversational and under 25 words\n- Don't make them feel bad about the craving\n- End with a clear question about the food`,
        userPrompt: `Ask ${clientName} what specific food they're craving right now. Be warm and non-judgmental.`,
        maxTokens: 40
      };

    case ConversationStep.GAUGE_INTENSITY:
      return {
        systemPrompt: `${coachPersona}\n\n${clientName} is craving ${selectedFood}. Now you need to understand how intense this craving feels to them on a 1-10 scale.\n\nGuidelines:\n- Acknowledge their specific craving (${selectedFood})\n- Ask for intensity rating 1-10 in a natural way\n- Keep it under 25 words\n- Be empathetic about the intensity they might be feeling`,
        userPrompt: `${clientName} is craving ${selectedFood}. Ask them to rate how intense this craving feels right now on a scale of 1-10. Be understanding about the intensity.`,
        maxTokens: 40
      };

    case ConversationStep.IDENTIFY_LOCATION:
      return {
        systemPrompt: `${coachPersona}\n\n${clientName} is craving ${selectedFood} with intensity ${intensity}/10. Understanding their location helps provide better context for the craving.\n\nGuidelines:\n- Acknowledge their craving and intensity in a supportive way\n- Ask where they are right now\n- Keep it under 25 words\n- Show understanding that environment affects cravings`,
        userPrompt: `${clientName} rated their ${selectedFood} craving as ${intensity}/10. Ask where they are right now, acknowledging that location can influence cravings.`,
        maxTokens: 40
      };

    case ConversationStep.IDENTIFY_TRIGGER:
      return {
        systemPrompt: `${coachPersona}\n\n${clientName} is at ${location} craving ${selectedFood} (intensity ${intensity}/10). Help them identify what might have triggered this craving.\n\nGuidelines:\n- Reference their situation (${selectedFood} craving at ${location})\n- Ask about possible triggers in an understanding way\n- Keep it under 30 words\n- Be empathetic - triggers are often emotional or situational`,
        userPrompt: `${clientName} is at ${location} with a ${intensity}/10 craving for ${selectedFood}. Gently ask what might have triggered this craving, showing understanding.`,
        maxTokens: 50
      };

    case ConversationStep.SUGGEST_TACTIC:
      const intervention = interventions?.[0];
      return {
        systemPrompt: `${coachPersona}\n\n${clientName} is craving ${selectedFood} (${intensity}/10) at ${location}, triggered by ${trigger}. Time to suggest a helpful strategy.\n\nGuidelines:\n- Show empathy for their situation\n- Suggest the specific intervention: "${intervention?.name}" - ${intervention?.description}\n- Frame it as an alternative to the craving\n- Keep it under 50 words\n- Be encouraging and specific about the intervention`,
        userPrompt: `${clientName} is craving ${selectedFood} at ${location} due to ${trigger}. Suggest they try "${intervention?.name}" (${intervention?.description}) instead of reaching for the ${selectedFood}. Be empathetic and encouraging.`,
        maxTokens: 80
      };

    case ConversationStep.CONSENT_CHECK:
      return {
        systemPrompt: `${coachPersona}\n\nYou've just suggested a strategy and now need to get confirmation that ${clientName} is ready to try it.\n\nGuidelines:\n- Ask for their readiness in a supportive way\n- Keep it under 20 words\n- Be encouraging about their willingness to try`,
        userPrompt: `Ask ${clientName} if they're ready to try the suggested strategy. Be supportive and encouraging.`,
        maxTokens: 30
      };

    case ConversationStep.ENCOURAGEMENT:
      const isSecondOption = chosenIntervention?.name === "Another idea";
      
      if (isSecondOption) {
        const secondIntervention = interventions?.[0];
        return {
          systemPrompt: `${coachPersona}\n\n${clientName} wanted a different approach, so now you're suggesting "${secondIntervention?.name}".\n\nGuidelines:\n- Acknowledge they wanted another option\n- Suggest the new intervention naturally\n- Keep it under 40 words\n- Be supportive of their choice to try something different`,
          userPrompt: `Suggest a different approach for ${clientName}: "${secondIntervention?.name}" - ${secondIntervention?.description}. Be supportive that they wanted another option.`,
          maxTokens: 60
        };
      }
      
      return {
        systemPrompt: `${coachPersona}\n\n${clientName} agreed to try "${chosenIntervention?.name}". Give them encouragement and let them know you'll check back.\n\nGuidelines:\n- Celebrate their commitment to the strategy\n- Give them confidence they can do this\n- Mention you'll check back in a bit\n- Keep it under 40 words\n- Be genuinely encouraging`,
        userPrompt: `${clientName} committed to trying "${chosenIntervention?.name}". Encourage them, express confidence in their ability, and let them know you'll check back to see how it went.`,
        maxTokens: 60
      };

    case ConversationStep.RATE_RESULT:
      return {
        systemPrompt: `${coachPersona}\n\nIt's time to check back with ${clientName} about how their strategy "${chosenIntervention?.name}" worked for their ${selectedFood} craving.\n\nGuidelines:\n- Reference the specific strategy they tried\n- Ask for effectiveness rating 1-10\n- Keep it under 30 words\n- Be curious and supportive about the results`,
        userPrompt: `Check back with ${clientName} about how "${chosenIntervention?.name}" worked for managing their ${selectedFood} craving. Ask them to rate its effectiveness 1-10.`,
        maxTokens: 50
      };

    case ConversationStep.CLOSE:
      return {
        systemPrompt: `${coachPersona}\n\nTime to wrap up the session with ${clientName}. They just shared how effective the strategy was.\n\nGuidelines:\n- Acknowledge their effort and courage in working through the craving\n- Celebrate the learning experience regardless of the outcome\n- Keep it under 35 words\n- End on an empowering, positive note`,
        userPrompt: `Close the session with ${clientName}. Acknowledge their courage in working through the craving and celebrate their effort. Be empowering and positive.`,
        maxTokens: 60
      };

    default:
      return {
        systemPrompt: `${coachPersona}\n\nProvide a supportive closing message.`,
        userPrompt: `Give ${clientName} a brief supportive message about reaching out if they need help again.`,
        maxTokens: 30
      };
  }
}