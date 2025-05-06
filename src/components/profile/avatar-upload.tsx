'use client'

import Image from 'next/image'
import { UserCircle, PencilIcon } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase/client'
import { Coach } from '@/types/coach'
import { useState } from 'react'

interface AvatarUploadProps {
  coach: Coach
  userId: string
}

export function AvatarUpload({ coach, userId }: AvatarUploadProps) {
  const [avatarUrl, setAvatarUrl] = useState(coach?.avatar_url)
  const [isUploading, setIsUploading] = useState(false)
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setIsUploading(true)
      const file = e.target.files?.[0]
      if (!file) return

    // Validate file size
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB')
      return
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png']
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a PNG or JPG image')
      return
    }

    // Validate dimensions
    const img = document.createElement('img')
    const objectUrl = URL.createObjectURL(file)
    img.src = objectUrl
    
    await new Promise<void>((resolve) => {
      img.onload = () => resolve()
    })
    
    if (img.width < 200 || img.height < 200) {
      URL.revokeObjectURL(objectUrl)
      toast.error('Image must be at least 200x200 pixels')
      return
    }
    URL.revokeObjectURL(objectUrl)

    const supabase = createClient()
    
    const fileExt = file.name.split('.').pop()
    const randomString = Math.random().toString(36).substring(2, 10)
    const fileName = `${userId}/${randomString}.${fileExt}`
    
    // Upload the file with explicit upsert to handle existing files
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, {
        upsert: true,
        cacheControl: '3600'
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      toast.error('Error uploading image: ' + uploadError.message)
      return
    }

    // Get the public URL
    const { data: urlData } = await supabase.storage
      .from('avatars')
      .getPublicUrl(fileName)

    // Ensure we have a valid URL
    const publicUrl = new URL(urlData.publicUrl).toString()
    console.log('Generated public URL:', publicUrl)

    // Update the coach profile with the new avatar URL
    const { error: updateError } = await supabase
      .from('coaches')
      .update({ avatar_url: publicUrl })
      .eq('id', userId)

    if (updateError) {
      console.error('Profile update error:', updateError)
      toast.error('Error updating profile: ' + updateError.message)
      return
    }

    setAvatarUrl(publicUrl)
    toast.success('Profile picture updated')
    } catch (error) {
      console.error('Avatar upload error:', error)
      toast.error('Error uploading image')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="flex items-center space-x-4">
      <div className="relative">
        <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center overflow-hidden border border-border">
          {isUploading ? (
            <div className="animate-pulse bg-muted-foreground/20 w-full h-full" />
          ) : avatarUrl ? (
            <Image
              src={avatarUrl}
              alt="Profile"
              width={96}
              height={96}
              className="object-cover w-full h-full"
              priority
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
