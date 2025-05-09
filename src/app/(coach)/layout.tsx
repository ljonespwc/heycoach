import { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Image from 'next/image'
import { SidebarNav } from '@/components/nav/sidebar-nav'
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
    <div className={`min-h-screen bg-background ${inter.className}`}>
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="w-64 bg-card border-r border-border flex flex-col">
          <div className="flex-1 p-4">
            <SidebarNav />
          </div>
          <div className="p-4 flex justify-center">
            <div className="relative h-[150px] w-[150px]">
              <Image
                src="/images/logo-main.png"
                alt="HeyCoach"
                fill
                style={{ objectFit: 'contain' }}
                priority
                sizes="150px"
              />
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-4">
          {children}
        </main>
      </div>
    </div>
  )
}
