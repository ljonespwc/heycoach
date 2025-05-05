'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'

interface ProfileFormProps {
  coach: {
    full_name: string | null
    coach_settings?: {
      tone_preset: string
      custom_responses: any
    } | null
  } | null
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

      if (!response.ok) {
        throw new Error('Failed to update profile')
      }

      toast.success('Profile updated successfully')
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error('Failed to update profile')
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
          defaultValue={coach?.full_name || ''}
          className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Your full name"
        />
      </div>

      <div>
        <label htmlFor="tone_preset" className="block text-sm font-medium text-gray-900 mb-2">
          Communication Style
        </label>
        <select
          id="tone_preset"
          name="tone_preset"
          defaultValue={coach?.coach_settings?.tone_preset || 'friendly'}
          className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="friendly">Friendly and Supportive</option>
          <option value="professional">Professional and Direct</option>
          <option value="motivational">Motivational and Energetic</option>
        </select>
      </div>

      <div>
        <label htmlFor="custom_responses" className="block text-sm font-medium text-gray-900 mb-2">
          Custom Response Templates
        </label>
        <textarea
          id="custom_responses"
          name="custom_responses"
          rows={4}
          defaultValue={coach?.coach_settings?.custom_responses ? JSON.stringify(coach.coach_settings.custom_responses, null, 2) : ''}
          className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Add custom response templates in JSON format"
        />
        <p className="mt-1 text-sm text-gray-500">
          Add custom responses in JSON format to personalize your coaching communications
        </p>
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
