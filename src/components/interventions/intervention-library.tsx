'use client'

import { useState } from 'react'
import { toast } from '@/components/ui/use-toast'
import { BaseIntervention, CravingIntervention, EnergyIntervention } from '@/types/intervention'
import { createClient } from '@/lib/supabase/client'

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
}

function InterventionList({ interventions, type }: InterventionListProps) {
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set())
  const supabase = createClient()
  
  // Toggle the active status of an intervention
  const toggleActive = async (intervention: BaseIntervention) => {
    const newStatus = !intervention.active
    setUpdatingIds(prev => new Set(prev).add(intervention.id))
    
    try {
      const { error } = await supabase
        .from(`${type}_interventions`)
        .update({ active: newStatus })
        .eq('id', intervention.id)
      
      if (error) {
        throw new Error(error.message)
      }
      
      // Update the intervention in the UI
      intervention.active = newStatus
      
      toast.success(`${intervention.name} is now ${newStatus ? 'active' : 'inactive'} for all clients.`)
    } catch (error) {
      console.error('Error updating intervention:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update intervention')
    } finally {
      setUpdatingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(intervention.id)
        return newSet
      })
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
                  ${intervention.active ? 'bg-green-500' : 'bg-gray-200'}
                  ${updatingIds.has(intervention.id) ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <span
                  className={`
                    inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                    ${intervention.active ? 'translate-x-6' : 'translate-x-1'}
                  `}
                />
              </button>
              <span className="ml-2 text-sm text-gray-500">
                {intervention.active ? 'Active' : 'Inactive'}
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
interface InterventionLibraryProps {
  cravingInterventions: CravingIntervention[]
  energyInterventions: EnergyIntervention[]
}

export function InterventionLibrary({ 
  cravingInterventions, 
  energyInterventions 
}: InterventionLibraryProps) {
  const [activeTab, setActiveTab] = useState<'craving' | 'energy'>('craving')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [activeTags, setActiveTags] = useState<string[]>([])
  const [showActive, setShowActive] = useState<boolean | null>(null)
  
  // Get unique categories from the current tab's interventions
  const interventions = activeTab === 'craving' ? cravingInterventions : energyInterventions
  const categories = Array.from(new Set(
    interventions
      .map(i => i.category)
      .filter(Boolean) as string[]
  )).sort()
  
  // Get unique tags from the current tab's interventions
  const allTags = Array.from(new Set(
    interventions
      .flatMap(i => i.context_tags || [])
      .filter(Boolean)
  )).sort()
  
  // Filter interventions based on active filters
  const filteredInterventions = interventions.filter(intervention => {
    // Filter by category if one is selected
    if (activeCategory && intervention.category !== activeCategory) {
      return false
    }
    
    // Filter by tags if any are selected
    if (activeTags.length > 0) {
      const interventionTags = intervention.context_tags || []
      if (!activeTags.some(tag => interventionTags.includes(tag))) {
        return false
      }
    }
    
    // Filter by active status if selected
    if (showActive !== null && intervention.active !== showActive) {
      return false
    }
    
    return true
  })
  
  // Handle toggling a tag filter
  const toggleTag = (tag: string) => {
    setActiveTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag) 
        : [...prev, tag]
    )
  }
  
  // Handle toggling active status filter
  const toggleActiveStatus = (status: boolean | null) => {
    setShowActive(prev => prev === status ? null : status)
  }
  
  
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Intervention Library</h2>
      
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
            
            {/* Tags filter */}
            <div>
              <h4 className="text-sm text-gray-500 mb-2">Tags</h4>
              <div className="flex flex-wrap gap-2">
                {allTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`text-xs px-2 py-1 rounded-full border ${
                      activeTags.includes(tag)
                        ? 'bg-primary/10 border-primary text-primary'
                        : 'border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Active status filter */}
            <div>
              <h4 className="text-sm text-gray-500 mb-2">Status</h4>
              <div className="space-y-2">
                <button
                  onClick={() => toggleActiveStatus(true)}
                  className={`text-sm px-2 py-1 rounded-md w-full text-left ${
                    showActive === true
                      ? 'bg-primary/10 text-primary'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Active
                </button>
                <button
                  onClick={() => toggleActiveStatus(false)}
                  className={`text-sm px-2 py-1 rounded-md w-full text-left ${
                    showActive === false
                      ? 'bg-primary/10 text-primary'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Inactive
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Intervention list */}
        <div className="flex-1">
          <InterventionList 
            interventions={filteredInterventions}
            type={activeTab}
          />
        </div>
      </div>
    </div>
  )
}
