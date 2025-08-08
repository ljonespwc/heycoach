import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { ConversationStep } from '@/lib/client-portal/craving-types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface CoachContext {
  clientName: string;
  coachName?: string;
  coachTone?: string;
  selectedFood?: string;
  intensity?: number;
  location?: string;
  trigger?: string;
  chosenIntervention?: { name: string; description: string };
  interventions?: Array<{ id: string; name: string; description: string }>;
  conversationHistory?: Array<{ sender: string; text: string; timestamp: Date }>;
  currentStep: ConversationStep;
  // Energy-specific context
  isEnergyContext?: boolean;
  selectedBlocker?: string;
  energyLevel?: number;
  approach?: string;
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
  const { clientName, coachName, coachTone, selectedFood, intensity, location, trigger, chosenIntervention, interventions, conversationHistory, currentStep, isEnergyContext, selectedBlocker, energyLevel, approach } = context;
  
  // Build conversation context from history
  const conversationContext = conversationHistory && conversationHistory.length > 0 
    ? conversationHistory.map(msg => `${msg.sender === 'client' ? 'Client' : 'Coach'}: ${msg.text}`).join('\n')
    : '';
    
  const hasConversationHistory = conversationContext.length > 0;
  
  // Define communication styles
  const toneStyles = {
    professional: "You maintain a professional yet caring demeanor. You're knowledgeable, structured, and speak with authority while remaining supportive.",
    friendly: "You're warm, conversational, and approachable. You speak like a caring friend who understands their struggles.",
    motivational: "You're energetic, inspiring, and encouraging. You focus on empowerment and building confidence.",
    gentle: "You're soft-spoken, patient, and extra understanding. You create a safe, non-judgmental space."
  };
  
  const toneStyle = toneStyles[coachTone as keyof typeof toneStyles] || toneStyles.friendly;
  const coachPersona = isEnergyContext 
    ? `You are ${coachName || 'a supportive fitness coach'}. ${toneStyle} You're experienced in helping people overcome movement barriers and find energy through evidence-based strategies.`
    : `You are ${coachName || 'a supportive nutrition coach'}. ${toneStyle} You're experienced in helping people overcome cravings through evidence-based strategies.`;
  
  
  switch (currentStep) {
    case ConversationStep.WELCOME:
      const conversationSummary = hasConversationHistory ? `

Conversation so far:
${conversationContext}` : '';
      
      if (isEnergyContext) {
        return {
          systemPrompt: `${coachPersona}

A client has reached out for energy boost support. Welcome them warmly while acknowledging their courage to get moving.

Style notes:
- Use your authentic ${coachTone} communication style
- Vary your opening - avoid starting with their name every time
- Acknowledge their smart decision to reach out for movement support
- Keep under 25 words
- Set positive tone for working together
- Avoid formulaic phrases like "I totally get that"${conversationSummary}`,
          userPrompt: `Welcome ${clientName} who just reached out for energy boost support. Match your ${coachTone} style. VARY your greeting - don't always start with their name. Be authentic, not formulaic.`,
          maxTokens: 40
        };
      }
      
      return {
        systemPrompt: `${coachPersona}

A client has reached out for craving support. Welcome them warmly while acknowledging their courage.

Style notes:
- Use your authentic ${coachTone} communication style
- Vary your opening - avoid starting with their name every time
- Acknowledge their smart decision to reach out
- Keep under 25 words
- Set positive tone for working together
- Avoid formulaic phrases like "I totally get that"${conversationSummary}`,
        userPrompt: `Welcome ${clientName} who just reached out for craving support. Match your ${coachTone} style. VARY your greeting - don't always start with their name. Be authentic, not formulaic.`,
        maxTokens: 40
      };

    case ConversationStep.IDENTIFY_CRAVING:
      const cravingConversationSummary = hasConversationHistory ? `\n\nConversation so far:\n${conversationContext}` : '';
      
      return {
        systemPrompt: `${coachPersona}

Find out what specific food they're craving. Be curious without judgment.

Style notes:
- Use your ${coachTone} communication style authentically
- Vary your question pattern - avoid repetitive phrasing
- Create safety for honest sharing
- Keep it under 20 words
- Be genuinely curious, not clinical${cravingConversationSummary}`,
        userPrompt: `Ask what they're craving using your ${coachTone} style. Use varied, natural language that feels conversational.`,
        maxTokens: 35
      };

    case ConversationStep.IDENTIFY_BLOCKER:
      const blockerConversationSummary = hasConversationHistory ? `\n\nConversation so far:\n${conversationContext}` : '';
      
      return {
        systemPrompt: `${coachPersona}

Find out what's blocking them from moving or being active. Be curious and understanding.

Style notes:
- Use your ${coachTone} communication style authentically
- Vary your question pattern - avoid repetitive phrasing
- Create safety for honest sharing about barriers
- Keep it under 25 words
- Be genuinely curious about what's holding them back${blockerConversationSummary}`,
        userPrompt: `Ask what's blocking them from moving right now using your ${coachTone} style. Use varied, natural language that feels conversational.`,
        maxTokens: 40
      };

    case ConversationStep.GAUGE_INTENSITY:
      const intensityConversationSummary = hasConversationHistory ? `

Conversation so far:
${conversationContext}` : '';
      
      return {
        systemPrompt: `${coachPersona}

They shared they're craving ${selectedFood}. Now understand the intensity (1-10 scale).

Style notes:
- Use your ${coachTone} style naturally
- Don't repeat information already discussed in conversation
- Vary how you ask for the 1-10 rating
- Keep under 25 words
- Avoid formulaic acknowledgments${intensityConversationSummary}`,
        userPrompt: `Ask for intensity rating (1-10) using your ${coachTone} style. Be natural and conversational.`,
        maxTokens: 40
      };

    case ConversationStep.GAUGE_ENERGY:
      const energyConversationSummary = hasConversationHistory ? `

Conversation so far:
${conversationContext}` : '';
      
      return {
        systemPrompt: `${coachPersona}

They shared what's blocking them: ${selectedBlocker}. Now understand their current energy level (1-10 scale).

Style notes:
- Use your ${coachTone} style naturally
- Don't repeat information already discussed in conversation
- Vary how you ask for the 1-10 energy rating
- Keep under 25 words
- Be understanding about their energy state${energyConversationSummary}`,
        userPrompt: `Ask for their current energy level (1-10) using your ${coachTone} style. Be natural and understanding.`,
        maxTokens: 40
      };

    case ConversationStep.IDENTIFY_LOCATION:
      const locationConversationSummary = hasConversationHistory ? `

Conversation so far:
${conversationContext}` : '';
      
      if (isEnergyContext) {
        return {
          systemPrompt: `${coachPersona}

They're feeling ${selectedBlocker} with energy level ${energyLevel}/10. Understanding their location helps provide better movement suggestions.

Guidelines:
- Use your ${coachTone} style
- DON'T repeat details already in conversation (blocker, energy level)
- Ask where they are naturally
- Keep it under 25 words
- Show understanding that environment affects movement options${locationConversationSummary}`,
          userPrompt: `Ask where they are right now using your ${coachTone} style. Be conversational and natural.`,
          maxTokens: 40
        };
      }
      
      return {
        systemPrompt: `${coachPersona}

They're craving ${selectedFood} with intensity ${intensity}/10. Understanding their location helps provide better context.

Guidelines:
- Use your ${coachTone} style
- DON'T repeat details already in conversation (craving type, intensity)
- Ask where they are naturally
- Keep it under 25 words
- Show understanding that environment affects cravings${locationConversationSummary}`,
        userPrompt: `Ask where they are right now using your ${coachTone} style. Be conversational and natural.`,
        maxTokens: 40
      };

    case ConversationStep.IDENTIFY_TRIGGER:
      const triggerConversationSummary = hasConversationHistory ? `

Conversation so far:
${conversationContext}` : '';
      
      return {
        systemPrompt: `${coachPersona}

They're at ${location} craving ${selectedFood} (intensity ${intensity}/10). Help them identify what might have triggered this craving.

Guidelines:
- Use your ${coachTone} style
- Don't repeat details already discussed in conversation
- Ask about possible triggers in an understanding way
- Keep it under 30 words
- Be empathetic - triggers are often emotional or situational${triggerConversationSummary}`,
        userPrompt: `Ask what might have triggered this craving using your ${coachTone} style. Be understanding and conversational.`,
        maxTokens: 50
      };

    case ConversationStep.IDENTIFY_APPROACH:
      const approachConversationSummary = hasConversationHistory ? `

Conversation so far:
${conversationContext}` : '';
      
      return {
        systemPrompt: `${coachPersona}

They're at ${location} feeling ${selectedBlocker} (energy ${energyLevel}/10). Help them identify what usually helps them get unstuck or overcome barriers to movement.

Guidelines:
- Use your ${coachTone} style
- Don't repeat details already discussed in conversation
- Ask about their preferred approach to overcoming obstacles in an encouraging way
- Keep it under 30 words
- Be supportive - focus on what typically works for them${approachConversationSummary}`,
        userPrompt: `Ask what usually helps them get unstuck using your ${coachTone} style. Be encouraging and focus on their preferred approach to overcoming barriers.`,
        maxTokens: 50
      };

    case ConversationStep.SUGGEST_TACTIC:
      const intervention = interventions?.[0];
      const tacticConversationSummary = hasConversationHistory ? `\n\nConversation so far:\n${conversationContext}` : '';
      
      if (isEnergyContext) {
        return {
          systemPrompt: `${coachPersona}\n\nThey're feeling ${selectedBlocker} (energy ${energyLevel}/10) at ${location}, and usually get unstuck through ${approach}. Time to suggest a helpful movement strategy that aligns with their preferred approach.\n\nGuidelines:\n- Use your ${coachTone} style\n- Don't repeat details already discussed\n- Suggest the specific intervention: "${intervention?.name}" - ${intervention?.description}\n- Frame it as a way to overcome their blocker using their preferred approach\n- Keep it under 50 words\n- Be encouraging and specific about how this intervention matches their approach${tacticConversationSummary}`,
          userPrompt: `Suggest they try "${intervention?.name}" (${intervention?.description}) using your ${coachTone} style. Connect it to their preferred approach: ${approach}.`,
          maxTokens: 80
        };
      }
      
      return {
        systemPrompt: `${coachPersona}\n\nThey're craving ${selectedFood} (${intensity}/10) at ${location}, triggered by ${trigger}. Time to suggest a helpful strategy.\n\nGuidelines:\n- Use your ${coachTone} style\n\n- Don't repeat details already discussed\n- Suggest the specific intervention: "${intervention?.name}" - ${intervention?.description}\n- Frame it as an alternative to the craving\n- Keep it under 50 words\n- Be encouraging and specific about the intervention${tacticConversationSummary}`,
        userPrompt: `Suggest they try "${intervention?.name}" (${intervention?.description}) using your ${coachTone} style. Be empathetic and encouraging.`,
        maxTokens: 80
      };

    case ConversationStep.CONSENT_CHECK:
      return {
        systemPrompt: `${coachPersona}\n\nYou've just suggested a strategy and now need to get confirmation that they're ready to try it.\n\nGuidelines:\n- Ask for their readiness in a supportive way\n- Keep it under 20 words\n- Be encouraging about their willingness to try`,
        userPrompt: `Ask if they're ready to try the suggested strategy. Be supportive and encouraging.`,
        maxTokens: 30
      };

    case ConversationStep.ENCOURAGEMENT:
      const isSecondOption = chosenIntervention?.name === "Another idea";
      
      if (isSecondOption) {
        const secondIntervention = interventions?.[0];
        return {
          systemPrompt: `${coachPersona}\n\nThey wanted a different approach, so now you're suggesting "${secondIntervention?.name}".\n\nGuidelines:\n- Use your authentic ${coachTone} communication style\n- Acknowledge they wanted another option positively\n- Suggest the new intervention naturally\n- Keep it under 40 words\n- Avoid cliché phrases like "You've got this!"`,
          userPrompt: `Suggest "${secondIntervention?.name}" (${secondIntervention?.description}) using your ${coachTone} style. They wanted another option - be supportive of their choice.`,
          maxTokens: 60
        };
      }
      
      return {
        systemPrompt: `${coachPersona}\n\nThey agreed to try "${chosenIntervention?.name}". Give them encouragement and let them know you'll check back.\n\nGuidelines:\n- Use your authentic ${coachTone} communication style\n- Celebrate their commitment genuinely\n- Build their confidence naturally\n- Mention you'll check back soon\n- Keep it under 40 words\n- Avoid overused phrases like "You've got this!" or "I believe in you!"`,
        userPrompt: `They will try "${chosenIntervention?.name}". Use your ${coachTone} style to encourage them authentically and mention you'll check back. Avoid cliché motivational phrases.`,
        maxTokens: 60
      };

    case ConversationStep.RATE_RESULT:
      const rateResultConversationSummary = hasConversationHistory ? `\n\nConversation so far:\n${conversationContext}` : '';
      
      return {
        systemPrompt: `${coachPersona}\n\nCheck back about how "${chosenIntervention?.name}" worked for their ${selectedFood} craving.\n\nGuidelines:\n- Use your ${coachTone} communication style\n\n- Don't repeat details already discussed\n- Reference the specific strategy they tried\n- Ask for effectiveness rating 1-10 in varied ways\n- Keep it under 30 words\n- Be curious and supportive regardless of results\n- Vary your check-in approach${rateResultConversationSummary}`,
        userPrompt: `Check back about "${chosenIntervention?.name}" effectiveness using your ${coachTone} style. Ask for a 1-10 rating. Be natural and supportive.`,
        maxTokens: 50
      };

    case ConversationStep.CLOSE:
      // Extract the effectiveness rating from the conversation history
      const lastClientMessage = conversationHistory?.slice().reverse().find(msg => msg.sender === 'client');
      const effectivenessRating = lastClientMessage ? parseInt(lastClientMessage.text) : null;
      
      const closeConversationSummary = hasConversationHistory ? `\n\nConversation so far:\n${conversationContext}` : '';
      
      return {
        systemPrompt: `${coachPersona}\n\nWrap up the session. They just rated the effectiveness as ${effectivenessRating || 'unknown'}/10.\n\nGuidelines:\n- Use your authentic ${coachTone} communication style\n- SPECIFICALLY acknowledge their ${effectivenessRating}/10 rating\n- If high rating (7+): Celebrate the success\n- If medium rating (4-6): Acknowledge the partial help and learning\n- If low rating (1-3): Validate their honesty and emphasize the learning\n- Keep it under 35 words\n- Be genuine, not formulaic${closeConversationSummary}`,
        userPrompt: `They rated the strategy effectiveness as ${effectivenessRating}/10. Using your ${coachTone} style, acknowledge this specific rating and close the session appropriately. Be authentic about the result.`,
        maxTokens: 60
      };

    default:
      return {
        systemPrompt: `${coachPersona}\n\nProvide a supportive closing message.`,
        userPrompt: `Give a brief supportive message about reaching out if they need help again.`,
        maxTokens: 30
      };
  }
}