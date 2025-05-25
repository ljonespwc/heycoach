'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'

export default function InstallPrompt() {
  // Define a type for the BeforeInstallPromptEvent since it's not in the standard lib
  interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed', platform: string }>;
    prompt(): Promise<void>;
  }

  // Define a type for the window with deferredPrompt
  interface WindowWithPWA extends Window {
    deferredPrompt?: BeforeInstallPromptEvent;
  }
  
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstallable, setIsInstallable] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isMacOS, setIsMacOS] = useState(false)
  const [isChrome, setIsChrome] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  // Check if user has previously dismissed the prompt
  useEffect(() => {
    const hasPromptBeenDismissed = localStorage.getItem('pwaPromptDismissed')
    if (hasPromptBeenDismissed) {
      setDismissed(true)
    }
  }, [])

  // Detect device and browser
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ua = window.navigator.userAgent
      const isIOSDevice = /iPad|iPhone|iPod/.test(ua) && !('MSStream' in window)
      const isMacOSDevice = /Mac/.test(ua) && !isIOSDevice
      const isChromeDevice = /Chrome/.test(ua) && !/Edge/.test(ua)
      
      setIsIOS(isIOSDevice)
      setIsMacOS(isMacOSDevice)
      setIsChrome(isChromeDevice)
    }
  }, [])

  // Listen for beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault()
      // Store the event so it can be triggered later
      setInstallPrompt(e as BeforeInstallPromptEvent)
      // Set installable flag to true
      setIsInstallable(true)
      if (process.env.NODE_ENV === 'development') {
        console.log('InstallPrompt component: beforeinstallprompt event received')
      }
    }

    // Listen for our custom pwaInstallable event from pwa-register.js
    const handlePwaInstallable = () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('InstallPrompt component: pwaInstallable event received')
      }
      setIsInstallable(true)
      // Try to get the deferred prompt from window
      const windowWithPWA = window as WindowWithPWA
      if (windowWithPWA.deferredPrompt) {
        setInstallPrompt(windowWithPWA.deferredPrompt)
      }
    }

    // TypeScript doesn't know about beforeinstallprompt event, so we need to use the string version
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener)
    window.addEventListener('pwaInstallable', handlePwaInstallable)

    // Check if the app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setDismissed(true) // Don't show prompt if already installed
    }

    // Only run the Chrome on macOS hack in production mode
    if (process.env.NODE_ENV === 'production') {
      // Check if Chrome is showing the install prompt in the address bar
      // This is a hack to detect if the app is installable on Chrome desktop
      setTimeout(() => {
        if (!isInstallable && isMacOS && isChrome) {
          setIsInstallable(true)
        }
      }, 3000)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener)
      window.removeEventListener('pwaInstallable', handlePwaInstallable)
    }
  }, [isInstallable, isMacOS, isChrome])

  // Show prompt when component mounts (first visit)
  useEffect(() => {
    // Don't show if already dismissed
    if (dismissed) return

    // For Chrome on desktop, we need the beforeinstallprompt event to fire first
    // For iOS and other browsers, we can show the prompt right away
    if (isIOS || isMacOS || isInstallable) {
      // Show prompt after a short delay to let the page load
      const timer = setTimeout(() => {
        setShowPrompt(true)
      }, 2000) // 2 seconds
      
      return () => clearTimeout(timer)
    }
  }, [dismissed, isIOS, isMacOS, isInstallable])

  // Handle the install button click
  const handleInstall = async () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Install button clicked')
    }
    
    // If we have a saved install prompt, use it
    if (installPrompt && typeof installPrompt.prompt === 'function') {
      try {
        // Log before prompting to help with debugging
        if (process.env.NODE_ENV === 'development') {
          console.log('Calling prompt() on saved installPrompt')
        }
        installPrompt.prompt()
        
        if (process.env.NODE_ENV === 'development') {
          console.log('Waiting for user choice...')
        }
        const { outcome } = await installPrompt.userChoice
        if (process.env.NODE_ENV === 'development') {
          console.log(`User ${outcome} the install prompt`)
        }
        
        // Clear the saved prompt since it can only be used once
        setInstallPrompt(null)
        // Also clear the global deferred prompt
        const windowWithPWA = window as WindowWithPWA
        if (windowWithPWA.deferredPrompt) {
          windowWithPWA.deferredPrompt = undefined
        }
        
        // If accepted, dispatch a custom event for analytics or other components
        if (outcome === 'accepted') {
          window.dispatchEvent(new Event('pwaInstalled'))
        }
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error with install prompt:', err)
        }
      }
      
      // Hide the prompt regardless of outcome
      setShowPrompt(false)
    } else if (window && (window as WindowWithPWA).deferredPrompt) {
      // Try using the global deferred prompt
      try {
        const windowWithPWA = window as WindowWithPWA
        const deferredPrompt = windowWithPWA.deferredPrompt
        
        if (deferredPrompt && typeof deferredPrompt.prompt === 'function') {
          if (process.env.NODE_ENV === 'development') {
            console.log('Calling prompt() on global deferredPrompt')
          }
          deferredPrompt.prompt()
          
          if (process.env.NODE_ENV === 'development') {
            console.log('Waiting for user choice from global prompt...')
          }
          const { outcome } = await deferredPrompt.userChoice
          if (process.env.NODE_ENV === 'development') {
            console.log(`User ${outcome} the install prompt (from global)`)
          }
          windowWithPWA.deferredPrompt = undefined
          
          // If accepted, dispatch a custom event for analytics or other components
          if (outcome === 'accepted') {
            window.dispatchEvent(new Event('pwaInstalled'))
          }
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.warn('Global deferredPrompt exists but prompt() is not a function')
          }
          showManualInstructions()
        }
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Error with global install prompt:', err)
        }
        showManualInstructions()
      }
      
      // Hide the prompt regardless of outcome
      setShowPrompt(false)
    } else {
      // Fallback for browsers that don't support the install prompt
      showManualInstructions()
    }
  }
  
  // Helper function to show manual installation instructions
  const showManualInstructions = () => {
    if (process.env.NODE_ENV === 'development') {
      console.log('No install prompt available, showing manual instructions')
    }
    
    // Detect iOS
    // Define a type for window with MSStream property
    interface WindowWithMSStream extends Window {
      MSStream?: unknown;
    }
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as WindowWithMSStream).MSStream
    
    // Detect Chrome on desktop
    const isChrome = /Chrome/.test(navigator.userAgent) && !/Edge|Edg/.test(navigator.userAgent)
    const isDesktop = !(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))
    
    let message = 'To install this app:\n\n'
    
    if (isIOS) {
      message += 'Tap the share button (↑) at the bottom of the screen and select "Add to Home Screen"'
    } else if (isChrome && isDesktop) {
      message += 'Look for the install icon (➕) in the address bar or click the three dots menu and select "Install HeyCoach"'
    } else {
      message += '1. Open this site in Chrome\n' +
                '2. Tap the menu button (⋮) and select "Add to Home Screen"'
    }
    
    alert(message)
    
    // Hide the prompt after showing instructions
    setShowPrompt(false)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    // Only hide temporarily, don't set as permanently dismissed
    // This way the prompt will show again next time
  }

  // Don't show in development mode
  if (!showPrompt || process.env.NODE_ENV === 'development') return null

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="font-medium text-gray-900">Add HeyCoach to Home Screen</h3>
          {isIOS ? (
            <p className="mt-1 text-sm text-gray-600">
              Tap the share icon <span className="inline-block">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L11 6.414V13a1 1 0 11-2 0V6.414L7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3z" />
                  <path d="M5 17a2 2 0 012-2h6a2 2 0 012 2v1a1 1 0 01-1 1H6a1 1 0 01-1-1v-1z" fillRule="evenodd" />
                </svg>
              </span> and then &quot;Add to Home Screen&quot; for quick access.
            </p>
          ) : isMacOS && isChrome ? (
            <p className="mt-1 text-sm text-gray-600">
              Click the install icon <span className="inline-block">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </span> in the address bar or use the menu: Chrome &rarr; More Tools &rarr; Create Shortcut.
            </p>
          ) : (
            <p className="mt-1 text-sm text-gray-600">
              Install HeyCoach for quick access when you need support with cravings or energy.
            </p>
          )}
        </div>
        <button 
          onClick={handleDismiss}
          className="text-gray-400 hover:text-gray-500"
          aria-label="Dismiss"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>
      
      <div className="mt-3 flex gap-3">
        {isInstallable && (
          <button
            onClick={handleInstall}
            className="flex-1 bg-primary text-white py-2 px-4 rounded-md hover:bg-primary/90 text-sm font-medium"
          >
            Install Now
          </button>
        )}
      </div>
    </div>
  )
}
