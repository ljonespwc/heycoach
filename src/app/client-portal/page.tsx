'use client'

import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import ClientAccessForm from '@/components/client-portal/access-form'

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
          console.log('Token validated successfully, redirecting to home with token');
          // Token is valid, redirect to home WITH the token
          router.push(`/client-portal/home?token=${token}`)
        } else {
          console.log('Token validation failed');
        }
      }).catch(error => {
        console.error('Error validating token:', error);
      })
    }
  }, [token, router])

  return (
    <div className="min-h-screen bg-gray-50">
      <ClientAccessForm />
    </div>
  )
}
