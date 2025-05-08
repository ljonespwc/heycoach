'use client'

import { useState, useRef, KeyboardEvent } from 'react'
import { toast } from '@/components/ui/use-toast'
import { Client, TriggerFood } from '@/types/client'
import { formatISO } from 'date-fns'

interface ClientFormProps {
  client?: Client | null
  isNewClient?: boolean
}

export function ClientForm({ client, isNewClient = false }: ClientFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [triggerFoods, setTriggerFoods] = useState<TriggerFood[]>(client?.trigger_foods || [])
  const [newTriggerFood, setNewTriggerFood] = useState('')
  const [habitObjectives, setHabitObjectives] = useState<string[]>(
    client?.habit_objectives ? Object.keys(client.habit_objectives) : []
  )
  const [newHabitObjective, setNewHabitObjective] = useState('')
  const [isActive, setIsActive] = useState(client?.status !== 'inactive')
  const formRef = useRef<HTMLFormElement>(null)
  
  // Predefined list of common habit objectives
  const commonHabitObjectives = [
    'reduce_sugar',
    'increase_vegetables',
    'daily_exercise',
    'reduce_alcohol',
    'meal_planning',
    'improve_sleep',
    'drink_water',
    'mindful_eating'
  ]

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)

    const form = event.currentTarget
    const formData = new FormData(form)
    
    // Add trigger foods to form data
    formData.append('trigger_foods', JSON.stringify(triggerFoods))

    // Add habit objectives as JSON
    const habitObjectivesObj: Record<string, boolean> = {}
    habitObjectives.forEach((habit) => {
      habitObjectivesObj[habit] = true
    })
    formData.append('habit_objectives', JSON.stringify(habitObjectivesObj))

    try {
      const endpoint = isNewClient ? '/api/clients/create' : '/api/clients/update'
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save client')
      }

      toast.success(isNewClient ? 'Client created successfully' : 'Client updated successfully')
      
      // Redirect to client list or detail page
      if (isNewClient && data.id) {
        window.location.href = `/clients/${data.id}`
      } else if (!isNewClient) {
        window.location.href = `/clients/${client?.id}`
      } else {
        window.location.href = '/clients'
      }
    } catch (error) {
      console.error('Error saving client:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save client')
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleAddTriggerFood(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && newTriggerFood.trim()) {
      e.preventDefault()
      // Check if this food name already exists in the array
      if (!triggerFoods.some(item => item.food_name === newTriggerFood.trim())) {
        // For new trigger foods, we don't have an ID yet, so use a temporary one
        setTriggerFoods([...triggerFoods, { 
          id: `temp-${Date.now()}`, 
          food_name: newTriggerFood.trim() 
        }])
      }
      setNewTriggerFood('')
    }
  }

  function handleRemoveTriggerFood(foodId: string) {
    setTriggerFoods(triggerFoods.filter(f => f.id !== foodId))
  }
  
  function handleAddHabitObjective(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && newHabitObjective.trim()) {
      e.preventDefault()
      const formattedHabit = newHabitObjective.trim().toLowerCase().replace(/\s+/g, '_')
      if (!habitObjectives.includes(formattedHabit)) {
        setHabitObjectives([...habitObjectives, formattedHabit])
      }
      setNewHabitObjective('')
    }
  }

  function handleRemoveHabitObjective(habit: string) {
    setHabitObjectives(habitObjectives.filter(h => h !== habit))
  }
  
  function handleAddCommonHabit(habit: string) {
    if (!habitObjectives.includes(habit)) {
      setHabitObjectives([...habitObjectives, habit])
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      {/* Full Name - Required */}
      <div>
        <label htmlFor="full_name" className="block text-sm font-medium text-gray-900 mb-2">
          Full Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="full_name"
          name="full_name"
          required
          maxLength={100}
          defaultValue={client?.full_name || ''}
          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Client's full name"
        />
      </div>

      {/* Email Address */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-2">
          Email Address
        </label>
        <input
          type="email"
          id="email"
          name="email"
          maxLength={100}
          defaultValue={client?.email || ''}
          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="client@example.com"
        />
      </div>

      {/* Birth Date - Required */}
      <div>
        <label htmlFor="birth_date" className="block text-sm font-medium text-gray-900 mb-2">
          Birth Date <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          id="birth_date"
          name="birth_date"
          required
          defaultValue={client?.birth_date || ''}
          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Gender - Required */}
      <div>
        <label htmlFor="gender" className="block text-sm font-medium text-gray-900 mb-2">
          Gender <span className="text-red-500">*</span>
        </label>
        <select
          id="gender"
          name="gender"
          required
          defaultValue={client?.gender || ''}
          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="" disabled>Select gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="non-binary">Non-binary</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* Weight Information - Two columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="current_weight" className="block text-sm font-medium text-gray-900 mb-2">
            Current Weight
          </label>
          <input
            type="number"
            id="current_weight"
            name="current_weight"
            step="0.1"
            min="0"
            defaultValue={client?.current_weight || ''}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Current weight in kg/lb"
          />
        </div>
        <div>
          <label htmlFor="desired_weight" className="block text-sm font-medium text-gray-900 mb-2">
            Desired Weight
          </label>
          <input
            type="number"
            id="desired_weight"
            name="desired_weight"
            step="0.1"
            min="0"
            defaultValue={client?.desired_weight || ''}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Target weight in kg/lb"
          />
        </div>
      </div>

      {/* Engagement Start Date */}
      <div>
        <label htmlFor="engagement_start_date" className="block text-sm font-medium text-gray-900 mb-2">
          Engagement Start Date
        </label>
        <input
          type="date"
          id="engagement_start_date"
          name="engagement_start_date"
          defaultValue={client?.engagement_start_date || formatISO(new Date(), { representation: 'date' })}
          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Status */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          Status
        </label>
        <div className="flex items-center space-x-2">
          <input 
            type="hidden" 
            id="status" 
            name="status" 
            value={isActive ? 'active' : 'inactive'} 
          />
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              setIsActive(!isActive)
            }}
            className={`
              relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2
              ${isActive ? 'bg-green-500' : 'bg-gray-200'}
            `}
          >
            <span
              className={`
                inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                ${isActive ? 'translate-x-6' : 'translate-x-1'}
              `}
            />
          </button>
          <span className="text-sm text-gray-700">
            {isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* Habit Objectives */}
      <div>
        <label htmlFor="habit_objective_input" className="block text-sm font-medium text-gray-900 mb-2">
          Habit Objectives
        </label>
        <div className="space-y-2">
          <div className="flex items-center">
            <input
              type="text"
              id="habit_objective_input"
              value={newHabitObjective}
              onChange={(e) => setNewHabitObjective(e.target.value)}
              onKeyDown={handleAddHabitObjective}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Type a habit objective and press Enter"
            />
          </div>
          
          {/* Common habit objectives */}
          <div className="flex flex-wrap gap-2">
            {commonHabitObjectives
              .filter(habit => !habitObjectives.includes(habit))
              .map(habit => (
                <button
                  key={habit}
                  type="button"
                  onClick={() => handleAddCommonHabit(habit)}
                  className="px-2 py-1 bg-gray-50 text-gray-700 text-xs rounded-full border border-gray-200 hover:bg-gray-100"
                >
                  + {habit.replace(/_/g, ' ')}
                </button>
              ))}
          </div>
          
          {/* Selected habit objectives */}
          {habitObjectives.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {habitObjectives.map((habit) => (
                <span 
                  key={habit} 
                  className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full flex items-center"
                >
                  {habit.replace(/_/g, ' ')}
                  <button
                    type="button"
                    onClick={() => handleRemoveHabitObjective(habit)}
                    className="ml-1.5 text-blue-700 hover:text-blue-900"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Trigger Foods */}
      <div>
        <label htmlFor="trigger_food_input" className="block text-sm font-medium text-gray-900 mb-2">
          Trigger Foods
        </label>
        <div className="space-y-2">
          <div className="flex items-center">
            <input
              type="text"
              id="trigger_food_input"
              value={newTriggerFood}
              onChange={(e) => setNewTriggerFood(e.target.value)}
              onKeyDown={handleAddTriggerFood}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Type a trigger food and press Enter"
            />
          </div>
          {triggerFoods.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {triggerFoods.map((food) => (
                <span 
                  key={food.id} 
                  className="px-2 py-1 bg-amber-50 text-amber-700 text-xs rounded-full flex items-center"
                >
                  {food.food_name}
                  <button
                    type="button"
                    onClick={() => handleRemoveTriggerFood(food.id)}
                    className="ml-1.5 text-amber-700 hover:text-amber-900"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-900 mb-2">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={4}
          defaultValue={client?.notes || ''}
          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Additional notes about the client"
        ></textarea>
      </div>

      {/* Hidden client ID field for updates */}
      {!isNewClient && client?.id && (
        <input type="hidden" name="id" value={client.id} />
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
          {isSubmitting ? 'Saving...' : isNewClient ? 'Create Client' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}
