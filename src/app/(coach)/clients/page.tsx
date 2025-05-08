import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Client } from '@/types/client'
import { PlusIcon, UserIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

export const metadata: Metadata = {
  title: 'Clients | HeyCoach',
  description: 'Manage your coaching clients',
}

function ClientCard({ client }: { client: Client }) {
  // Calculate time since engagement started
  const engagementTime = client.engagement_start_date 
    ? formatDistanceToNow(new Date(client.engagement_start_date), { addSuffix: true }) 
    : 'Date not set'

  // No need to calculate weight difference anymore

  return (
    <div className="bg-white overflow-hidden rounded-lg border border-border">
      <div className="px-4 py-3 border-b border-border">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-medium text-gray-900">{client.full_name}</h3>
            <p className="text-sm text-gray-600">{client.email}</p>
          </div>
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${client.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
            {client.status}
          </span>
        </div>
      </div>
      <div className="px-4 py-3">
        <div className="space-y-2 text-sm">
          {client.current_weight && client.desired_weight && (
            <div className="flex justify-between">
              <span className="text-gray-700">Weight Goal:</span>
              <span className="font-medium text-gray-900">
                {client.current_weight} → {client.desired_weight}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-700">Started:</span>
            <span className="font-medium text-gray-900">{engagementTime}</span>
          </div>
          {client.habit_objectives && Object.keys(client.habit_objectives).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {Object.keys(client.habit_objectives).map((habit) => (
                <span key={habit} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">
                  {habit.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="px-4 py-3 bg-gray-50 border-t border-border">
        <Link href={`/clients/${client.id}`}>
          <button className="bg-purple-100 hover:bg-purple-200 text-purple-700 py-1 px-3 text-sm rounded">
            View Details
          </button>
        </Link>
      </div>
    </div>
  )
}

export default async function ClientsPage() {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return redirect('/auth/login')
  }

  // Get coach's clients
  const { data: rawClients } = await supabase
    .from('clients')
    .select('*')
    .eq('coach_id', user.id) as { data: Client[] }
  
  // Sort clients: active first, then by last name
  const clients = rawClients?.sort((a, b) => {
    // First sort by status (active first)
    if (a.status === 'active' && b.status !== 'active') return -1;
    if (a.status !== 'active' && b.status === 'active') return 1;
    
    // Then sort by last name
    const aLastName = a.full_name.split(' ').pop() || '';
    const bLastName = b.full_name.split(' ').pop() || '';
    return aLastName.localeCompare(bLastName);
  })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Your Clients</h1>
        <Link href="/clients/new">
          <button className="bg-primary hover:bg-primary/90 text-white py-2 px-4 rounded flex items-center gap-2">
            <PlusIcon className="h-5 w-5" />
            Add Client
          </button>
        </Link>
      </div>
      
      <div className="p-4 bg-card rounded-lg border border-border">
        {/* Client List */}
        {clients && clients.length > 0 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clients.map((client) => (
                <ClientCard key={client.id} client={client} />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center py-12 px-4">
            <div className="rounded-full bg-gray-100 p-3 mb-4">
              <UserIcon className="h-8 w-8 text-gray-500" />
            </div>
            <h3 className="text-lg font-medium mb-1">No clients yet</h3>
            <p className="text-sm text-gray-500 max-w-sm mb-6">Add your first client to get started with coaching.</p>
            <Link href="/clients/new">
              <button className="bg-primary hover:bg-primary/90 text-white py-2 px-4 rounded">
                Add Your First Client
              </button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
