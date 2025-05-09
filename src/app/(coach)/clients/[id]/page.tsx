import { Metadata } from 'next'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { 
  ArrowLeftIcon, 
  UserCircleIcon, 
  ScaleIcon,
  BookOpenIcon,
  FireIcon
} from '@heroicons/react/24/outline'

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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/clients" className="text-gray-500 hover:text-gray-700">
          <ArrowLeftIcon className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Client Details</h1>
      </div>
      
      {/* Tabs */}
      <div className="border-b border-border">
        <div className="flex space-x-8">
          <button
            className="py-2 px-1 border-b-2 border-primary text-primary font-medium text-sm"
          >
            Client Details
          </button>
          <Link 
            href={`/clients/${client.id}/interventions`}
            className="py-2 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 font-medium text-sm"
          >
            Interventions
          </Link>
        </div>
      </div>
      
      {/* Client Details Tab Content */}
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border border-border shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
                <UserCircleIcon className="h-5 w-5 text-primary" />
                <h3 className="text-base font-semibold text-gray-800">Personal Information</h3>
              </div>
              <div className="space-y-3">
                {client.birth_date && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Birth Date:</span>
                    <span className="text-gray-900 font-medium">
                      {format(new Date(client.birth_date), 'MMMM d, yyyy')}
                    </span>
                  </div>
                )}
                {client.gender && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Gender:</span>
                    <span className="text-gray-900 font-medium">
                      {client.gender.charAt(0).toUpperCase() + client.gender.slice(1)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Status:</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    client.status === 'active' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg border border-border shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
                <ScaleIcon className="h-5 w-5 text-primary" />
                <h3 className="text-base font-semibold text-gray-800">Weight Information</h3>
              </div>
              <div className="space-y-3">
                {client.current_weight && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Current Weight:</span>
                    <span className="text-gray-900 font-medium">{client.current_weight}</span>
                  </div>
                )}
                {client.desired_weight && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Desired Weight:</span>
                    <span className="text-gray-900 font-medium">{client.desired_weight}</span>
                  </div>
                )}
                {client.engagement_start_date && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Started:</span>
                    <span className="text-gray-900 font-medium">
                      {format(parseISO(client.engagement_start_date), 'MMMM d, yyyy')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {client.habit_objectives && Object.keys(client.habit_objectives).length > 0 && (
              <div className="bg-white rounded-lg border border-border shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
                  <BookOpenIcon className="h-5 w-5 text-primary" />
                  <h3 className="text-base font-semibold text-gray-800">Habit Objectives</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(client.habit_objectives).map((habit) => (
                    <span key={habit} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">
                      {habit.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {client.trigger_foods && Object.keys(client.trigger_foods).length > 0 && (
              <div className="bg-white rounded-lg border border-border shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
                  <FireIcon className="h-5 w-5 text-primary" />
                  <h3 className="text-base font-semibold text-gray-800">Trigger Foods</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(client.trigger_foods).map((food) => (
                    <span key={food} className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs rounded-full">
                      {food.split(' ').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {client.notes && (
            <div className="bg-white rounded-lg border border-border shadow-sm p-5 mt-6">
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <h3 className="text-base font-semibold text-gray-800">Notes</h3>
              </div>
              <p className="text-gray-600 whitespace-pre-wrap">{client.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
