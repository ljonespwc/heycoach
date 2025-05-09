'use client'

import { useState, useEffect } from 'react'
import { toast } from '@/components/ui/use-toast'
import { BaseIntervention, CravingIntervention, EnergyIntervention } from '@/types/intervention'
import type { SupabaseClient } from '@supabase/supabase-js'

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

// List component
interface InterventionListProps {
  interventions: BaseIntervention[]
  type: 'craving' | 'energy'
  clientId: string
}

function InterventionList({ interventions, type, clientId }: InterventionListProps) {
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set())
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null)
  const [clientInterventions, setClientInterventions] = useState<Record<string, boolean>>({})
  
  // Initialize Supabase client only on the client side
  useEffect(() => {
    import('@/lib/supabase/client').then(module => {
      const client = module.createClient()
      setSupabase(client)
      
      // Fetch client-specific intervention settings
      fetchClientInterventions(client)
    })
  }, [clientId, type])
  
  // Fetch client-specific intervention settings
  const fetchClientInterventions = async (client: SupabaseClient) => {
    try {
      const { data, error } = await client
        .from('client_interventions')
        .select('intervention_id, active')
        .eq('client_id', clientId)
        .eq('intervention_type', type)
      
      if (error) throw error
      
      // Create a map of intervention_id to active status
      const interventionMap: Record<string, boolean> = {}
      data.forEach(item => {
        interventionMap[item.intervention_id] = item.active
      })
      
      setClientInterventions(interventionMap)
    } catch (error) {
      console.error('Error fetching client interventions:', error)
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
    const newStatus = isInClientTable ? !clientInterventions[intervention.id] : !intervention.active
    
    setUpdatingIds(prev => new Set(prev).add(intervention.id))
    
    try {
      if (isInClientTable) {
        // Update existing record
        const { error } = await supabase
          .from('client_interventions')
          .update({ active: newStatus })
          .eq('client_id', clientId)
          .eq('intervention_id', intervention.id)
          .eq('intervention_type', type)
        
        if (error) throw error
      } else {
        // Create new record
        const { error } = await supabase
          .from('client_interventions')
          .insert({
            client_id: clientId,
            intervention_id: intervention.id,
            intervention_type: type,
            active: newStatus
          })
        
        if (error) throw error
      }
      
      // Update local state
      setClientInterventions(prev => ({
        ...prev,
        [intervention.id]: newStatus
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
  
  // Get the active status for an intervention
  const getActiveStatus = (intervention: BaseIntervention): boolean => {
    // If the intervention is in the client_interventions table, use that status
    if (intervention.id in clientInterventions) {
      return clientInterventions[intervention.id]
    }
    // Otherwise, use the global intervention status
    return intervention.active
  }
  
  if (interventions.length === 0) {
    return (
      <div className="p-8 text-center bg-card rounded-lg border border-border">
        <p className="text-gray-500">No interventions found with the selected filters.</p>
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      {interventions.map(intervention => (
        <div 
          key={intervention.id} 
          className="p-4 bg-card rounded-lg border border-border"
        >
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <h3 className="font-medium text-gray-900">{intervention.name}</h3>
              
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
            <p>{intervention.description}</p>
          </div>
        </div>
      ))}
    </div>
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
