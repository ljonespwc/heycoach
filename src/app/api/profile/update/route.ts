import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  
  // Get current session
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  // Get form data
  const formData = await request.formData()
  const full_name = formData.get('full_name') as string
  const tone_preset = formData.get('tone_preset') as string
  const custom_responses = formData.get('custom_responses') as string

  try {
    const { data: coach } = await supabase
      .from('coaches')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!coach) {
      // Create coach profile if it doesn't exist
      await supabase.from('coaches').insert({
        id: user.id,
        full_name: full_name || '',
      })
    } else {
      // Update coach profile
      await supabase
        .from('coaches')
        .upsert({
          id: user.id,
          full_name,
        })
    }

    // Update coach settings
    await supabase
      .from('coach_settings')
      .upsert({
        coach_id: user.id,
        tone_preset,
        custom_responses: custom_responses ? JSON.parse(custom_responses) : null,
      })

    return NextResponse.redirect('/profile')
  } catch (error) {
    console.error('Error updating profile:', error)
    return new NextResponse('Error updating profile', { status: 500 })
  }
}
