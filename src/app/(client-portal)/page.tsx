'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ClientAccessPage() {
  const [accessToken, setAccessToken] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/client/validate-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: accessToken }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Invalid access token')
      }

      // Redirect to dashboard on success
      router.push('/client-portal/home')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh]">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">Welcome to HeyCoach</h1>
          <p className="mt-2 text-sm text-gray-600">
            Enter your access token to continue
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-2">
            <input
              type="text"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="Enter your access token"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
              required
            />
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-4 py-2 text-white bg-primary hover:bg-primary/90 rounded-md disabled:opacity-50"
          >
            {isLoading ? 'Validating...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  )
}
