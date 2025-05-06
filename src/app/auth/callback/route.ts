import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/dashboard'
  
  if (code) {
    try {
      const supabase = await createClient()
      
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Auth error:', error)
        return NextResponse.redirect(new URL('/auth/login?error=auth_failed', request.url))
      }

      if (!data.session) {
        console.error('No session in exchange response')
        return NextResponse.redirect(new URL('/auth/login?error=no_session', request.url))
      }

      // Create coach record if it doesn't exist
      const { data: existingCoach } = await supabase
        .from('coaches')
        .select('id')
        .eq('id', data.session.user.id)
        .single()

      if (!existingCoach) {
        const { error: createError } = await supabase
          .from('coaches')
          .insert([{ id: data.session.user.id }])

        if (createError) {
          console.error('Error creating coach record:', createError)
          return NextResponse.redirect(new URL('/auth/login?error=coach_creation_failed', request.url))
        }
      }

      // Successful authentication
      return NextResponse.redirect(new URL(next, request.url))
    } catch (error) {
      console.error('Unexpected error:', error)
      return NextResponse.redirect(new URL('/auth/login?error=unexpected', request.url))
    }
  }

  // No code present
  return NextResponse.redirect(new URL('/auth/login?error=no_code', request.url))
}
