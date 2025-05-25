import React, { Suspense } from 'react'
import { Metadata, Viewport } from 'next'
import Script from 'next/script'

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
  other: {
    'apple-mobile-web-app-capable': 'yes',
    'mobile-web-app-capable': 'yes',
    'application-name': 'HeyCoach',
    'apple-mobile-web-app-title': 'HeyCoach',
  },
}

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* Service worker registration */}
      <Script src="/pwa-register.js" strategy="afterInteractive" />
      
      {/* Update manifest with token */}
      <Script src="/update-manifest.js" strategy="afterInteractive" />
      
      <Suspense fallback={<div>Loading...</div>}>
        <main>{children}</main>
      </Suspense>
    </div>
  )
}
