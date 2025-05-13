'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { PaperAirplaneIcon } from '@heroicons/react/24/solid'
import { CravingService } from '@/lib/client-portal/craving-service'
import { Message, ConversationStep, MessageType, Intervention } from '@/lib/client-portal/craving-types'
import { getCoachResponse, CoachResponse, Option } from '@/lib/client-portal/craving-conversation'
import * as CravingDB from '@/lib/client-portal/craving-db'

export default function CravingSosPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState<ConversationStep>(ConversationStep.WELCOME)
  const [optionChoices, setOptionChoices] = useState<Array<Option | string>>([])
  const [clientName, setClientName] = useState<string>('there')
  const [clientId, setClientId] = useState<string>('')
  const [selectedFood, setSelectedFood] = useState<string | undefined>()
  const [chosenIntervention, setChosenIntervention] = useState<Intervention | undefined>()
  const [interventions, setInterventions] = useState<Intervention[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const cravingServiceRef = useRef<CravingService | null>(null)
  // Track if an incident has been created
  const [, setIncidentCreated] = useState(false)
  // Session state
  const [coach, setCoach] = useState({
    name: 'Your Coach',
    avatarUrl: '',
    supportType: 'Craving Support'
  })

  // We'll use addMessage for all message operations
  
  // Add a message to both UI and database
  const addMessage = async (message: Message) => {
    if (!cravingServiceRef.current) return;
    try {
      await cravingServiceRef.current.saveMessage(message);
      setMessages(prev => [...prev, message]);
    } catch {
      // If database save fails, still update UI
      setMessages(prev => [...prev, message]);
    }
  };

  // Initialize craving service and chat
  useEffect(() => {
    let mounted = true;
    
    const initChat = async () => {
      try {
        // Create and initialize craving service instance
        if (!cravingServiceRef.current) {
          cravingServiceRef.current = new CravingService()
        }

        // Initialize service and wait for client ID
        if (cravingServiceRef.current && mounted) {
          const initialized = await cravingServiceRef.current.initialize()
          if (!initialized) {
            return
          }
          
          // Fetch session information (both client and coach)
          const sessionInfo = await cravingServiceRef.current.getSessionInfo()
          let firstName = 'there';
          
          if (mounted) {
            if (sessionInfo.coach) {
              setCoach({
                name: sessionInfo.coach.full_name || 'Your Coach',
                avatarUrl: sessionInfo.coach.avatar_url || '',
                supportType: 'Craving Support'
              })
            }
            
            if (sessionInfo.client) {
              firstName = sessionInfo.client.full_name.split(' ')[0] || 'there';
              setClientName(firstName);
              setClientId(sessionInfo.client.id);
            }

            // Make sure we have an incident ID before proceeding
            // First, create the incident and ensure we have a valid ID
            let incidentId: string | null = null;
            
            // Always create a new incident for this session
            // This ensures we have a fresh incident ID before saving any messages
            incidentId = await cravingServiceRef.current.createCravingIncident();
            if (!incidentId) {
              console.error('Failed to create incident');
              return;
            }
            setIncidentCreated(true);
            
            // Double-check that the incident ID is set in the service
            if (cravingServiceRef.current.getIncidentId() !== incidentId) {
              console.error('Incident ID mismatch');
              return;
            }

            // Initial welcome message
            const welcomeRes: CoachResponse = await getCoachResponse({
              currentStep: ConversationStep.WELCOME,
              clientName: firstName,
              clientId: sessionInfo.client?.id || '',
            });

            // Save welcome message directly using the incident ID we just created
            if (cravingServiceRef.current) {
              // Force direct save to ensure it works
              await CravingDB.saveMessage(incidentId, welcomeRes.response);
            }
            setMessages(prev => [...prev, welcomeRes.response]);
            
            // Move to food selection step
            const foodSelectionRes: CoachResponse = await getCoachResponse({
              currentStep: welcomeRes.nextStep,
              clientName: firstName,
              clientId: sessionInfo.client?.id || '',
            });
            
            // Save food selection message directly using the incident ID
            if (cravingServiceRef.current) {
              // Force direct save to ensure it works
              await CravingDB.saveMessage(incidentId, foodSelectionRes.response);
            }
            setMessages(prev => [...prev, foodSelectionRes.response]);
            
            // Update state for food selection
            setCurrentStep(foodSelectionRes.nextStep);
            setOptionChoices(foodSelectionRes.options || []);
          }
        }
      } catch {
        // Silent error handling
      }
    }
    
    initChat()
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      mounted = false;
    }
  }, [])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async () => {
    if ((!inputValue.trim() && !optionChoices.length) || isLoading) return
    const messageText = inputValue.trim()
    setInputValue('')
    setIsLoading(true)
    try {
      // Add client message to UI and database
      const newClientMessage: Message = {
        id: `client-${Date.now()}`,
        sender: 'client',
        text: messageText,
        type: 'text',
        timestamp: new Date(),
      }
      await addMessage(newClientMessage)
      
      // Get coach's response
      const coachRes: CoachResponse = await getCoachResponse({
        currentStep,
        clientName,
        clientId,
        selectedFood,
        chosenIntervention,
      })
      
      // Update state based on response
      if (currentStep === ConversationStep.SUGGEST_TACTIC && coachRes.interventions) {
        setInterventions(coachRes.interventions)
      }
      
      // Add coach's response with a slight delay for natural feeling
      setTimeout(async () => {
        await addMessage(coachRes.response)
        setCurrentStep(coachRes.nextStep)
        setOptionChoices(coachRes.options || [])
        setIsLoading(false)
        
        // Schedule follow-up if needed
        if (coachRes.nextStep === ConversationStep.ENCOURAGEMENT) {
          // Schedule follow-up in 15 minutes
          setTimeout(async () => {
            const followUpRes = await getCoachResponse({
              currentStep: ConversationStep.FOLLOWUP,
              clientName,
              clientId,
              selectedFood,
              chosenIntervention,
            })
            await addMessage(followUpRes.response)
            setCurrentStep(followUpRes.nextStep)
            setOptionChoices(followUpRes.options || [])
          }, 15 * 60 * 1000) // 15 minutes in milliseconds
        }
      }, 1000)
    } catch {
      setIsLoading(false)
    }
  }


  const handleIntensitySelect = async (level: number) => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const levelStr = level.toString();
      const clientMessage: Message = {
        id: `client-${Date.now()}`,
        sender: 'client',
        text: levelStr,
        type: 'intensity_rating',
        timestamp: new Date(),
      };
      
      // Add client message to UI and database
      await addMessage(clientMessage);

      // Update the incident with the appropriate intensity field based on the current step
      if (cravingServiceRef.current) {
        if (currentStep === ConversationStep.RATE_RESULT) {
          // If we're at the RATE_RESULT step, update the result_rating
          console.log(`Saving result rating: ${level}`);
          await cravingServiceRef.current.updateIncident({ resultRating: level });
        } else {
          // Otherwise, update the initial_intensity (for the GAUGE_INTENSITY step)
          console.log(`Saving initial intensity: ${level}`);
          await cravingServiceRef.current.updateIncident({ initialIntensity: level });
        }
      }

      // Get coach's response for location question
      const coachRes = await getCoachResponse({
        currentStep,
        clientName,
        clientId,
        selectedFood,
        chosenIntervention
      });

      // Add coach's response with a slight delay
      setTimeout(async () => {
        // Check if this is the follow-up message that should mark the incident as resolved
        if (coachRes.response.metadata?.markAsResolved && cravingServiceRef.current) {
          console.log('Marking incident as resolved');
          await cravingServiceRef.current.updateIncident({
            resolvedAt: new Date()
          });
        }
        
        await addMessage(coachRes.response);
        
        // Update state based on coach's response
        setCurrentStep(coachRes.nextStep);
        setOptionChoices(coachRes.options || []);
        if (coachRes.interventions) {
          setInterventions(coachRes.interventions);
        }
        
        setIsLoading(false);
      }, 1000);
    } catch {
      setIsLoading(false);
    }
  };

  const handleOptionSelect = async (option: string | Option) => {
    if (isLoading) return;

    const cleanValue = typeof option === 'string' ? option : option.name;
    const displayText = typeof option === 'string' ? option : `${option.emoji || ''} ${option.name}`.trim();

    setIsLoading(true);
    try {
      // Determine message type based on current step
      let messageType: MessageType = 'text';
      
      // Log the current step and value for debugging
      console.log(`Processing option selection for step: ${currentStep}`, cleanValue);
      
      // Handle the database updates based on the CURRENT step
      // This is critical - we need to update the correct fields based on which question
      // the user is currently answering
      switch (currentStep) {
        case ConversationStep.GAUGE_INTENSITY:
          // We're at the food selection step (IDENTIFY_CRAVING), but the current step is GAUGE_INTENSITY
          // because we've already advanced to the next step
          messageType = 'option_selection';
          setSelectedFood(cleanValue);
          
          // Update incident with trigger food
          if (cravingServiceRef.current) {
            console.log(`Saving trigger food: ${cleanValue}`);
            const result = await cravingServiceRef.current.updateIncident({ 
              triggerFood: cleanValue 
            });
            console.log('Trigger food update result:', result);
          }
          break;
          
        case ConversationStep.IDENTIFY_LOCATION:
          // Answering intensity question
          messageType = 'intensity_rating';
          const intensity = parseInt(cleanValue, 10);
          if (!isNaN(intensity) && cravingServiceRef.current) {
            await cravingServiceRef.current.updateIncident({ 
              initialIntensity: intensity 
            });
          }
          break;
          
        case ConversationStep.IDENTIFY_TRIGGER:
          // Answering location question
          messageType = 'location_selection';
          if (cravingServiceRef.current) {
            console.log(`Saving location: ${cleanValue}`);
            const result = await cravingServiceRef.current.updateIncident({ 
              location: cleanValue 
            });
            console.log('Location update result:', result);
          }
          break;
          
        case ConversationStep.SUGGEST_TACTIC:
          // Answering trigger question
          messageType = 'option_selection'; // Updated to match the coach message type
          if (cravingServiceRef.current) {
            console.log(`Saving context/trigger: ${cleanValue}`);
            const result = await cravingServiceRef.current.updateIncident({ 
              context: cleanValue 
            });
            console.log('Context update result:', result);
          }
          break;

        case ConversationStep.RATE_RESULT:
          // Handle the result rating (1-10 scale)
          messageType = 'intensity_rating';
          const resultRating = parseInt(cleanValue, 10);
          if (!isNaN(resultRating) && cravingServiceRef.current) {
            console.log(`Saving result rating: ${resultRating}`);
            const result = await cravingServiceRef.current.updateIncident({ 
              resultRating: resultRating 
            });
            console.log('Result rating update result:', result);
          }
          break;
          
        case ConversationStep.ENCOURAGEMENT:
          // Find the selected intervention
          messageType = 'tactic_response'; // Updated to match the coach message type
          const intervention = interventions.find(i => i.name === cleanValue);
          if (intervention) {
            setChosenIntervention(intervention);
            if (cravingServiceRef.current) {
              // Check if this is the "Another idea" option
              if (cleanValue === "Another idea") {
                // User wants another intervention
                console.log('User requested another intervention option');
                
                // IMPORTANT: We need to set this DIRECTLY, not through setState
                // This ensures it's available immediately for the next getCoachResponse call
                const anotherIdeaIntervention = {
                  id: 'another-idea',
                  name: "Another idea",
                  description: "User requested another intervention option"
                };
                
                // Set it in state for future reference
                setChosenIntervention(anotherIdeaIntervention);
                
                // We need to use the anotherIdeaIntervention directly in the getCoachResponse call below
                console.log('Will use anotherIdeaIntervention in getCoachResponse call');
                // We don't need to update anything in the database here
              } else if (cleanValue === "Yes, I'll try it") {
                // User accepted the intervention - find the intervention and update intervention_id
                // When user clicks "Yes, I'll try it", we should use the current interventions list
                if (interventions.length > 0) {
                  const selectedIntervention = interventions[0]; // First intervention in the list
                  if (selectedIntervention && selectedIntervention.id) {
                    console.log(`User accepted intervention: ${selectedIntervention.name} (${selectedIntervention.id})`);
                    
                    // IMPORTANT: Set the chosenIntervention to the selected intervention
                    // This ensures the ENCOURAGEMENT step knows which intervention was chosen
                    setChosenIntervention(selectedIntervention);
                    
                    await cravingServiceRef.current.updateIncident({
                      interventionId: selectedIntervention.id,
                      tacticUsed: selectedIntervention.name
                    });
                  }
                }
              } else if (intervention.id) {
                // User accepted the intervention directly - update intervention_id
                console.log(`User accepted intervention: ${intervention.name} (${intervention.id})`);
                await cravingServiceRef.current.updateIncident({
                  interventionId: intervention.id,
                  tacticUsed: cleanValue
                });
              }
            }
          }
          break;
      }

      // Update message type for FOLLOWUP and RATE_RESULT steps
      if (currentStep === ConversationStep.FOLLOWUP) {
        messageType = 'followup_response';
      } else if (currentStep === ConversationStep.RATE_RESULT) {
        messageType = 'intensity_rating';
      }
      
      // Create client message
      const clientMessage: Message = {
        id: `client-${Date.now()}`,
        sender: 'client',
        text: displayText,
        type: messageType,
        timestamp: new Date(),
      };

      // Save client message to database and add to UI
      if (cravingServiceRef.current) {
        await cravingServiceRef.current.saveMessage(clientMessage);
      }
      setMessages(prev => [...prev, clientMessage]);

      // Special handling for different options
      let useDirectIntervention = false;
      let directIntervention: { id: string; name: string; description: string } | undefined = undefined;
      
      // Handle "Another idea" option
      if (cleanValue === "Another idea") {
        console.log('Direct handling of Another idea option');
        // We'll bypass the normal flow and directly get a second intervention
        useDirectIntervention = true;
        
        // Create a temporary intervention object to use in the direct call
        directIntervention = {
          id: 'another-idea',
          name: "Another idea",
          description: "User requested another intervention option"
        };
      }
      
      // Handle "Yes, I'll try it" option - update the intervention_id
      if (cleanValue === "Yes, I'll try it" && interventions.length > 0 && cravingServiceRef.current) {
        const selectedIntervention = interventions[0]; // First intervention in the list
        if (selectedIntervention && selectedIntervention.id) {
          console.log(`User selected Yes, I'll try it for intervention: ${selectedIntervention.name} (${selectedIntervention.id})`);
          
          // IMPORTANT: Set the chosenIntervention to the selected intervention
          // This ensures the ENCOURAGEMENT step knows which intervention was chosen
          setChosenIntervention(selectedIntervention);
          
          // Create a local variable to use in the getCoachResponse call below
          const acceptedIntervention = {
            id: selectedIntervention.id,
            name: selectedIntervention.name,
            description: selectedIntervention.description,
            isSecondInterventionAccepted: true // Special flag to indicate this is accepting a second intervention
          };
          
          // We'll use this acceptedIntervention directly in the getCoachResponse call below
          // instead of trying to modify the constant chosenIntervention
          useDirectIntervention = true;
          directIntervention = acceptedIntervention;
          
          await cravingServiceRef.current.updateIncident({
            interventionId: selectedIntervention.id,
            tacticUsed: selectedIntervention.name
          });
        }
      }
      
      // Get coach's response - use direct intervention if needed
      const coachRes: CoachResponse = await getCoachResponse({
        currentStep,
        clientName,
        clientId,
        selectedFood,
        chosenIntervention: useDirectIntervention ? directIntervention : chosenIntervention
      });

      // Add coach's response with a slight delay
      setTimeout(async () => {
        // Save coach response to database and add to UI
        if (cravingServiceRef.current) {
          await cravingServiceRef.current.saveMessage(coachRes.response);
        }
        setMessages(prev => [...prev, coachRes.response]);
        
        // Update state based on coach's response
        setCurrentStep(coachRes.nextStep);
        setOptionChoices(coachRes.options || []);
        if (coachRes.interventions) {
          setInterventions(coachRes.interventions);
        }
        
        // Schedule follow-up if needed
        if (coachRes.nextStep === ConversationStep.FOLLOWUP) {
          // For demo purposes, we'll use a shorter timeout
          setTimeout(async () => {
            const followUpRes = await getCoachResponse({
              currentStep: ConversationStep.FOLLOWUP,
              clientName,
              clientId,
              selectedFood,
              chosenIntervention,
            });
            
            // Save follow-up message to database and add to UI
            if (cravingServiceRef.current) {
              await cravingServiceRef.current.saveMessage(followUpRes.response);
            }
            setMessages(prev => [...prev, followUpRes.response]);
            
            setCurrentStep(followUpRes.nextStep);
            setOptionChoices(followUpRes.options || []);
          }, 15 * 1000); // 15 seconds for demo (would be 15 minutes in production)
        }
        
        setIsLoading(false);
      }, 1000);
    } catch {
      setIsLoading(false);
    }
  };

  // Render message content based on type
  const renderMessageContent = (message: Message) => {
    switch (message.type) {
      case 'intensity_rating':
        return (
          <div>
            <p>{message.text}</p>
            {message.sender === 'coach' && (
              <div className="mt-2 flex items-center space-x-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => (
                  <button
                    key={level}
                    onClick={() => handleIntensitySelect(level)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center
                      ${level <= 3 ? 'bg-green-100 text-green-700' : 
                        level <= 7 ? 'bg-yellow-100 text-yellow-700' : 
                        'bg-red-100 text-red-700'}`}
                    disabled={isLoading}
                  >
                    {level}
                  </button>
                ))}
              </div>
            )}
          </div>
        )
        
      default:
        return <p>{message.text}</p>
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header with coach info */}
      <div className="bg-purple-500 text-white p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-12 w-12 rounded-full bg-white p-0.5 overflow-hidden">
            {coach.avatarUrl ? (
              <div className="relative h-full w-full">
                <Image 
                  src={coach.avatarUrl} 
                  alt={coach.name}
                  fill
                  sizes="48px"
                  className="rounded-full object-cover"
                  onError={() => {
                    console.error('Failed to load coach avatar:', coach.avatarUrl)
                  }}
                />
              </div>
            ) : (
              <div className="h-full w-full rounded-full bg-purple-100 flex items-center justify-center">
                <span className="text-xl font-semibold text-purple-500">
                  {coach.name ? coach.name.charAt(0).toUpperCase() : 'C'}
                </span>
              </div>
            )}
          </div>
          <div>
            <div className="font-medium">{coach.name}</div>
            <div className="text-xs opacity-90">{coach.supportType}</div>
          </div>
        </div>
        <button 
          onClick={() => router.push('/client-portal/home')}
          className="text-white text-sm px-3 py-1 rounded hover:bg-purple-600"
        >
          Close
        </button>
      </div>
      
      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-4">
        {messages.map((message, index) => (
          <div 
            key={`${message.id}-${index}`} 
            className={`flex ${message.sender === 'client' ? 'justify-end' : 'justify-start'}`}
          >
            {message.sender === 'coach' && (
              <div className="h-8 w-8 rounded-full bg-purple-100 mr-2 overflow-hidden flex-shrink-0">
                {coach.avatarUrl ? (
                  <div className="relative h-full w-full">
                    <Image 
                      src={coach.avatarUrl} 
                      alt={coach.name}
                      fill
                      sizes="32px"
                      className="rounded-full object-cover"
                      onError={() => {
                        console.error('Failed to load coach avatar in message:', coach.avatarUrl)
                      }}
                    />
                  </div>
                ) : (
                  <div className="h-full w-full rounded-full bg-purple-300 flex items-center justify-center text-white text-sm font-semibold">
                    {coach.name ? coach.name.charAt(0).toUpperCase() : 'C'}
                  </div>
                )}
              </div>
            )}
            <div 
              className={`max-w-[75%] rounded-lg px-4 py-2 ${
                message.sender === 'client' 
                  ? 'bg-purple-500 text-white rounded-br-none' 
                  : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'
              }`}
            >
              {renderMessageContent(message)}
              <div className={`text-xs mt-1 ${message.sender === 'client' ? 'text-purple-100' : 'text-gray-500'}`}>
                {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Quick option buttons */}
      {optionChoices.length > 0 && (
        <div className="p-2 border-t border-gray-200 bg-white">
          <div className="flex flex-wrap gap-2">
            {optionChoices.map((option, index) => (
              <button
                key={index}
                onClick={() => handleOptionSelect(option)}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-full text-sm font-medium text-gray-800 transition-colors"
                disabled={isLoading}
              >
                {typeof option === 'string' ? option : (option.emoji ? `${option.emoji} ${option.name || ''}` : (option.text || ''))}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Message input */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleSendMessage()}
            placeholder="Type your message..."
            className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            disabled={isLoading}
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={(!inputValue.trim() && !optionChoices.length) || isLoading}
            className={`rounded-full p-2 ${
              (!inputValue.trim() && !optionChoices.length) || isLoading
                ? 'bg-gray-200 text-gray-400'
                : 'bg-purple-500 text-white hover:bg-purple-600'
            }`}
          >
            <PaperAirplaneIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
