'use client'

import dynamic from 'next/dynamic'

const ClientAccessForm = dynamic(
  () => import('@/components/client-portal/access-form'),
  { ssr: false }
)

export default function ClientWrapper() {
  return <ClientAccessForm />
}
