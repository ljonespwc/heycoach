import React from 'react'
import { Metadata } from 'next'

// Metadata for PWA support
export const metadata: Metadata = {
  title: 'HeyCoach Client',
  description: 'Your personal coaching companion',
  manifest: '/client-manifest.json',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  themeColor: '#ffffff',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'HeyCoach',
  },
}

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <main>{children}</main>
    </div>
  )
}
