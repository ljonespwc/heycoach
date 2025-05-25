'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import InstallPrompt from '@/components/client-portal/install-prompt'

export default function ClientDashboard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  
  useEffect(() => {
    // Store token in localStorage if available and validate it
    if (token) {
      localStorage.setItem('clientToken', token)
    } else {
      // If no token in URL but we have one in localStorage, validate it
      const storedToken = localStorage.getItem('clientToken');
      if (storedToken) {
        // Validate the stored token
        fetch('/api/client/validate-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: storedToken })
        }).then(async (res) => {
          if (res.ok) {
            const data = await res.json();
            if (data.clientId) {
              localStorage.setItem('clientId', data.clientId);
              // Update debug info
              setDebugInfo(prev => ({
                ...prev,
                storedToken,
                clientId: data.clientId
              }));
            }
          } else {
            // Clear invalid token
            localStorage.removeItem('clientToken');
            localStorage.removeItem('clientId');
          }
        }).catch(error => {
          console.error('Error validating stored token:', error);
        });
      }
    }
  }, [token])
  
  // State for debugging information
  const [debugInfo, setDebugInfo] = useState({
    urlToken: '',
    storedToken: '',
    clientId: '',
    isPWA: false
  });

  // Function to get the token (either from URL or localStorage)
  const getToken = () => {
    return token || localStorage.getItem('clientToken') || '';
  }
  
  // Update debug info
  useEffect(() => {
    // Check if running as PWA
    const isPWA = typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches;
    
    // Get stored values
    const storedToken = localStorage.getItem('clientToken') || '';
    const clientId = localStorage.getItem('clientId') || '';
    
    setDebugInfo({
      urlToken: token || '',
      storedToken,
      clientId,
      isPWA
    });
  }, [token]);

  return (
    <div className="space-y-8">
      {/* Debug Panel */}
      <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 text-xs">
        <h3 className="font-medium mb-2">Debug Info</h3>
        <div className="space-y-1">
          <p><span className="font-medium">PWA Mode:</span> {debugInfo.isPWA ? 'Yes' : 'No'}</p>
          <p><span className="font-medium">URL Token:</span> {debugInfo.urlToken ? `${debugInfo.urlToken.substring(0, 8)}...` : 'None'}</p>
          <p><span className="font-medium">Stored Token:</span> {debugInfo.storedToken ? `${debugInfo.storedToken.substring(0, 8)}...` : 'None'}</p>
          <p><span className="font-medium">Client ID:</span> {debugInfo.clientId ? `${debugInfo.clientId.substring(0, 8)}...` : 'None'}</p>
          <p><span className="font-medium">Token Used:</span> {getToken() ? `${getToken().substring(0, 8)}...` : 'None'}</p>
        </div>
      </div>
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-black">How can we help?</h1>
        <p className="mt-2 text-sm font-medium text-black">
          Choose an option below to get immediate support
        </p>
      </div>

      <div className="grid gap-4">
        <button
          onClick={() => {
            const currentToken = getToken();
            router.push(`/client-portal/home/craving-sos?token=${currentToken}`);
          }}
          className="p-6 text-left border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors"
        >
          <h2 className="text-lg font-bold text-black">🆘 Craving SOS</h2>
          <p className="mt-2 text-sm font-medium text-black">
            Get immediate support to manage your cravings
          </p>
        </button>

        <button
          onClick={() => {
            const currentToken = getToken();
            router.push(`/client-portal/home/energy-boost?token=${currentToken}`);
          }}
          className="p-6 text-left border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors"
        >
          <h2 className="text-lg font-bold text-black">⚡ Energy Boost</h2>
          <p className="mt-2 text-sm font-medium text-black">
            Need help with low energy? We&apos;ve got you covered
          </p>
        </button>
      </div>

      <div className="flex justify-center space-x-4 pt-4">
        <Link
          href="/client-portal/profile"
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          Profile
        </Link>
        <Link
          href="/client-portal/history"
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          History
        </Link>
      </div>
      
      <InstallPrompt />
    </div>
  )
}
