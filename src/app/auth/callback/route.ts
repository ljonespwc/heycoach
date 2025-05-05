import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  console.log('Callback received with code:', !!code)

  if (code) {
    try {
      const supabase = await createClient()
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      console.log('Exchange result:', { data, error })
      
      if (error) {
        console.error('Auth error:', error)
        return NextResponse.redirect(new URL('/auth/login?error=auth_failed', request.url))
      }

      // Successful authentication
      console.log('Authentication successful, redirecting to dashboard')
      return NextResponse.redirect(new URL('/dashboard', request.url))
    } catch (error) {
      console.error('Unexpected error:', error)
      return NextResponse.redirect(new URL('/auth/login?error=unexpected', request.url))
    }
  }

  // No code present
  console.log('No code in callback URL')
  return NextResponse.redirect(new URL('/auth/login?error=no_code', request.url))
}
