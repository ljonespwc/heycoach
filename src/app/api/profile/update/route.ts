import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  
  // Get current session
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  // Get and validate form data
  const formData = await request.formData()
  const full_name = formData.get('full_name') as string
  const tone_preset = formData.get('tone_preset') as string

  // Simple validations
  if (!full_name?.trim()) {
    return NextResponse.json({ error: 'Full name is required' }, { status: 400 })
  }
  if (full_name.length > 100) {
    return NextResponse.json({ error: 'Full name must be less than 100 characters' }, { status: 400 })
  }
  if (!['friendly', 'professional', 'motivational'].includes(tone_preset)) {
    return NextResponse.json({ error: 'Invalid communication style' }, { status: 400 })
  }

  try {
    // Update coach profile
    const { error: coachError } = await supabase
      .from('coaches')
      .upsert({
        id: user.id,
        full_name,
      })
    
    if (coachError) throw coachError

    // Update coach settings
    const { error: settingsError } = await supabase
      .from('coach_settings')
      .upsert(
        {
          coach_id: user.id,
          tone_preset,
        },
        {
          onConflict: 'coach_id',
          ignoreDuplicates: false
        }
      )
    
    if (settingsError) throw settingsError

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating profile:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error updating profile' },
      { status: 500 }
    )
  }
}
