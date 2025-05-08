import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ClientForm } from '@/components/forms/client-form'
import Link from 'next/link'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'

export const generateMetadata = (): Metadata => {
  return {
    title: 'Add New Client | HeyCoach',
    description: 'Add a new coaching client',
  }
}

export default async function NewClientPage() {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return redirect('/auth/login')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/clients" className="text-gray-500 hover:text-gray-700">
          <ArrowLeftIcon className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Add New Client</h1>
      </div>
      
      <div className="p-6 bg-white rounded-lg border border-border">
        <ClientForm isNewClient={true} />
      </div>
    </div>
  )
}
