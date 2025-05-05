import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    try {
      const supabase = await createClient()
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Auth error:', error)
        return NextResponse.redirect(new URL('/auth/login', request.url))
      }

      // Successful authentication
      return NextResponse.redirect(new URL('/dashboard', request.url))
    } catch (error) {
      console.error('Unexpected error:', error)
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
  }

  // No code present
  return NextResponse.redirect(new URL('/auth/login', request.url))
}
