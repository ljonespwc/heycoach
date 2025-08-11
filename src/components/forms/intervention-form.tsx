'use client'

import { useState, useRef, KeyboardEvent } from 'react'
import { toast } from '@/components/ui/use-toast'

interface Intervention {
  id: string
  name: string
  description: string
  category: string
  context_tags: string[]
}

interface InterventionFormProps {
  intervention?: Intervention | null
  isNewIntervention?: boolean
}

export function InterventionForm({ intervention, isNewIntervention = false }: InterventionFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [interventionType, setInterventionType] = useState<'craving' | 'energy'>('craving')
  
  // Initialize context tags
  const [contextTags, setContextTags] = useState<string[]>(
    intervention?.context_tags || []
  )
  const [newContextTag, setNewContextTag] = useState('')
  const formRef = useRef<HTMLFormElement>(null)
  
  // Categories for both intervention types
  const categories = ['Physical', 'Emotional', 'Environmental']
  
  // Common context tags
  const commonContextTags = [
    'universal',
    'home',
    'work',
    'social',
    'stress',
    'evening',
    'morning',
    'weekend',
    'tired',
    'bored'
  ]

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)

    const form = event.currentTarget
    const formData = new FormData(form)
    
    // Add context tags as JSON
    formData.append('context_tags', JSON.stringify(contextTags))
    formData.append('intervention_type', interventionType)

    try {
      const endpoint = isNewIntervention ? '/api/interventions/create' : '/api/interventions/update'
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save intervention')
      }

      toast.success(isNewIntervention ? 'Intervention template created successfully' : 'Intervention updated successfully')
      
      // Redirect back to dashboard
      window.location.href = '/dashboard'
    } catch (error) {
      console.error('Error saving intervention:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save intervention')
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleAddContextTag(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && newContextTag.trim()) {
      e.preventDefault()
      const formattedTag = newContextTag.trim().toLowerCase().replace(/\s+/g, '_')
      if (!contextTags.includes(formattedTag)) {
        setContextTags([...contextTags, formattedTag])
      }
      setNewContextTag('')
    }
  }

  function handleRemoveContextTag(tag: string) {
    setContextTags(contextTags.filter(t => t !== tag))
  }
  
  function handleAddCommonTag(tag: string) {
    if (!contextTags.includes(tag)) {
      setContextTags([...contextTags, tag])
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      {/* Intervention Type - Required for new interventions */}
      {isNewIntervention && (
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Intervention Type <span className="text-red-500">*</span>
          </label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="intervention_type_radio"
                value="craving"
                checked={interventionType === 'craving'}
                onChange={(e) => setInterventionType(e.target.value as 'craving' | 'energy')}
                className="mr-2 text-primary focus:ring-primary"
              />
              <span className="text-sm text-gray-700">Craving Intervention</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="intervention_type_radio"
                value="energy"
                checked={interventionType === 'energy'}
                onChange={(e) => setInterventionType(e.target.value as 'craving' | 'energy')}
                className="mr-2 text-primary focus:ring-primary"
              />
              <span className="text-sm text-gray-700">Energy/Movement Intervention</span>
            </label>
          </div>
        </div>
      )}

      {/* Name - Required */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-900 mb-2">
          Intervention Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="name"
          name="name"
          required
          maxLength={100}
          defaultValue={intervention?.name || ''}
          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="e.g., Deep Breathing Reset, 5-Minute Rule"
        />
      </div>

      {/* Description - Required */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-900 mb-2">
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          id="description"
          name="description"
          required
          rows={4}
          defaultValue={intervention?.description || ''}
          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Detailed description of the intervention. This will be shown to clients during their support sessions."
        ></textarea>
        <p className="mt-1 text-xs text-gray-500">
          Tip: Use clear, actionable language that guides clients through the intervention step-by-step.
        </p>
      </div>

      {/* Category - Required */}
      <div>
        <label htmlFor="category" className="block text-sm font-medium text-gray-900 mb-2">
          Category <span className="text-red-500">*</span>
        </label>
        <select
          id="category"
          name="category"
          required
          defaultValue={intervention?.category || ''}
          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="" disabled>Select category</option>
          {categories.map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">
          Physical: Body-based interventions • Emotional: Mindset/feeling-based • Environmental: Situation/context-based
        </p>
      </div>

      {/* Context Tags */}
      <div>
        <label htmlFor="context_tag_input" className="block text-sm font-medium text-gray-900 mb-2">
          Context Tags
        </label>
        <div className="space-y-2">
          <div className="flex items-center">
            <input
              type="text"
              id="context_tag_input"
              value={newContextTag}
              onChange={(e) => setNewContextTag(e.target.value)}
              onKeyDown={handleAddContextTag}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Type a context tag and press Enter"
            />
          </div>
          
          {/* Common context tags */}
          <div className="flex flex-wrap gap-2">
            {commonContextTags
              .filter(tag => !contextTags.includes(tag))
              .map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleAddCommonTag(tag)}
                  className="px-2 py-1 bg-gray-50 text-gray-700 text-xs rounded-full border border-gray-200 hover:bg-gray-100"
                >
                  + {tag.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </button>
              ))}
          </div>
          
          {/* Selected context tags */}
          {contextTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {contextTags.map((tag) => (
                <span 
                  key={tag} 
                  className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full flex items-center"
                >
                  {tag.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  <button
                    type="button"
                    onClick={() => handleRemoveContextTag(tag)}
                    className="ml-1.5 text-green-700 hover:text-green-900"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Tags help the AI system recommend the most appropriate interventions based on client context and situation.
        </p>
      </div>

      {/* Hidden intervention ID field for updates */}
      {!isNewIntervention && intervention?.id && (
        <input type="hidden" name="id" value={intervention.id} />
      )}

      {/* Submit Button */}
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
          {isSubmitting ? 'Creating...' : isNewIntervention ? 'Create Intervention Template' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}