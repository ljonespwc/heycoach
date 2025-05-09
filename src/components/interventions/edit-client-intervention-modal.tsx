'use client'

import React, { useState, useEffect, Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { toast } from '@/components/ui/use-toast'
import { StarIcon as StarIconOutline } from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { BaseIntervention } from '@/types/intervention'
import type { SupabaseClient } from '@supabase/supabase-js'

interface ClientIntervention {
  id?: string
  client_id: string
  intervention_id: string
  intervention_type: 'craving' | 'energy'
  times_used: number
  last_used_at: string | null
  effectiveness_rating: number | null
  coach_notes: string | null
  favorite: boolean
  active: boolean
  coach_disabled: boolean
}

interface EditClientInterventionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  intervention: BaseIntervention
  interventionType: 'craving' | 'energy'
  clientId: string
  clientIntervention?: Partial<ClientIntervention>
  onInterventionUpdated: () => void
}

export function EditClientInterventionModal({
  open,
  onOpenChange,
  intervention,
  interventionType,
  clientId,
  clientIntervention,
  onInterventionUpdated
}: EditClientInterventionModalProps) {
  const [loading, setLoading] = useState(false)
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null)
  const [favorite, setFavorite] = useState(clientIntervention?.favorite || false)
  const [effectivenessRating, setEffectivenessRating] = useState<number | null>(
    clientIntervention?.effectiveness_rating || null
  )
  const [coachNotes, setCoachNotes] = useState(clientIntervention?.coach_notes || '')
  const [timesUsed, setTimesUsed] = useState(clientIntervention?.times_used || 0)
  const [active, setActive] = useState(
    clientIntervention?.active !== undefined ? clientIntervention.active : intervention.active
  )

  // Initialize Supabase client only on the client side
  useEffect(() => {
    import('@/lib/supabase/client').then(module => {
      setSupabase(module.createClient())
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    if (!supabase) {
      toast.error('Unable to update intervention at this time. Please try again.')
      return
    }
    
    setLoading(true)
    
    try {
      const response = await fetch(`/api/clients/${clientId}/interventions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          intervention_id: intervention.id,
          intervention_type: interventionType,
          favorite,
          effectiveness_rating: effectivenessRating,
          coach_notes: coachNotes || null,
          times_used: timesUsed,
          active
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update intervention')
      }
      
      toast.success(`${intervention.name} details updated successfully.`)
      onInterventionUpdated()
      onOpenChange(false)
    } catch (error) {
      console.error('Error updating client intervention:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update intervention')
    } finally {
      setLoading(false)
    }
  }
  
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }
  
  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="relative z-10" onClose={() => onOpenChange(false)}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    onClick={() => onOpenChange(false)}
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>
                
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                      Edit Intervention Details
                    </Dialog.Title>
                    
                    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900">{intervention.name}</h3>
                        <button
                          type="button"
                          onClick={() => setFavorite(!favorite)}
                          className="text-gray-400 hover:text-yellow-500 focus:outline-none"
                        >
                          {favorite ? (
                            <StarIconSolid className="h-6 w-6 text-yellow-500" />
                          ) : (
                            <StarIconOutline className="h-6 w-6" />
                          )}
                        </button>
                      </div>
                      
                      <div className="space-y-1">
                        <label htmlFor="effectiveness" className="block text-sm font-medium text-gray-700">
                          Effectiveness Rating (1-10)
                        </label>
                        <input
                          id="effectiveness"
                          type="number"
                          min="1"
                          max="10"
                          value={effectivenessRating || ''}
                          onChange={(e) => setEffectivenessRating(e.target.value ? parseInt(e.target.value, 10) : null)}
                          placeholder="Rate from 1-10"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <label htmlFor="coach-notes" className="block text-sm font-medium text-gray-700">
                          Coach Notes
                        </label>
                        <textarea
                          id="coach-notes"
                          value={coachNotes || ''}
                          onChange={(e) => setCoachNotes(e.target.value)}
                          placeholder="Add notes about this intervention for this client"
                          rows={3}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <label htmlFor="times-used" className="block text-sm font-medium text-gray-700">
                          Times Used
                        </label>
                        <input
                          id="times-used"
                          type="number"
                          min="0"
                          value={timesUsed}
                          onChange={(e) => setTimesUsed(parseInt(e.target.value, 10) || 0)}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                        />
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <input
                          id="active-toggle"
                          type="checkbox"
                          checked={active}
                          onChange={() => setActive(!active)}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <label htmlFor="active-toggle" className="text-sm font-medium text-gray-700">
                          Active for this client
                        </label>
                      </div>
                      
                      {clientIntervention?.last_used_at && (
                        <div className="text-sm text-gray-500">
                          Last used: {formatDate(clientIntervention.last_used_at)}
                        </div>
                      )}
                      
                      <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                        <button
                          type="submit"
                          disabled={loading}
                          className="inline-flex w-full justify-center rounded-md border border-transparent bg-primary px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                        >
                          {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenChange(false)}
                          className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  )
}
