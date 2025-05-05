import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfileForm } from '@/components/forms/profile-form'
import { AvatarUpload } from '@/components/profile/avatar-upload'
import { Coach } from '@/types/coach'

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
    .single() as { data: Coach }

  return (
    <div className="space-y-6">
      {/* Profile Form */}
      <div className="p-4 bg-card rounded-lg border border-border">
        <div className="space-y-6">
          {/* Avatar Upload */}
          <AvatarUpload coach={coach} userId={user.id} />
          
          {/* Profile Form */}
          <ProfileForm coach={coach} />
        </div>
      </div>
    </div>
  )
}
