'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { PaperAirplaneIcon } from '@heroicons/react/24/solid'
import CravingService, { 
  Message, 
  ConversationStep 
} from '@/lib/client-portal/craving-service'

export default function CravingSosPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState<ConversationStep>(ConversationStep.WELCOME)
  const [optionChoices, setOptionChoices] = useState<Array<{emoji?: string; name?: string; text?: string; value?: string} | string>>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const cravingServiceRef = useRef<CravingService | null>(null)
  
  // Session state
  const [coach, setCoach] = useState({
    name: 'Your Coach',
    avatarUrl: '',
    supportType: 'Craving Support'
  })

  // Initialize craving service and chat
  useEffect(() => {
    let mounted = true;
    
    const initChat = async () => {
      try {
        // Create craving service instance
        if (!cravingServiceRef.current) {
          cravingServiceRef.current = new CravingService()
        }
        
        // Create a new craving incident
        if (cravingServiceRef.current && mounted) {
          await cravingServiceRef.current.createCravingIncident()
          
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
            }
            
            // Add initial welcome message with the correct client name
            const initialMessage: Message = {
              id: `init-${Date.now()}`,
              sender: 'coach',
              text: `Hi ${firstName}, I see you're having a craving moment. Let's work through this together.`,
              type: 'text',
              timestamp: new Date(),
            }
            
            setMessages([initialMessage])
            
            // Save the message to the database
            if (cravingServiceRef.current) {
              await cravingServiceRef.current.saveMessage({
                sender: initialMessage.sender,
                text: initialMessage.text,
                type: initialMessage.type,
                timestamp: initialMessage.timestamp,
              })
            }
            
            // Get the next step
            if (cravingServiceRef.current) {
              const { response, nextStep, options } = await cravingServiceRef.current.processClientMessage(
                '', 
                ConversationStep.WELCOME
              )
              
              // Add the response to messages after a short delay
              const responseWithUniqueId = {
                ...response,
                id: `resp-${Date.now()}`
              };
              
              setTimeout(() => {
                if (mounted) {
                  setMessages(prev => [...prev, responseWithUniqueId])
                  setCurrentStep(nextStep)
                  if (options) setOptionChoices(options)
                  
                  // Save the message
                  if (cravingServiceRef.current) {
                    cravingServiceRef.current.saveMessage({
                      sender: responseWithUniqueId.sender,
                      text: responseWithUniqueId.text,
                      type: responseWithUniqueId.type,
                      timestamp: responseWithUniqueId.timestamp,
                      metadata: responseWithUniqueId.metadata
                    })
                  }
                }
              }, 1000)
            }
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
      // Add client message to UI with a unique ID
      const newClientMessage: Message = {
        id: `client-${Date.now()}`,
        sender: 'client',
        text: messageText,
        type: 'text',
        timestamp: new Date(),
      }
      
      // Update messages state once
      setMessages(prev => [...prev, newClientMessage])
      
      // Save the message to the database
      if (cravingServiceRef.current) {
        await cravingServiceRef.current.saveMessage({
          sender: newClientMessage.sender,
          text: newClientMessage.text,
          type: newClientMessage.type,
          timestamp: newClientMessage.timestamp,
        })
        
        // Process the message and get the next step
        const { response, nextStep, options } = await cravingServiceRef.current.processClientMessage(
          messageText, 
          currentStep
        )
        
        // Create a response with a unique ID
        const responseWithUniqueId = {
          ...response,
          id: `coach-${Date.now()}`
        };
        
        // Add the response after a short delay
        setTimeout(() => {
          // Batch state updates to minimize renders
          setMessages(prev => [...prev, responseWithUniqueId])
          setCurrentStep(nextStep)
          setOptionChoices(options || [])
          setIsLoading(false)
          
          // Save the response
          cravingServiceRef.current?.saveMessage({
            sender: responseWithUniqueId.sender,
            text: responseWithUniqueId.text,
            type: responseWithUniqueId.type,
            timestamp: responseWithUniqueId.timestamp,
            metadata: responseWithUniqueId.metadata
          })
          
          // If this is the encouragement step, schedule a follow-up
          if (nextStep === ConversationStep.ENCOURAGEMENT) {
            cravingServiceRef.current?.scheduleFollowUp(15)
          }
        }, 1000)
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setIsLoading(false)
    }
  }
  
  const handleOptionSelect = async (option: {emoji?: string; name?: string; text?: string; value?: string} | string) => {
    if (isLoading) return
    
    // Handle different option types
    let selectedText = ''
    
    if (typeof option === 'string') {
      selectedText = option
    } else if (option.name) {
      selectedText = option.emoji ? `${option.emoji} ${option.name}` : option.name
    } else if (option.text) {
      selectedText = option.value || option.text
    }
    
    // Set input value and send in one action to prevent flashing
    setInputValue(selectedText)
    
    // Use setTimeout to ensure the input value is set before sending
    setTimeout(() => {
      handleSendMessage()
    }, 0)
  }
  
  const handleIntensitySelect = async (level: number) => {
    if (isLoading) return
    
    const levelStr = level.toString()
    setInputValue(levelStr)
    
    // Use setTimeout to ensure the input value is set before sending
    setTimeout(() => {
      handleSendMessage()
    }, 0)
  }

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
            className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
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
