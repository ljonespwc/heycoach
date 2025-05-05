import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/dashboard'
  
  console.log('Callback URL:', requestUrl.toString())
  console.log('Auth code present:', !!code)

  if (code) {
    try {
      const supabase = await createClient()
      console.log('Created Supabase client')
      
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      console.log('Exchange complete:', {
        success: !!data?.session,
        error: error?.message || 'none',
        user: data?.session?.user?.email || 'no user'
      })
      
      if (error) {
        console.error('Auth error:', error)
        return NextResponse.redirect(new URL('/auth/login?error=auth_failed', request.url))
      }

      if (!data.session) {
        console.error('No session in exchange response')
        return NextResponse.redirect(new URL('/auth/login?error=no_session', request.url))
      }

      // Successful authentication
      console.log('Authentication successful, redirecting to:', next)
      return NextResponse.redirect(new URL(next, request.url))
    } catch (error) {
      console.error('Unexpected error:', error)
      return NextResponse.redirect(new URL('/auth/login?error=unexpected', request.url))
    }
  }

  // No code present
  console.log('No code in callback URL')
  return NextResponse.redirect(new URL('/auth/login?error=no_code', request.url))
}
