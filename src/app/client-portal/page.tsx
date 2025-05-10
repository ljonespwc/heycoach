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
      // Validate token
      fetch('/api/client/validate-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      }).then(async (res) => {
        if (res.ok) {
          // Token is valid, redirect to home
          router.push('/client-portal/home')
        }
      })
    }
  }, [token, router])

  return (
    <div className="min-h-screen bg-gray-50">
      <ClientAccessForm />
    </div>
  )
}
