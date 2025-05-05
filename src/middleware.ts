import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const requestUrl = new URL(request.url)
  console.log('Request URL:', requestUrl.toString())
  
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
          const cookie = request.cookies.get(name)
          console.log('Getting cookie:', name, cookie?.value ? 'present' : 'missing')
          return cookie?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          console.log('Setting cookie:', name, 'with options:', options)
          // Set cookie in both request and response
          request.cookies.set({ name, value })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
            secure: true,
            sameSite: 'lax',
            path: '/',
          })
        },
        remove(name: string, options: CookieOptions) {
          console.log('Removing cookie:', name)
          request.cookies.set(name, '')
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set(name, '', {
            ...options,
            maxAge: 0,
            path: '/',
          })
        },
      },
      auth: {
        persistSession: true
      }
    }
  )

  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  
  if (sessionError) {
    console.error('Session error:', sessionError)
  }

  // Debug logging
  console.log('Current path:', request.nextUrl.pathname)
  console.log('Session exists:', !!session)
  console.log('Auth cookies:', {
    sb: request.cookies.get('sb-access-token')?.value ? 'present' : 'missing',
    sbRefresh: request.cookies.get('sb-refresh-token')?.value ? 'present' : 'missing',
  })
  
  if (session) {
    const sessionDetails = {
      user: session.user?.email,
      provider: session.user?.app_metadata?.provider,
      lastSignIn: session.user?.last_sign_in_at,
      sessionKeys: Object.keys(session).join(', ')
    }
    console.log('Session details:', sessionDetails)
  } else {
    console.log('No active session found')
  }

  // Handle redirects
  if (!session && !request.nextUrl.pathname.startsWith('/auth')) {
    console.log('Redirecting to login: No session')
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

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
