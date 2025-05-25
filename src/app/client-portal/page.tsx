'use client'

import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import ClientAccessForm from '@/components/client-portal/access-form'
import InstallPrompt from '@/components/client-portal/install-prompt'

export default function ClientPortalPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  // Function to validate and store token
  const validateAndStoreToken = (tokenToValidate: string) => {
    console.log('Validating token:', tokenToValidate.substring(0, 8) + '...');
    
    // Always store the token immediately (we'll validate it too)
    localStorage.setItem('clientToken', tokenToValidate);
    console.log('Token stored in localStorage');
    
    // Validate token
    fetch('/api/client/validate-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: tokenToValidate })
    }).then(async (res) => {
      if (res.ok) {
        console.log('Token validated successfully');
        
        // Get client data
        const data = await res.json();
        if (data.clientId) {
          localStorage.setItem('clientId', data.clientId);
          console.log('Client ID stored:', data.clientId);
        }
        
        // Token is valid, redirect to home WITH the token
        router.push(`/client-portal/home?token=${tokenToValidate}`)
      } else {
        console.log('Token validation failed');
        // Clear invalid tokens
        localStorage.removeItem('clientToken');
      }
    }).catch(error => {
      console.error('Error validating token:', error);
    });
  };
  
  useEffect(() => {
    // For PWA: Check if we have a stored token but no URL token
    const isPWA = typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches;
    const storedToken = localStorage.getItem('clientToken');
    
    console.log('PWA mode:', isPWA ? 'Yes' : 'No');
    console.log('URL token:', token ? 'Present' : 'None');
    console.log('Stored token:', storedToken ? 'Present' : 'None');
    
    // If we have a token in the URL, validate and use it
    if (token) {
      console.log('Using URL token for validation');
      validateAndStoreToken(token);
    } 
    // If we're in PWA mode and have a stored token but no URL token, validate the stored token
    else if (isPWA && storedToken) {
      console.log('In PWA mode with stored token, validating');
      validateAndStoreToken(storedToken);
    }
  }, [token, router]);

  return (
    <div className="min-h-screen bg-gray-50">
      <ClientAccessForm />
      <InstallPrompt />
    </div>
  )
}
