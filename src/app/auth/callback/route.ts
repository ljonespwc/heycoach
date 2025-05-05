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
