import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Image from 'next/image'

export default async function LoginPage() {
  const signInWithEmail = async (formData: FormData) => {
    'use server'
    const email = formData.get('email') as string
    const supabase = await createClient()
    
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
        shouldCreateUser: true,
        // Keep user logged in for 30 days
        data: {
          maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
        }
      },
    })

    if (error) {
      return redirect('/auth/login?error=Could not send magic link')
    }
    
    return redirect('/auth/check-email')
  }

  const signInWithGoogle = async () => {
    'use server'
    const supabase = await createClient()
    
    // Create a more robust redirect URL that prioritizes the production domain
    const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL || 
      (process.env.NODE_ENV === 'production'
        ? 'https://www.heycoach.health'
        : process.env.VERCEL_URL 
          ? `https://${process.env.VERCEL_URL}` 
          : 'http://localhost:3000')}/auth/callback`
    
    console.log('Using redirect URL:', redirectTo)
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        scopes: 'email profile',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
          // Set to maximum allowed by Google (24 hours)
          max_age: '86400'
        }
      },
    })
    if (error) {
      return redirect('/auth/login?error=Could not authenticate user')
    }
    return redirect(data.url)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-600 to-magenta-500">
      <div className="w-full max-w-md rounded-lg bg-[#f4f4e8] p-8 shadow-lg">
        <div className="mb-8 flex justify-center">
          <div className="relative h-[350px] w-[350px]">
            <Image
              src="/images/logo-main.png"
              alt="HeyCoach Logo"
              fill
              style={{ objectFit: 'contain' }}
              priority
              sizes="350px"
            />
          </div>
        </div>
        
        {/* Email Sign In Form */}
        <form action={signInWithEmail} className="mb-6 space-y-4">
          <div>
            <input
              type="email"
              name="email"
              id="email"
              required
              className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-purple-500 text-gray-900"
              placeholder="Enter your email"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
          >
            Sign in with Email
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-[#f4f4e8] px-2 text-gray-500">Or</span>
          </div>
        </div>

        {/* Google Sign In Form */}
        <form action={signInWithGoogle}>
          <button
            type="submit"
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
          >
            Sign in with Google
          </button>
        </form>
      </div>
    </div>
  )
}
