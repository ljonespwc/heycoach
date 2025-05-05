import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProfileForm } from '@/components/forms/profile-form'

export const metadata: Metadata = {
  title: 'Profile | HeyCoach',
  description: 'Manage your coaching profile',
}

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return redirect('/auth/login')
  }

  // Get coach profile
  const { data: coach } = await supabase
    .from('coaches')
    .select('*, coach_settings(*)')
    .eq('id', user.id)
    .single()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-900">Profile Settings</h2>
      </div>

      {/* Profile Form */}
      <div className="p-6 bg-card rounded-lg border border-border">
        <ProfileForm coach={coach} />
      </div>

      {/* API Key Section */}
      <div className="p-6 bg-card rounded-lg border border-border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">API Integration</h3>
        <p className="text-sm text-gray-500 mb-4">
          Use your API key to integrate HeyCoach with your existing tools and workflows.
        </p>
        <div className="flex items-center space-x-4">
          <input
            type="password"
            readOnly
            value="••••••••••••••••"
            className="flex-1 px-3 py-2 border border-border rounded-lg bg-background"
          />
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium text-white bg-secondary hover:bg-secondary/90 rounded-lg transition-colors"
          >
            Generate New Key
          </button>
        </div>
      </div>
    </div>
  )
}
