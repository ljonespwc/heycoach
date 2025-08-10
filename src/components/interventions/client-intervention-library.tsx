'use client'

import { useState, useEffect } from 'react'
import { toast } from '@/components/ui/use-toast'
import { BaseIntervention, CravingIntervention, EnergyIntervention } from '@/types/intervention'
import type { SupabaseClient } from '@supabase/supabase-js'
import { StarIcon as StarIconOutline } from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import { PencilSquareIcon } from '@heroicons/react/24/outline'
import { EditClientInterventionModal } from './edit-client-intervention-modal'
import { MarkdownRenderer } from '@/components/ui/markdown-renderer'

// Helper function to get category color
function getCategoryColor(category: string | null) {
  if (!category) return "bg-gray-100 text-gray-700";
  
  switch(category.toLowerCase()) {
    case 'physical':
      return "bg-blue-100 text-blue-700";
    case 'emotional':
      return "bg-amber-100 text-amber-700";
    case 'environmental':
      return "bg-emerald-100 text-emerald-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

// Tabs component
interface InterventionTabsProps {
  activeTab: 'craving' | 'energy'
  onChange: (tab: 'craving' | 'energy') => void
  cravingCount: number
  energyCount: number
}

function InterventionTabs({ 
  activeTab, 
  onChange,
  cravingCount,
  energyCount
}: InterventionTabsProps) {
  return (
    <div className="border-b border-border">
      <div className="flex space-x-8">
        <button
          onClick={() => onChange('craving')}
          className={`py-2 px-1 border-b-2 font-medium text-sm ${
            activeTab === 'craving'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Craving Interventions
          <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
            {cravingCount}
          </span>
        </button>
        
        <button
          onClick={() => onChange('energy')}
          className={`py-2 px-1 border-b-2 font-medium text-sm ${
            activeTab === 'energy'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Energy Interventions
          <span className="ml-2 bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">
            {energyCount}
          </span>
        </button>
      </div>
    </div>
  )
}

// Client intervention type definition
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

// List component
interface InterventionListProps {
  interventions: BaseIntervention[]
  type: 'craving' | 'energy'
  clientId: string
}

// Interface for usage statistics
interface InterventionUsageStats {
  suggested: number // times_used from client_interventions
  used: number // count from incidents where intervention was completed
}

function InterventionList({ interventions, type, clientId }: InterventionListProps) {
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set())
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null)
  const [clientInterventions, setClientInterventions] = useState<Record<string, Partial<ClientIntervention>>>({})
  const [usageStats, setUsageStats] = useState<Record<string, InterventionUsageStats>>({})
  const [editingIntervention, setEditingIntervention] = useState<BaseIntervention | null>(null)
  
  // Fetch client-specific intervention settings
  const fetchClientInterventions = async (client: SupabaseClient) => {
    try {
      const { data, error } = await client
        .from('client_interventions')
        .select('*')
        .eq('client_id', clientId)
        .eq('intervention_type', type)
      
      if (error) throw error
      
      // Create a map of intervention_id to intervention data
      const interventionMap: Record<string, Partial<ClientIntervention>> = {}
      data.forEach((item: ClientIntervention) => {
        interventionMap[item.intervention_id] = item
      })
      
      setClientInterventions(interventionMap)
    } catch (error) {
      console.error('Error fetching client interventions:', error)
    }
  }

  // Fetch usage statistics (suggested vs used)
  const fetchUsageStats = async (client: SupabaseClient) => {
    try {
      // Get intervention IDs for current type
      const interventionIds = interventions.map(i => i.id)
      if (interventionIds.length === 0) return

      // Fetch suggested counts from client_interventions
      const { data: clientData, error: clientError } = await client
        .from('client_interventions')
        .select('intervention_id, times_used')
        .eq('client_id', clientId)
        .eq('intervention_type', type)
        .in('intervention_id', interventionIds)

      if (clientError) throw clientError

      // Fetch used counts from incidents
      const incidentTable = type === 'craving' ? 'craving_incidents' : 'movement_incidents'
      const { data: incidentData, error: incidentError } = await client
        .from(incidentTable)
        .select('intervention_id')
        .eq('client_id', clientId)
        .not('intervention_id', 'is', null)
        .not('resolved_at', 'is', null) // Only count completed incidents
        .in('intervention_id', interventionIds)

      if (incidentError) throw incidentError

      // Build usage statistics
      const stats: Record<string, InterventionUsageStats> = {}
      
      // Initialize with suggested counts
      clientData?.forEach(item => {
        stats[item.intervention_id] = {
          suggested: item.times_used || 0,
          used: 0
        }
      })

      // Count actual usage from incidents
      incidentData?.forEach(incident => {
        if (incident.intervention_id && stats[incident.intervention_id]) {
          stats[incident.intervention_id].used++
        } else if (incident.intervention_id) {
          // Handle case where intervention was used but not in client_interventions
          stats[incident.intervention_id] = {
            suggested: 0,
            used: 1
          }
        }
      })

      setUsageStats(stats)
    } catch (error) {
      console.error('Error fetching usage statistics:', error)
    }
  }
  
  // Initialize Supabase client only on the client side
  useEffect(() => {
    import('@/lib/supabase/client').then(module => {
      const client = module.createClient()
      setSupabase(client)
      
      // Fetch client-specific intervention settings
      fetchClientInterventions(client)
      
      // Fetch usage statistics
      fetchUsageStats(client)
      
      // Initialize client interventions if needed
      initializeClientInterventions()
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, type, interventions.length]) // Re-fetch when interventions change
  
  // Initialize client interventions for this client
  const initializeClientInterventions = async () => {
    try {
      const response = await fetch(`/api/clients/${clientId}/interventions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('Error initializing client interventions:', errorData)
      } else {
        // Refresh the client interventions after initialization
        if (supabase) {
          fetchClientInterventions(supabase)
          fetchUsageStats(supabase)
        }
      }
    } catch (error) {
      console.error('Error initializing client interventions:', error)
    }
  }
  
  // Toggle the active status of an intervention for this client
  const toggleActive = async (intervention: BaseIntervention) => {
    if (!supabase) {
      toast.error('Unable to update intervention at this time. Please try again.')
      return
    }
    
    // Determine if this intervention is already in the client_interventions table
    const isInClientTable = intervention.id in clientInterventions
    const newStatus = isInClientTable ? !getActiveStatus(intervention) : !intervention.active
    
    setUpdatingIds(prev => new Set(prev).add(intervention.id))
    
    try {
      const response = await fetch(`/api/clients/${clientId}/interventions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          intervention_id: intervention.id,
          intervention_type: type,
          active: newStatus
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update intervention')
      }
      
      await response.json() // Read the response body
      
      // Update local state
      setClientInterventions(prev => ({
        ...prev,
        [intervention.id]: {
          ...prev[intervention.id],
          active: newStatus
        }
      }))
      
      toast.success(`${intervention.name} is now ${newStatus ? 'active' : 'inactive'} for this client.`)
    } catch (error) {
      console.error('Error updating client intervention:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update intervention')
    } finally {
      setUpdatingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(intervention.id)
        return newSet
      })
    }
  }
  
  // Toggle favorite status
  const toggleFavorite = async (intervention: BaseIntervention) => {
    if (!supabase) {
      toast.error('Unable to update intervention at this time. Please try again.')
      return
    }
    
    const isInClientTable = intervention.id in clientInterventions
    const newFavoriteStatus = isInClientTable && clientInterventions[intervention.id].favorite ? false : true
    
    setUpdatingIds(prev => new Set(prev).add(intervention.id))
    
    try {
      const response = await fetch(`/api/clients/${clientId}/interventions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          intervention_id: intervention.id,
          intervention_type: type,
          favorite: newFavoriteStatus
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update intervention')
      }
      
      await response.json() // Read the response body
      
      // Update local state
      setClientInterventions(prev => ({
        ...prev,
        [intervention.id]: {
          ...prev[intervention.id],
          favorite: newFavoriteStatus
        }
      }))
      
      toast.success(`${intervention.name} is now ${newFavoriteStatus ? 'favorited' : 'unfavorited'}.`)
    } catch (error) {
      console.error('Error updating client intervention:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update intervention')
    } finally {
      setUpdatingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(intervention.id)
        return newSet
      })
    }
  }
  
  // Get the active status for an intervention
  const getActiveStatus = (intervention: BaseIntervention): boolean => {
    // If the intervention is in the client_interventions table, use that status
    if (intervention.id in clientInterventions) {
      return clientInterventions[intervention.id].active !== undefined ? 
        clientInterventions[intervention.id].active as boolean : 
        intervention.active
    }
    // Otherwise, use the global intervention status
    return intervention.active
  }
  
  // Get the favorite status for an intervention
  const getFavoriteStatus = (intervention: BaseIntervention): boolean => {
    // If the intervention is in the client_interventions table, use that status
    if (intervention.id in clientInterventions) {
      return clientInterventions[intervention.id].favorite || false
    }
    // Otherwise, default to false
    return false
  }
  
  // Get the effectiveness rating for an intervention
  const getEffectivenessRating = (intervention: BaseIntervention): number | null => {
    // If the intervention is in the client_interventions table, use that rating
    if (intervention.id in clientInterventions) {
      return clientInterventions[intervention.id].effectiveness_rating || null
    }
    // Otherwise, default to null
    return null
  }
  
  // Handle intervention update
  const handleInterventionUpdated = () => {
    if (supabase) {
      fetchClientInterventions(supabase)
      fetchUsageStats(supabase)
    }
  }
  
  if (interventions.length === 0) {
    return (
      <div className="p-8 text-center bg-card rounded-lg border border-border">
        <p className="text-gray-500">No interventions found with the selected filters.</p>
      </div>
    )
  }
  
  return (
    <>
      <div className="space-y-4">
        {interventions.map(intervention => (
        <div 
          key={intervention.id} 
          className="p-4 bg-card rounded-lg border border-border"
        >
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-gray-900">{intervention.name}</h3>
                {/* Favorite button */}
                <button
                  type="button"
                  onClick={() => toggleFavorite(intervention)}
                  disabled={updatingIds.has(intervention.id)}
                  className="text-gray-400 hover:text-yellow-500 focus:outline-none"
                >
                  {getFavoriteStatus(intervention) ? (
                    <StarIconSolid className="h-5 w-5 text-yellow-500" />
                  ) : (
                    <StarIconOutline className="h-5 w-5" />
                  )}
                </button>
              </div>
              
              {/* Category and tags */}
              <div className="flex flex-wrap gap-2 mt-1">
                {intervention.category && (
                  <span className={`${getCategoryColor(intervention.category)} px-2 py-0.5 rounded-md text-xs`}>
                    {intervention.category}
                  </span>
                )}
                
                {intervention.context_tags && intervention.context_tags.map(tag => (
                  <span 
                    key={tag} 
                    className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            
            {/* Active toggle */}
            <div className="flex items-center">
              <button
                onClick={() => toggleActive(intervention)}
                disabled={updatingIds.has(intervention.id)}
                className={`
                  relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2
                  ${getActiveStatus(intervention) ? 'bg-green-500' : 'bg-gray-200'}
                  ${updatingIds.has(intervention.id) ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <span
                  className={`
                    inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                    ${getActiveStatus(intervention) ? 'translate-x-6' : 'translate-x-1'}
                  `}
                />
              </button>
              <span className="ml-2 text-sm text-gray-500">
                {getActiveStatus(intervention) ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
          
          {/* Full description */}
          <div className="mt-3 text-sm text-gray-600">
            <MarkdownRenderer content={intervention.description} variant="default" />
          </div>
          
          {/* Effectiveness rating if available */}
          {getEffectivenessRating(intervention) && (
            <div className="mt-3 flex items-center">
              <span className="text-sm text-gray-500 mr-2">Effectiveness:</span>
              <span className="text-sm font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md">
                {getEffectivenessRating(intervention)}/10
              </span>
            </div>
          )}
          
          {/* Usage statistics */}
          <div className="mt-2 flex flex-wrap gap-2">
            {/* Suggested times */}
            {usageStats[intervention.id] && usageStats[intervention.id].suggested > 0 && (
              <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full">
                Suggested {usageStats[intervention.id].suggested} times
              </span>
            )}
            
            {/* Used times (from completed incidents) */}
            {usageStats[intervention.id] && usageStats[intervention.id].used > 0 && (
              <span className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded-full">
                Used {usageStats[intervention.id].used} times
              </span>
            )}
            
            {/* Last suggested date if available */}
            {intervention.id in clientInterventions && 
             typeof clientInterventions[intervention.id] === 'object' &&
             clientInterventions[intervention.id] !== null &&
             clientInterventions[intervention.id].last_used_at && (
              <span className="text-xs px-2 py-1 bg-gray-50 text-gray-700 rounded-full">
                Last suggested: {
                  new Date(clientInterventions[intervention.id].last_used_at as string).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })
                }
              </span>
            )}
          </div>
          
          {/* Coach notes if available */}
          {intervention.id in clientInterventions && 
           typeof clientInterventions[intervention.id] === 'object' &&
           clientInterventions[intervention.id] !== null &&
           'coach_notes' in clientInterventions[intervention.id] &&
           clientInterventions[intervention.id].coach_notes && (
            <div className="mt-3 p-2 bg-gray-50 rounded-md border border-gray-100">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Notes:</span> {clientInterventions[intervention.id].coach_notes}
              </p>
            </div>
          )}
          
          {/* Edit button */}
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              onClick={() => setEditingIntervention(intervention)}
            >
              <PencilSquareIcon className="h-4 w-4 mr-1" />
              Edit Details
            </button>
          </div>
        </div>
        ))}
      </div>
      
      {/* Edit intervention modal */}
      {editingIntervention && (
        <EditClientInterventionModal
          open={!!editingIntervention}
          onOpenChange={(open) => {
            if (!open) setEditingIntervention(null)
          }}
          intervention={editingIntervention}
          interventionType={type}
          clientId={clientId}
          clientIntervention={editingIntervention.id in clientInterventions ? clientInterventions[editingIntervention.id] : {}}
          onInterventionUpdated={handleInterventionUpdated}
        />
      )}
    </>
  )
}

// Main component
interface ClientInterventionLibraryProps {
  clientId: string
  cravingInterventions: CravingIntervention[]
  energyInterventions: EnergyIntervention[]
}

export function ClientInterventionLibrary({ 
  clientId,
  cravingInterventions, 
  energyInterventions 
}: ClientInterventionLibraryProps) {
  const [activeTab, setActiveTab] = useState<'craving' | 'energy'>('craving')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  
  // Get unique categories from the current tab's interventions
  const interventions = activeTab === 'craving' ? cravingInterventions : energyInterventions
  const categories = Array.from(new Set(
    interventions
      .map(i => i.category)
      .filter(Boolean) as string[]
  )).sort()
  
  // Filter interventions based on active filters
  const filteredInterventions = interventions.filter(intervention => {
    // Filter by category if one is selected
    if (activeCategory && intervention.category !== activeCategory) {
      return false
    }
    
    return true
  })
  
  // Sort interventions alphabetically by name
  const sortedInterventions = [...filteredInterventions].sort((a, b) => 
    a.name.localeCompare(b.name)
  )
  
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Client Interventions</h2>
      
      {/* Tabs for switching between intervention types */}
      <InterventionTabs 
        activeTab={activeTab} 
        onChange={setActiveTab}
        cravingCount={cravingInterventions.length}
        energyCount={energyInterventions.length}
      />
      
      <div className="flex flex-col md:flex-row gap-6">
        {/* Filters sidebar */}
        <div className="w-full md:w-64 space-y-6">
          <div className="p-4 bg-card rounded-lg border border-border space-y-4">
            <h3 className="font-medium text-sm text-gray-900">Filters</h3>
            
            {/* Category filter */}
            <div>
              <h4 className="text-sm text-gray-500 mb-2">Category</h4>
              <div className="space-y-2">
                <div className="flex items-center">
                  <button
                    onClick={() => setActiveCategory(null)}
                    className={`text-sm px-2 py-1 rounded-md w-full text-left ${
                      activeCategory === null 
                        ? 'bg-primary/10 text-primary' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    All Categories
                  </button>
                </div>
                
                {categories.map(category => (
                  <div key={category} className="flex items-center">
                    <button
                      onClick={() => setActiveCategory(category)}
                      className={`text-sm px-2 py-1 rounded-md w-full text-left ${
                        activeCategory === category 
                          ? 'bg-primary/10 text-primary' 
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {category}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* Intervention list */}
        <div className="flex-1">
          <InterventionList 
            interventions={sortedInterventions}
            type={activeTab}
            clientId={clientId}
          />
        </div>
      </div>
    </div>
  )
}
