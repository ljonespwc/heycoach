import React, { Suspense } from 'react'
import { Metadata, Viewport } from 'next'

// Metadata for PWA support
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#ffffff',
}

export const metadata: Metadata = {
  title: 'HeyCoach Client',
  description: 'Your personal coaching companion',
  manifest: '/client-manifest.json',
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
      <Suspense fallback={<div>Loading...</div>}>
        <main>{children}</main>
      </Suspense>
    </div>
  )
}
