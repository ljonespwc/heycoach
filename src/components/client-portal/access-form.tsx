'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ClientAccessForm() {
  const [coachUrl, setCoachUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  // Detect if we're in PWA mode
  const [isPWA, setIsPWA] = useState(false)
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsPWA(window.matchMedia('(display-mode: standalone)').matches)
    }
  }, [])

  // Function to extract token from URL
  const extractTokenFromUrl = (url: string): string | null => {
    try {
      const urlObj = new URL(url)
      return urlObj.searchParams.get('token')
    } catch {
      // If URL parsing fails, try to extract token with regex
      const tokenMatch = url.match(/[?&]token=([a-fA-F0-9]{64})/)
      return tokenMatch ? tokenMatch[1] : null
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      // Extract token from the provided URL
      const extractedToken = extractTokenFromUrl(coachUrl)
      
      if (!extractedToken) {
        throw new Error('No valid token found in the URL. Please make sure you copied the complete link from your coach.')
      }

      // Validate the extracted token
      const response = await fetch('/api/client/validate-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: extractedToken }),
      })

      if (!response.ok) {
        throw new Error('Invalid access link. Please check the link from your coach.')
      }

      // Redirect to the token URL flow
      router.push(`/client-portal?token=${extractedToken}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid access link. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Welcome to HeyCoach
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {isPWA 
              ? "Please paste the link your coach sent you"
              : "Please paste the link your coach sent you to continue"
            }
          </p>
          {isPWA && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                📱 <strong>PWA Mode:</strong> You&apos;ll need to enter the link each time you install the app. 
                Your coach can send you the link again if needed.
              </p>
            </div>
          )}
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="coach-url" className="sr-only">
                Coach Link
              </label>
              <input
                id="coach-url"
                name="url"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md rounded-b-md focus:outline-none focus:ring-purple-500 focus:border-purple-500 focus:z-10 sm:text-sm"
                placeholder="Paste the link from your coach here..."
                value={coachUrl}
                onChange={(e) => setCoachUrl(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">{error}</div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
            >
              {isLoading ? 'Connecting...' : 'Continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
