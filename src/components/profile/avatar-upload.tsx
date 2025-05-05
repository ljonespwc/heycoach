'use client'

import Image from 'next/image'
import { UserCircle, PencilIcon } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase/client'
import { Coach } from '@/types/coach'

interface AvatarUploadProps {
  coach: Coach
  userId: string
}

export function AvatarUpload({ coach, userId }: AvatarUploadProps) {
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB')
      return
    }

    const supabase = createClient()
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}-${Math.random()}.${fileExt}`
    
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file)

    if (uploadError) {
      toast.error('Error uploading image')
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName)

    await supabase
      .from('coaches')
      .update({ avatar_url: publicUrl })
      .eq('id', userId)

    toast.success('Profile picture updated')
    window.location.reload() // Refresh to show new avatar
  }

  return (
    <div className="flex items-center space-x-4">
      <div className="relative">
        <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center overflow-hidden border border-border">
          {coach?.avatar_url ? (
            <Image
              src={coach.avatar_url}
              alt="Profile"
              width={96}
              height={96}
              className="object-cover"
            />
          ) : (
            <UserCircle className="w-12 h-12 text-muted-foreground" />
          )}
        </div>
        <label
          htmlFor="avatar-upload"
          className="absolute -bottom-2 -right-2 p-1.5 bg-primary text-white rounded-full cursor-pointer hover:bg-primary/90 transition-colors"
        >
          <PencilIcon className="w-4 h-4" />
          <input
            id="avatar-upload"
            type="file"
            className="hidden"
            accept="image/png,image/jpeg,image/jpg"
            onChange={handleAvatarChange}
          />
        </label>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Profile Picture</h3>
        <p className="text-sm text-muted-foreground">
          PNG, JPG or JPEG (max. 5MB)
        </p>
      </div>
    </div>
  )
}
