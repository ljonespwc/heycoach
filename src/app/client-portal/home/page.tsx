'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import InstallPrompt from '@/components/client-portal/install-prompt'

export default function ClientDashboard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  // Get token from URL or localStorage for navigation
  const getToken = () => {
    return token || localStorage.getItem('clientToken') || ''
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-black">How can we help?</h1>
        <p className="mt-2 text-sm font-medium text-black">
          Get immediate support when you need it most
        </p>
      </div>

      <div className="flex justify-center">
        <button
          onClick={() => {
            const currentToken = getToken();
            if (currentToken) {
              router.push(`/client-portal/home/support?token=${currentToken}`);
            } else {
              router.push('/client-portal/home/support');
            }
          }}
          className="w-full max-w-md p-8 text-center border border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors shadow-sm"
        >
          <div className="text-4xl mb-4">💪</div>
          <h2 className="text-xl font-bold text-black mb-2">Get Support</h2>
          <p className="text-sm font-medium text-black">
            Whether you&apos;re dealing with cravings or need an energy boost, we&apos;re here to help
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
