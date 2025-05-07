'use client'

import Link from 'next/link'
import { Client } from '@/types/client'
import { formatDistanceToNow } from 'date-fns'
import { PencilIcon, UserIcon } from '@heroicons/react/24/outline'

interface ClientsListProps {
  clients: Client[]
}

export function ClientsList({ clients }: ClientsListProps) {
  // If no clients, show empty state
  if (clients.length === 0) {
    return (
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
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clients.map((client) => (
          <ClientCard key={client.id} client={client} />
        ))}
      </div>
    </div>
  )
}

function ClientCard({ client }: { client: Client }) {
  // Calculate time since engagement started
  const engagementTime = client.engagement_start_date 
    ? formatDistanceToNow(new Date(client.engagement_start_date), { addSuffix: true }) 
    : 'Date not set'

  // Calculate weight difference
  const weightDifference = client.current_weight && client.desired_weight
    ? client.current_weight - client.desired_weight
    : null

  return (
    <div className="bg-white overflow-hidden rounded-lg border border-border">
      <div className="px-4 py-3 border-b border-border">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-medium">{client.full_name}</h3>
            <p className="text-sm text-gray-500">{client.email}</p>
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
              <span className="text-gray-500">Weight Goal:</span>
              <span className="font-medium">
                {client.current_weight} → {client.desired_weight} 
                {weightDifference !== null && weightDifference !== 0 && (
                  <span className={weightDifference > 0 ? 'text-red-500' : 'text-green-500'}>
                    {' '}({weightDifference > 0 ? '-' : '+'}{Math.abs(weightDifference)})
                  </span>
                )}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-500">Started:</span>
            <span className="font-medium">{engagementTime}</span>
          </div>
          {client.habit_objectives && Object.keys(client.habit_objectives).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {Object.keys(client.habit_objectives).map((habit) => (
                <span key={habit} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full">
                  {habit.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="px-4 py-3 bg-gray-50 border-t border-border flex justify-between">
        <Link href={`/clients/${client.id}`}>
          <button className="bg-gray-200 hover:bg-gray-300 text-gray-700 py-1 px-3 text-sm rounded">
            View Details
          </button>
        </Link>
        <Link href={`/clients/${client.id}/edit`}>
          <button className="text-gray-600 hover:text-gray-900 py-1 px-3 text-sm rounded flex items-center gap-1">
            <PencilIcon className="h-4 w-4" />
            Edit
          </button>
        </Link>
      </div>
    </div>
  )
}
