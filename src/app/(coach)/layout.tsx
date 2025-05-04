import { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '../globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'HeyCoach | Coach Dashboard',
  description: 'Manage your clients and track their progress',
}

export default function CoachLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="w-64 bg-card border-r border-border">
          <div className="h-16 flex items-center px-6 border-b border-border">
            <h1 className="text-xl font-bold gradient-text">HeyCoach</h1>
          </div>
          <nav className="p-4">
            {/* Navigation items will go here */}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1">
          <header className="h-16 border-b border-border flex items-center justify-between px-6">
            <div className="flex items-center space-x-4">
              <h2 className="text-lg font-semibold">Dashboard</h2>
            </div>
            <div className="flex items-center space-x-4">
              {/* Profile and notifications will go here */}
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
