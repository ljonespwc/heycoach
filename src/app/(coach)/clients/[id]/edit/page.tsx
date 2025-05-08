import React from 'react'
import { Metadata } from 'next'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ClientForm } from '@/components/forms/client-form'
import Link from 'next/link'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'

export const generateMetadata = (): Metadata => {
  return {
    title: 'Edit Client | HeyCoach',
    description: 'Edit client information',
  }
}

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default async function EditClientPage({ params }: PageProps) {
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

  // Add trigger foods to client object
  const clientWithTriggerFoods = {
    ...client,
    trigger_foods: triggerFoods?.map(item => item.food_name) || []
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href={`/clients/${clientId}`} className="text-gray-500 hover:text-gray-700">
          <ArrowLeftIcon className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Edit Client</h1>
      </div>
      
      <div className="p-6 bg-white rounded-lg border border-border">
        <ClientForm client={clientWithTriggerFoods} />
      </div>
    </div>
  )
}
