'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { PaperAirplaneIcon } from '@heroicons/react/24/solid'
import { CravingService } from '@/lib/client-portal/craving-service'
import { Message, ConversationStep, Intervention } from '@/lib/client-portal/craving-types'
import { Option } from '@/lib/client-portal/craving-conversation'
import { toast } from '@/components/ui/use-toast'

export default function CravingSosPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState<ConversationStep>(ConversationStep.WELCOME)
  const [optionChoices, setOptionChoices] = useState<Array<Option | string>>([])
  const [clientName, setClientName] = useState<string>('there')
  const [chosenIntervention, setChosenIntervention] = useState<Intervention | undefined>()
  const [interventions, setInterventions] = useState<Intervention[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const cravingServiceRef = useRef<CravingService | null>(null)
  // Track if an incident has been created
  const [, setIncidentCreated] = useState(false)
  // Session state
  const [coach, setCoach] = useState({
    name: 'Your Coach',
    avatarUrl: '',
    supportType: 'Craving Support'
  })
  const [avatarLoading, setAvatarLoading] = useState(true)

  // We'll use addMessage for all message operations
  
  // Add a message to both UI and database
  const addMessage = async (message: Message) => {
    if (!cravingServiceRef.current) return;
    try {
      await cravingServiceRef.current.saveMessage(message);
      setMessages(prev => [...prev, message]);
    } catch (error) {
      console.error('❌ Failed to save message to database:', error);
      // Show user-friendly error message
      toast.error('Unable to save your message. Your conversation will continue, but this message may not be stored.');
      // If database save fails, still update UI
      setMessages(prev => [...prev, message]);
    }
  };

  // Keep track of initialization state
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  
  // Initialize craving service and chat
  useEffect(() => {
    let mounted = true;
    
    const initChat = async () => {
      // Prevent multiple initializations
      if (isInitialized) return;
      
      setIsInitializing(true);
      setInitializationError(null);
      
      try {
        // Create and initialize craving service instance
        if (!cravingServiceRef.current) {
          cravingServiceRef.current = new CravingService()
        }

        // Initialize service and wait for client ID
        if (cravingServiceRef.current && mounted) {
          // Get token from URL or localStorage
          const urlParams = new URLSearchParams(window.location.search);
          const urlToken = urlParams.get('token');
          const storedToken = localStorage.getItem('clientToken');
          const token = urlToken || storedToken;
          
          // iOS PWA-specific handling
          const isPWA = typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches;
          
          // Always store token in localStorage for future use
          if (token) {
            localStorage.setItem('clientToken', token);
            
            // For iOS PWA, try to update the URL with the token if it's not already there
            if (isPWA && !urlToken && window.history) {
              try {
                const newUrl = new URL(window.location.href);
                newUrl.searchParams.set('token', token);
                window.history.replaceState({}, '', newUrl.toString());
              } catch (error) {
                console.error('❌ Failed to update PWA URL with token:', error);
              }
            }
          }
          
          // Initialize with the token
          const initialized = await cravingServiceRef.current.initialize()
          
          if (!initialized) {
            // Don't return early - let getSessionInfo() handle token validation
            // This ensures the welcome messages are still created even if initial validation fails
            console.log('Initial token validation failed, but continuing with session setup...');
            toast.warning('Connection issues detected. Some features may not work properly.');
          }
          
          // Mark as initialized
          setIsInitialized(true);
          setIsInitializing(false);
          
          // Fetch session information (both client and coach)
          const sessionInfo = await cravingServiceRef.current.getSessionInfo()
          
          let firstName = 'there';
          
          if (mounted) {
            // Handle coach information
            if (sessionInfo.coach) {
              setCoach({
                name: sessionInfo.coach.full_name || 'Your Coach',
                avatarUrl: sessionInfo.coach.avatar_url || '',
                supportType: 'Craving Support'
              });
              // Reset avatar loading state when coach info is set
              setAvatarLoading(!!sessionInfo.coach.avatar_url);
            } else {
              // Try direct coach lookup if we have a client ID
              const storedClientId = localStorage.getItem('clientId');
              if (storedClientId && cravingServiceRef.current) {
                try {
                  const clientDetails = await cravingServiceRef.current.fetchClientDetails(storedClientId);
                  if (clientDetails && clientDetails.coach_id) {
                    const coachDetails = await cravingServiceRef.current.getCoachDetails(clientDetails.coach_id);
                    if (coachDetails) {
                      setCoach({
                        name: coachDetails.full_name || 'Your Coach',
                        avatarUrl: coachDetails.avatar_url || '',
                        supportType: 'Craving Support'
                      });
                      // Reset avatar loading state when coach info is set
                      setAvatarLoading(!!coachDetails.avatar_url);
                    }
                  }
                } catch (error) {
                  console.error('❌ Failed to fetch coach details from client ID:', error);
                }
              }
            }
            
            // Handle client information
            if (sessionInfo.client) {
              firstName = sessionInfo.client.full_name.split(' ')[0] || 'there';
              setClientName(firstName);
              // setClientId(sessionInfo.client.id);
            } else {
              // Try direct client lookup
              const storedClientId = localStorage.getItem('clientId');
              if (storedClientId && cravingServiceRef.current) {
                try {
                  const clientDetails = await cravingServiceRef.current.fetchClientDetails(storedClientId);
                  if (clientDetails) {
                    firstName = clientDetails.full_name.split(' ')[0] || 'there';
                    setClientName(firstName);
                    // setClientId(storedClientId);
                  }
                } catch (error) {
                  console.error('❌ Failed to fetch client details from stored ID:', error);
                }
              }
            }

            // Make sure we have an incident ID before proceeding
            // First, create the incident and ensure we have a valid ID
            let incidentId: string | null = null;
            
            // Always create a new incident for this session
            // This ensures we have a fresh incident ID before saving any messages
            incidentId = await cravingServiceRef.current.createCravingIncident();
            if (!incidentId) {
              toast.error('Unable to start your craving support session. Please try refreshing the page or contact your coach.');
              return;
            }
            setIncidentCreated(true);
            
            // Double-check that the incident ID is set in the service
            if (cravingServiceRef.current.getIncidentId() !== incidentId) {
              return;
            }

            // Initial welcome message
            const welcomeRes = await cravingServiceRef.current.getWelcomeMessage(firstName);

            // Save welcome message directly using the incident ID we just created
            if (cravingServiceRef.current) {
              await cravingServiceRef.current.saveMessage(welcomeRes.response);
            }
            setMessages(prev => [...prev, welcomeRes.response]);
            
            // Move to food selection step
            const foodSelectionRes = await cravingServiceRef.current.getFoodSelectionMessage(firstName);
            
            // Save food selection message directly using the incident ID
            if (cravingServiceRef.current) {
              await cravingServiceRef.current.saveMessage(foodSelectionRes.response);
            }
            setMessages(prev => [...prev, foodSelectionRes.response]);
            
            // Update state for food selection
            setCurrentStep(foodSelectionRes.nextStep);
            setOptionChoices(foodSelectionRes.options || []);
          }
        }
      } catch (error) {
        console.error('❌ Chat initialization failed:', error);
        setInitializationError('Unable to initialize your support session. Please refresh the page or check your internet connection.');
        toast.error('Unable to initialize your support session. Please refresh the page or check your internet connection.');
        setIsInitializing(false);
      }
    }
    
    initChat()
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      mounted = false;
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-focus input after coach messages
  useEffect(() => {
    if (!isLoading && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isLoading, messages.length])

  const handleSendMessage = async () => {
    if ((!inputValue.trim() && !optionChoices.length) || isLoading) return
    const messageText = inputValue.trim()
    setInputValue('')
    setIsLoading(true)
    
    try {
      if (!cravingServiceRef.current) {
        setIsLoading(false)
        return
      }
      
      await cravingServiceRef.current.processUserInput({
        input: messageText,
        currentStep,
        clientName,
        chosenIntervention,
        interventions,
        isOption: false,
        onMessage: addMessage,
        onStateUpdate: ({ currentStep: newStep, optionChoices: newOptions, interventions: newInterventions, chosenIntervention: newChosen }) => {
          setCurrentStep(newStep)
          setOptionChoices(newOptions)
          if (newInterventions) setInterventions(newInterventions)
          if (newChosen !== undefined) setChosenIntervention(newChosen || undefined)
          setIsLoading(false)
        }
      })
    } catch (error) {
      console.error('❌ handleSendMessage failed:', error);
      toast.error('Unable to send your message. Please try again.');
      setIsLoading(false)
    }
  }

  const handleIntensitySelect = async (level: number) => {
    if (isLoading) return;
    setIsLoading(true);
    
    try {
      if (!cravingServiceRef.current) {
        setIsLoading(false)
        return
      }
      
      await cravingServiceRef.current.processUserInput({
        input: level.toString(),
        currentStep,
        clientName,
        chosenIntervention,
        interventions,
        isOption: true,
        onMessage: addMessage,
        onStateUpdate: ({ currentStep: newStep, optionChoices: newOptions, interventions: newInterventions, chosenIntervention: newChosen }) => {
          setCurrentStep(newStep)
          setOptionChoices(newOptions)
          if (newInterventions) setInterventions(newInterventions)
          if (newChosen !== undefined) setChosenIntervention(newChosen || undefined)
          setIsLoading(false)
        }
      })
    } catch (error) {
      console.error('❌ handleIntensitySelect failed:', error);
      toast.error('Unable to record your intensity rating. Please try again.');
      setIsLoading(false);
    }
  };

  const handleOptionSelect = async (option: string | Option) => {
    if (isLoading) return;

    const cleanValue = typeof option === 'string' ? option : option.name;
    setIsLoading(true);
    
    try {
      if (!cravingServiceRef.current) {
        setIsLoading(false)
        return
      }
      
      await cravingServiceRef.current.processUserInput({
        input: cleanValue,
        currentStep,
        clientName,
        chosenIntervention,
        interventions,
        isOption: true,
        onMessage: addMessage,
        onStateUpdate: ({ currentStep: newStep, optionChoices: newOptions, interventions: newInterventions, chosenIntervention: newChosen }) => {
          setCurrentStep(newStep)
          setOptionChoices(newOptions)
          if (newInterventions) setInterventions(newInterventions)
          if (newChosen !== undefined) setChosenIntervention(newChosen || undefined)
          setIsLoading(false)
        }
      })
    } catch (error) {
      console.error('❌ handleOptionSelect failed:', error);
      toast.error('Unable to process your selection. Please try again.');
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

  // Show loading state during initialization
  if (isInitializing) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <div className="bg-purple-500 text-white p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-12 w-12 rounded-full bg-white p-0.5">
              <div className="h-full w-full rounded-full bg-purple-100 animate-pulse" />
            </div>
            <div>
              <div className="h-4 bg-white/20 rounded animate-pulse w-24 mb-1" />
              <div className="h-3 bg-white/20 rounded animate-pulse w-32" />
            </div>
          </div>
          <button 
            onClick={() => router.push('/client-portal/home')}
            className="text-white text-sm px-3 py-1 rounded hover:bg-purple-600"
          >
            Close
          </button>
        </div>
        
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="inline-flex items-center px-4 py-2 font-semibold leading-6 text-sm shadow rounded-md text-purple-500 bg-white">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-purple-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Setting up your session...
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Show error state if initialization failed
  if (initializationError) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <div className="bg-purple-500 text-white p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-12 w-12 rounded-full bg-white p-0.5 flex items-center justify-center">
              <span className="text-red-500 text-xl">⚠️</span>
            </div>
            <div>
              <div className="font-medium">Connection Error</div>
              <div className="text-xs opacity-90">Unable to connect</div>
            </div>
          </div>
          <button 
            onClick={() => router.push('/client-portal/home')}
            className="text-white text-sm px-3 py-1 rounded hover:bg-purple-600"
          >
            Close
          </button>
        </div>
        
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center max-w-md mx-auto p-6">
            <div className="text-6xl mb-4">😔</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to Start Session</h3>
            <p className="text-gray-600 mb-6">{initializationError}</p>
            <div className="space-y-3">
              <button 
                onClick={() => window.location.reload()}
                className="w-full bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600"
              >
                Try Again
              </button>
              <button 
                onClick={() => router.push('/client-portal/home')}
                className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
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
                  className={`rounded-full object-cover transition-opacity duration-200 ${
                    avatarLoading ? 'opacity-0' : 'opacity-100'
                  }`}
                  onLoad={() => setAvatarLoading(false)}
                  onError={() => {
                    console.error('Failed to load coach avatar:', coach.avatarUrl)
                    setAvatarLoading(false)
                  }}
                />
                {avatarLoading && (
                  <div className="absolute inset-0 rounded-full bg-purple-100 animate-pulse flex items-center justify-center">
                    <span className="text-lg font-semibold text-purple-400">
                      {coach.name ? coach.name.charAt(0).toUpperCase() : 'C'}
                    </span>
                  </div>
                )}
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
        
        {/* Loading indicator when processing user input */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="h-8 w-8 rounded-full bg-purple-100 mr-2 overflow-hidden flex-shrink-0">
              {coach.avatarUrl ? (
                <div className="relative h-full w-full">
                  <Image 
                    src={coach.avatarUrl} 
                    alt={coach.name}
                    fill
                    sizes="32px"
                    className="rounded-full object-cover"
                  />
                </div>
              ) : (
                <div className="h-full w-full rounded-full bg-purple-300 flex items-center justify-center text-white text-sm font-semibold">
                  {coach.name ? coach.name.charAt(0).toUpperCase() : 'C'}
                </div>
              )}
            </div>
            <div className="max-w-[75%] rounded-lg px-4 py-2 bg-white border border-gray-200 text-gray-800 rounded-bl-none">
              <div className="flex items-center space-x-1">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
                <span className="text-sm text-gray-500 ml-2">Thinking...</span>
              </div>
            </div>
          </div>
        )}
        
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
            ref={inputRef}
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
            {isLoading ? (
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <PaperAirplaneIcon className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
