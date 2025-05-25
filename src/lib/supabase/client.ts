import { createBrowserClient } from '@supabase/ssr'

export const createClient = () => {
  // Check if we're in a browser environment
  const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
  
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          if (!isBrowser) return undefined;
          
          try {
            const cookie = document.cookie
              .split('; ')
              .find((row) => row.startsWith(`${name}=`))
            return cookie ? cookie.split('=')[1] : undefined
          } catch (error) {
            console.error('Error accessing cookies:', error);
            return undefined;
          }
        },
        set(name: string, value: string, options: { path?: string; maxAge?: number; domain?: string; secure?: boolean }) {
          if (!isBrowser) return;
          
          try {
            let cookie = `${name}=${value}`
            if (options.path) cookie += `; path=${options.path}`
            if (options.maxAge) cookie += `; max-age=${options.maxAge}`
            if (options.domain) cookie += `; domain=${options.domain}`
            if (options.secure) cookie += `; secure`
            document.cookie = cookie
          } catch (error) {
            console.error('Error setting cookie:', error);
          }
        },
        remove(name: string, options: { path?: string }) {
          if (!isBrowser) return;
          
          try {
            document.cookie = `${name}=; max-age=0${options.path ? `; path=${options.path}` : ''}`
          } catch (error) {
            console.error('Error removing cookie:', error);
          }
        },
      }
    }
  )
}
