'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'

import { Coach } from '@/types/coach'

interface ProfileFormProps {
  coach: Coach | null
}

export function ProfileForm({ coach }: ProfileFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)

    const form = event.currentTarget
    const formData = new FormData(form)

    try {
      const response = await fetch('/api/profile/update', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile')
      }

      toast.success('Profile updated successfully')
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update profile')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="full_name" className="block text-sm font-medium text-gray-900 mb-2">
          Full Name
        </label>
        <input
          type="text"
          id="full_name"
          name="full_name"
          required
          maxLength={100}
          defaultValue={coach?.full_name || ''}
          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Your full name (required)"
        />
      </div>

      <div>
        <label htmlFor="tone_preset" className="block text-sm font-medium text-gray-900 mb-2">
          Communication Style
        </label>
        <select
          id="tone_preset"
          name="tone_preset"
          required
          defaultValue={coach?.coach_settings?.tone_preset || 'friendly'}
          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="friendly">Friendly and Supportive</option>
          <option value="professional">Professional and Direct</option>
          <option value="motivational">Motivational and Energetic</option>
        </select>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className={`
            px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors
            ${isSubmitting 
              ? 'bg-primary/50 cursor-not-allowed'
              : 'bg-primary hover:bg-primary/90'
            }
          `}
        >
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}
