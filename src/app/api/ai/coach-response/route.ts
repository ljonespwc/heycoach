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
  
  // Standard conversation summary for ALL steps
  const conversationSummary = hasConversationHistory ? `\n\nConversation so far:\n${conversationContext}\n\nIMPORTANT: Since you can see the full conversation, vary your greetings naturally. Avoid overusing "Hey" or "Hi" - use different openings to keep the conversation fresh.` : '';
  
  switch (currentStep) {
    case ConversationStep.WELCOME:
      
      if (isEnergyContext) {
        return {
          systemPrompt: `${coachPersona}

A client has reached out for energy boost support. Welcome them warmly while acknowledging their courage to get moving.

Style notes:
- Use your authentic ${coachTone} communication style
- Use their first name (${clientName}) in this initial welcome message
- Acknowledge their smart decision to reach out for movement support
- Keep under 25 words
- Set positive tone for working together
- Avoid formulaic phrases like "I totally get that"${conversationSummary}`,
          userPrompt: `Welcome ${clientName} who just reached out for energy boost support. Use their first name in this initial message. Match your ${coachTone} style and be authentic, not formulaic.`,
          maxTokens: 40
        };
      }
      
      return {
        systemPrompt: `${coachPersona}

A client has reached out for craving support. Welcome them warmly while acknowledging their courage.

Style notes:
- Use your authentic ${coachTone} communication style
- Use their first name (${clientName}) in this initial welcome message
- Acknowledge their smart decision to reach out
- Keep under 25 words
- Set positive tone for working together
- Avoid formulaic phrases like "I totally get that"${conversationSummary}`,
        userPrompt: `Welcome ${clientName} who just reached out for craving support. Use their first name in this initial message. Match your ${coachTone} style and be authentic, not formulaic.`,
        maxTokens: 40
      };

    case ConversationStep.IDENTIFY_CRAVING:
      return {
        systemPrompt: `${coachPersona}

Find out what specific food they're craving. Be curious without judgment.

Style notes:
- Use your ${coachTone} communication style authentically
- Use their first name (${clientName}) to make this personal and welcoming
- Vary your question pattern - avoid repetitive phrasing
- Create safety for honest sharing
- Keep it under 25 words
- Be genuinely curious, not clinical${conversationSummary}`,
        userPrompt: `Ask ${clientName} what they're craving using your ${coachTone} style. Use their first name and make it feel welcoming and conversational.`,
        maxTokens: 40
      };

    case ConversationStep.IDENTIFY_BLOCKER:
      return {
        systemPrompt: `${coachPersona}

Find out what's blocking them from moving or being active. Be curious and understanding.

Style notes:
- Use your ${coachTone} communication style authentically
- Use their first name (${clientName}) to make this personal and welcoming
- Vary your question pattern - avoid repetitive phrasing
- Create safety for honest sharing about barriers
- Keep it under 30 words
- Be genuinely curious about what's holding them back${conversationSummary}`,
        userPrompt: `Ask ${clientName} what's blocking them from moving right now using your ${coachTone} style. Use their first name and make it feel welcoming and conversational.`,
        maxTokens: 45
      };

    case ConversationStep.GAUGE_INTENSITY:
      return {
        systemPrompt: `${coachPersona}

They shared they're craving ${selectedFood}. Now understand the intensity (1-10 scale).

Style notes:
- Use your ${coachTone} style naturally
- Don't repeat information already discussed in conversation
- Vary how you ask for the 1-10 rating
- Keep under 25 words
- Avoid formulaic acknowledgments${conversationSummary}`,
        userPrompt: `Ask for intensity rating (1-10) using your ${coachTone} style. Be natural and conversational.`,
        maxTokens: 40
      };

    case ConversationStep.GAUGE_ENERGY:
      return {
        systemPrompt: `${coachPersona}

They shared what's blocking them: ${selectedBlocker}. Now understand their current energy level (1-10 scale).

Style notes:
- Use your ${coachTone} style naturally
- Don't repeat information already discussed in conversation
- Vary how you ask for the 1-10 energy rating
- Keep under 25 words
- Be understanding about their energy state${conversationSummary}`,
        userPrompt: `Ask for their current energy level (1-10) using your ${coachTone} style. Be natural and understanding.`,
        maxTokens: 40
      };

    case ConversationStep.IDENTIFY_LOCATION:
      
      if (isEnergyContext) {
        return {
          systemPrompt: `${coachPersona}

They're feeling ${selectedBlocker} with energy level ${energyLevel}/10. Understanding their location helps provide better movement suggestions.

Guidelines:
- Use your ${coachTone} style
- DON'T repeat details already in conversation (blocker, energy level)
- Ask where they are naturally
- Keep it under 25 words
- Show understanding that environment affects movement options${conversationSummary}`,
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
- Show understanding that environment affects cravings${conversationSummary}`,
        userPrompt: `Ask where they are right now using your ${coachTone} style. Be conversational and natural.`,
        maxTokens: 40
      };

    case ConversationStep.IDENTIFY_TRIGGER:
      return {
        systemPrompt: `${coachPersona}

They're at ${location} craving ${selectedFood} (intensity ${intensity}/10). Help them identify what might have triggered this craving.

Guidelines:
- Use your ${coachTone} style
- Don't repeat details already discussed in conversation
- Ask about possible triggers in an understanding way
- Keep it under 30 words
- Be empathetic - triggers are often emotional or situational${conversationSummary}`,
        userPrompt: `Ask what might have triggered this craving using your ${coachTone} style. Be understanding and conversational.`,
        maxTokens: 50
      };

    case ConversationStep.IDENTIFY_APPROACH:
      return {
        systemPrompt: `${coachPersona}

They're at ${location} feeling ${selectedBlocker} (energy ${energyLevel}/10). Help them identify what usually helps them get unstuck or overcome barriers to movement.

Guidelines:
- Use your ${coachTone} style
- Don't repeat details already discussed in conversation
- Ask about their preferred approach to overcoming obstacles in an encouraging way
- Keep it under 30 words
- Be supportive - focus on what typically works for them${conversationSummary}`,
        userPrompt: `Ask what usually helps them get unstuck using your ${coachTone} style. Be encouraging and focus on their preferred approach to overcoming barriers.`,
        maxTokens: 50
      };

    case ConversationStep.SUGGEST_TACTIC:
      const intervention = interventions?.[0];
      
      if (isEnergyContext) {
        return {
          systemPrompt: `${coachPersona}\n\nThey're feeling ${selectedBlocker} (energy ${energyLevel}/10) at ${location}, and usually get unstuck through ${approach}. Time to suggest a helpful movement strategy that aligns with their preferred approach.\n\nGuidelines:\n- Use your ${coachTone} style\n- Don't repeat details already discussed\n- Suggest the specific intervention: "${intervention?.name}" - ${intervention?.description}\n- Provide clear, step-by-step instructions on exactly what they should do\n- Explain WHY this intervention works and how it connects to their preferred approach\n- Include specific actions they can take right now\n- Frame it as a way to overcome their blocker using their preferred approach\n- Be encouraging and detailed - they need to understand both the "what" and the "why"\n- Use 2-3 sentences to give them enough detail to succeed${conversationSummary}`,
          userPrompt: `Suggest they try "${intervention?.name}" (${intervention?.description}) using your ${coachTone} style. Give them specific steps on how to do it, explain why it works for their situation, and connect it to their preferred approach: ${approach}. Be detailed enough that they know exactly what to do.`,
          maxTokens: 150
        };
      }
      
      return {
        systemPrompt: `${coachPersona}\n\nThey're craving ${selectedFood} (${intensity}/10) at ${location}, triggered by ${trigger}. Time to suggest a helpful strategy.\n\nGuidelines:\n- Use your ${coachTone} style\n- Don't repeat details already discussed\n- Suggest the specific intervention: "${intervention?.name}" - ${intervention?.description}\n- Provide clear, step-by-step instructions on exactly what they should do\n- Explain WHY this intervention works as an alternative to the craving\n- Include specific actions they can take right now\n- Frame it as a powerful alternative to giving in to the craving\n- Be encouraging and detailed - they need to understand both the "what" and the "why"\n- Use 2-3 sentences to give them enough detail to succeed${conversationSummary}`,
        userPrompt: `Suggest they try "${intervention?.name}" (${intervention?.description}) using your ${coachTone} style. Give them specific steps on how to do it, explain why it works for cravings, and help them understand how this will help them overcome their ${trigger} trigger. Be detailed enough that they know exactly what to do.`,
        maxTokens: 150
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
        // This should not happen for encouragement step - second interventions should use SUGGEST_TACTIC step
        console.warn('ENCOURAGEMENT step called for "Another idea" - this should use SUGGEST_TACTIC step');
        const secondIntervention = interventions?.[0];
        return {
          systemPrompt: `${coachPersona}\n\nThey wanted a different approach, so now you're suggesting "${secondIntervention?.name}".\n\nGuidelines:\n- Use your authentic ${coachTone} communication style\n- Acknowledge they wanted another option positively\n- Provide clear, step-by-step instructions on exactly what they should do\n- Explain WHY this alternative intervention works\n- Include specific actions they can take right now\n- Be detailed enough that they know exactly what to do\n- Use 2-3 sentences to give them enough detail to succeed`,
          userPrompt: `Suggest "${secondIntervention?.name}" (${secondIntervention?.description}) using your ${coachTone} style. They wanted another option - be supportive of their choice. Give them specific steps on how to do it and explain why it works.`,
          maxTokens: 120
        };
      }
      
      // For regular encouragement, use the actual intervention name from interventions array
      const actualIntervention = interventions?.[0];
      console.log('ENCOURAGEMENT step with intervention:', actualIntervention?.name, 'chosenIntervention:', chosenIntervention?.name);
      
      return {
        systemPrompt: `${coachPersona}\n\nThey agreed to try "${actualIntervention?.name}". Give them encouragement and let them know you'll check back.\n\nGuidelines:\n- Use your authentic ${coachTone} communication style\n- Celebrate their commitment genuinely\n- Build their confidence naturally\n- Mention you'll check back soon\n- Keep it under 40 words\n- Avoid overused phrases like "You've got this!" or "I believe in you!"`,
        userPrompt: `They will try "${actualIntervention?.name}". Use your ${coachTone} style to encourage them authentically and mention you'll check back. Avoid cliché motivational phrases.`,
        maxTokens: 60
      };

    case ConversationStep.CHECK_ACTIVITY_COMPLETION:
      // Only for energy context - check if they completed the activity
      if (isEnergyContext) {
        const activityIntervention = interventions?.[0];
        const activityName = activityIntervention?.name || chosenIntervention?.name || 'the activity';
        
        // Check if they already responded about completion
        const lastClientMessage = conversationHistory?.slice().reverse().find(msg => msg.sender === 'client');
        const isFollowUpResponse = lastClientMessage && (
          lastClientMessage.text === 'I did!' || 
          lastClientMessage.text === "I didn't" ||
          (lastClientMessage.text.toLowerCase().includes('did') && 
           !lastClientMessage.text.toLowerCase().includes("i'll try it"))
        );
        
        if (isFollowUpResponse) {
          // They responded - provide celebration or encouragement
          const completed = lastClientMessage.text.includes('did') && !lastClientMessage.text.includes('didn\'t');
          
          return {
            systemPrompt: `${coachPersona}

They just told you they ${completed ? 'completed' : 'didn\'t complete'} "${activityName}".

Guidelines:
- Use your authentic ${coachTone} communication style
${completed ? 
  '- Celebrate their success genuinely but briefly\n- Acknowledge their effort and commitment' :
  '- Be understanding and encouraging\n- Normalize that not completing is okay\n- Focus on the attempt and learning'}
- Keep it under 25 words
- DO NOT ask about effectiveness yet - just celebrate or encourage${conversationSummary}`,
            userPrompt: `They ${completed ? 'completed' : 'didn\'t complete'} the activity. ${completed ? 'Celebrate briefly' : 'Be encouraging'}. Use your ${coachTone} style. Keep it short - don't ask about effectiveness yet.`,
            maxTokens: 50
          };
        } else {
          // Initial question about completion
          return {
            systemPrompt: `${coachPersona}

Check if ${clientName} completed "${activityName}". You're following up after encouraging them to try it.

Guidelines:
- Use your authentic ${coachTone} communication style  
- Reference the specific activity they were going to try
- Ask directly but warmly if they did it
- Keep it under 25 words
- Be understanding either way - completion isn't required for support${conversationSummary}`,
            userPrompt: `Ask ${clientName} if they completed "${activityName}" using your ${coachTone} style. Be warm and understanding.`,
            maxTokens: 40
          };
        }
      }
      
      // Fallback for non-energy context (shouldn't happen)
      return {
        systemPrompt: `${coachPersona}\n\nCheck how they're doing.`,
        userPrompt: `Check how ${clientName} is doing.`,
        maxTokens: 20
      };

    case ConversationStep.RATE_RESULT:
            
      // For RATE_RESULT, use the actual intervention from interventions array, not chosenIntervention
      const rateResultIntervention = interventions?.[0];
      const interventionName = rateResultIntervention?.name || chosenIntervention?.name || 'the strategy';
      const contextFood = isEnergyContext ? selectedBlocker : selectedFood;
      const contextType = isEnergyContext ? 'energy challenge' : 'craving';
      
      return {
        systemPrompt: `${coachPersona}\n\nCheck back about how "${interventionName}" worked for their ${contextFood} ${contextType}.\n\nGuidelines:\n- Use your ${coachTone} communication style\n- Don't repeat details already discussed\n- Reference the specific strategy they tried\n- Ask for effectiveness rating 1-10 in varied ways\n- Keep it under 30 words\n- Be curious and supportive regardless of results\n- Vary your check-in approach${conversationSummary}`,
        userPrompt: `Check back about "${interventionName}" effectiveness using your ${coachTone} style. Ask for a 1-10 rating. Be natural and supportive.`,
        maxTokens: 50
      };

    case ConversationStep.CLOSE:
      // Extract the effectiveness rating from the conversation history
      const lastClientMessage = conversationHistory?.slice().reverse().find(msg => msg.sender === 'client');
      const effectivenessRating = lastClientMessage ? parseInt(lastClientMessage.text) : null;
      
            
      return {
        systemPrompt: `${coachPersona}\n\nWrap up the session. They just rated the effectiveness as ${effectivenessRating || 'unknown'}/10.\n\nGuidelines:\n- Use your authentic ${coachTone} communication style\n- SPECIFICALLY acknowledge their ${effectivenessRating}/10 rating\n- If high rating (7+): Celebrate the success\n- If medium rating (4-6): Acknowledge the partial help and learning\n- If low rating (1-3): Validate their honesty and emphasize the learning\n- Keep it under 35 words\n- Be genuine, not formulaic${conversationSummary}`,
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