import { Metadata } from 'next'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'

export const generateMetadata = (): Metadata => {
  return {
    title: 'Client Details | HeyCoach',
    description: 'View client details',
  }
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
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

  // Get client's trigger foods
  const { data: triggerFoods } = await supabase
    .from('trigger_foods')
    .select('food_name')
    .eq('client_id', clientId)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/clients" className="text-gray-500 hover:text-gray-700">
          <ArrowLeftIcon className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Client Details</h1>
      </div>
      
      <div className="p-6 bg-white rounded-lg border border-border">
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-semibold text-gray-900">{client.full_name}</h2>
              <Link 
                href={`/clients/${client.id}/edit`} 
                className="text-sm text-primary hover:text-primary/80 flex items-center gap-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
                <span>Edit</span>
              </Link>
            </div>
            {client.email && <p className="text-gray-600">{client.email}</p>}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700">Personal Information</h3>
              <div className="mt-2 space-y-2">
                {client.birth_date && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Birth Date:</span>
                    <span className="text-gray-900">{client.birth_date}</span>
                  </div>
                )}
                {client.gender && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Gender:</span>
                    <span className="text-gray-900">{client.gender}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    client.status === 'active' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {client.status}
                  </span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-700">Weight Information</h3>
              <div className="mt-2 space-y-2">
                {client.current_weight && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Current Weight:</span>
                    <span className="text-gray-900">{client.current_weight}</span>
                  </div>
                )}
                {client.desired_weight && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Desired Weight:</span>
                    <span className="text-gray-900">{client.desired_weight}</span>
                  </div>
                )}
                {client.engagement_start_date && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Started:</span>
                    <span className="text-gray-900">{client.engagement_start_date}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {client.habit_objectives && Object.keys(client.habit_objectives).length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700">Habit Objectives</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {Object.keys(client.habit_objectives).map((habit) => (
                  <span key={habit} className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs rounded-full">
                    {habit.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {triggerFoods && triggerFoods.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-700">Trigger Foods</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {triggerFoods.map((item) => (
                  <span key={item.food_name} className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs rounded-full">
                    {item.food_name}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {client.notes && (
            <div>
              <h3 className="text-sm font-medium text-gray-700">Notes</h3>
              <p className="mt-2 text-gray-600 whitespace-pre-wrap">{client.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
