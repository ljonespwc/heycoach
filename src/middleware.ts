import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  // Debug logging
  console.log('Current path:', request.nextUrl.pathname)
  console.log('Session exists:', !!session)
  console.log('Request cookies:', request.cookies.getAll())
  console.log('Response cookies:', response.cookies.getAll())
  
  if (session) {
    const sessionDetails = {
      user: session.user?.email,
      expiresAt: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'Not available',
      expiresIn: session.expires_in,
      accessToken: session.access_token ? 'Present' : 'Missing',
      refreshToken: session.refresh_token ? 'Present' : 'Missing',
      provider: session.user?.app_metadata?.provider,
      sessionKeys: Object.keys(session).join(', '),
      userKeys: session.user ? Object.keys(session.user).join(', ') : 'No user data',
      rawSession: JSON.stringify(session, null, 2)
    }
    console.log('Session details:', sessionDetails)
  } else {
    console.log('No active session found')
  }

  // If user is not signed in and the current path is not /auth/login or /auth/callback,
  // redirect the user to /auth/login
  if (!session && !request.nextUrl.pathname.startsWith('/auth')) {
    console.log('Redirecting to login: No session')
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // If user is signed in and the current path is /auth/login,
  // redirect the user to /dashboard
  if (session && request.nextUrl.pathname.startsWith('/auth')) {
    console.log('Redirecting to dashboard: Has session')
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     * - sw.js (service worker)
     */
    '/((?!_next/static|_next/image|favicon.ico|public|sw.js).*)',
  ],
}
