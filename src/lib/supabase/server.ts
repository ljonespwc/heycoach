// Supabase server-side client configuration
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const createClient = async () => {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set(name, value, options)
          } catch (error) {
            console.error('Error setting cookie:', error)
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            // Only attempt to remove if we're in a mutable context
            if (cookieStore.has(name)) {
              cookieStore.set(name, '', { ...options, maxAge: 0 })
            }
          } catch (error) {
            // Silently handle cookie removal errors
            // This prevents errors from breaking the auth flow
          }
        },
      },
    }
  )
}
