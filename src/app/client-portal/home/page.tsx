'use client'

import React, { useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import InstallPrompt from '@/components/client-portal/install-prompt'

export default function ClientDashboard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  
  useEffect(() => {
    // Store token in localStorage if available in URL
    if (token) {
      localStorage.setItem('clientToken', token);
    }
  }, [token])

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">How can we help?</h1>
        <p className="mt-2 text-sm text-gray-600">
          Choose an option below to get immediate support
        </p>
      </div>

      <div className="grid gap-4">
        <button
          onClick={() => {
            console.log('Navigating to craving-sos with token:', token);
            router.push(token ? `/client-portal/home/craving-sos?token=${token}` : '/client-portal/home/craving-sos');
          }}
          className="p-6 text-left border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors"
        >
          <h2 className="text-lg font-medium">🆘 Craving SOS</h2>
          <p className="mt-2 text-sm text-gray-600">
            Get immediate support to manage your cravings
          </p>
        </button>

        <button
          onClick={() => {
            console.log('Navigating to energy-boost with token:', token);
            router.push(token ? `/client-portal/home/energy-boost?token=${token}` : '/client-portal/home/energy-boost');
          }}
          className="p-6 text-left border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors"
        >
          <h2 className="text-lg font-medium">⚡ Energy Boost</h2>
          <p className="mt-2 text-sm text-gray-600">
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
