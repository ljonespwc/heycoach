import { Metadata } from 'next'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { ClientInterventionLibrary } from '@/components/interventions/client-intervention-library'
import { CravingIntervention, EnergyIntervention } from '@/types/intervention'

export const generateMetadata = (): Metadata => {
  return {
    title: 'Client Interventions | HeyCoach',
    description: 'Manage client-specific interventions',
  }
}

export default async function ClientInterventionsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  const clientId = resolvedParams.id
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return redirect('/auth/login')
  }

  // Get client data
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .eq('coach_id', user.id)
    .single()

  if (clientError || !client) {
    return notFound()
  }
  
  // Get coach's craving interventions
  const { data: cravingInterventions } = await supabase
    .from('craving_interventions')
    .select('*')
    .eq('coach_id', user.id) as { data: CravingIntervention[] }
    
  // Get coach's energy interventions
  const { data: energyInterventions } = await supabase
    .from('energy_interventions')
    .select('*')
    .eq('coach_id', user.id) as { data: EnergyIntervention[] }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href={`/clients/${clientId}`} className="text-gray-500 hover:text-gray-700">
          <ArrowLeftIcon className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Client Interventions</h1>
      </div>
      
      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex space-x-8">
          <Link 
            href={`/clients/${client.id}`}
            className="py-2 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 font-medium text-sm"
          >
            Client Details
          </Link>
          <button
            className="py-2 px-1 border-b-2 border-primary text-primary font-medium text-sm"
          >
            Interventions
          </button>
        </div>
      </div>
      
      {/* Interventions Tab Content */}
      <div className="p-6 bg-white rounded-lg border border-border">
        <ClientInterventionLibrary 
          clientId={clientId}
          cravingInterventions={cravingInterventions || []}
          energyInterventions={energyInterventions || []}
        />
      </div>
    </div>
  )
}
