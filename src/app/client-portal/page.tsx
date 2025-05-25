'use client'

import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import ClientAccessForm from '@/components/client-portal/access-form'
import InstallPrompt from '@/components/client-portal/install-prompt'

export default function ClientPortalPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  useEffect(() => {
    if (token) {
      console.log('Token found in client portal page:', token);
      // Validate token
      fetch('/api/client/validate-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      }).then(async (res) => {
        if (res.ok) {
          console.log('Token validated successfully, storing token and redirecting');
          // Store the token in localStorage
          localStorage.setItem('clientToken', token);
          
          // Get client data
          const data = await res.json();
          if (data.clientId) {
            localStorage.setItem('clientId', data.clientId);
          }
          
          // Token is valid, redirect to home WITH the token
          router.push(`/client-portal/home?token=${token}`)
        } else {
          console.log('Token validation failed');
          // Clear any invalid tokens
          localStorage.removeItem('clientToken');
        }
      }).catch(error => {
        console.error('Error validating token:', error);
      })
    }
  }, [token, router])

  return (
    <div className="min-h-screen bg-gray-50">
      <ClientAccessForm />
      <InstallPrompt />
    </div>
  )
}
