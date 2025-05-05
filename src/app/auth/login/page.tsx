import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function LoginPage() {
  const signInWithEmail = async (formData: FormData) => {
    'use server'
    const email = formData.get('email') as string
    const supabase = await createClient()
    
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
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
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || new URL(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000').origin}/auth/callback`,
        // Add debug log to see what URL is being used
        scopes: 'email profile',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })
    if (error) {
      return redirect('/auth/login?error=Could not authenticate user')
    }
    return redirect(data.url)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-600 to-magenta-500">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
        <h1 className="mb-8 text-center text-3xl font-bold text-gray-900">Welcome to HeyCoach</h1>
        
        {/* Email Sign In Form */}
        <form action={signInWithEmail} className="mb-6 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email address
            </label>
            <input
              type="email"
              name="email"
              id="email"
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-purple-500 text-gray-900"
              placeholder="you@example.com"
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
            <span className="bg-white px-2 text-gray-500">Or continue with</span>
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
