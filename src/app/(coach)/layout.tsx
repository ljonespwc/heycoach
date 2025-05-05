import { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import '../globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'HeyCoach | Coach Dashboard',
  description: 'Manage your clients and track their progress',
}

async function handleSignOut() {
  'use server'
  const supabase = await createClient()
  await supabase.auth.signOut()
  throw redirect('/auth/login')
}

export default function CoachLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className={`min-h-screen bg-background ${inter.className}`}>
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="w-64 bg-card border-r border-border">
          <div className="h-16 flex items-center px-6 border-b border-border">
            <div className="relative h-[42px] w-[48px]">
              <Image
                src="/images/logo-main.png"
                alt="HeyCoach"
                fill
                style={{ objectFit: 'contain' }}
                priority
                sizes="48px"
              />
            </div>
          </div>
          <nav className="p-4">
            {/* Navigation items will go here */}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1">
          <header className="h-16 border-b border-border flex items-center justify-between px-6">
            <div className="flex items-center space-x-4">
              <h2 className="text-lg font-semibold text-gray-900">Dashboard</h2>
            </div>
            <div className="flex items-center space-x-4">
              <form action={handleSignOut}>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors"
                >
                  Sign Out
                </button>
              </form>
            </div>
          </header>
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
