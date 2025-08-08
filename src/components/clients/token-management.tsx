'use client'

import { toast } from 'sonner'
import { KeyIcon, ClipboardIcon } from '@heroicons/react/24/outline'
import { Client } from '@/types/client'
import { generateClientPortalUrl } from '@/lib/client-portal/url'

export function TokenManagement({ client }: { client: Client }) {
  return (
    <div className="mt-6 bg-white rounded-lg border border-border overflow-hidden">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
          <KeyIcon className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold text-gray-800">Access Token</h3>
        </div>
        <div className="space-y-3">
          {client.access_token ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0 font-mono text-gray-800 text-sm bg-gray-50 p-2 rounded break-all">
                  {generateClientPortalUrl(client.access_token || '')}
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generateClientPortalUrl(client.access_token || ''))
                    toast.success('Portal URL copied to clipboard')
                  }}
                  className="flex-shrink-0 p-2 text-gray-500 hover:text-gray-700"
                  title="Copy portal URL"
                >
                  <ClipboardIcon className="h-5 w-5" />
                </button>
              </div>
              <button
                onClick={async () => {
                  if (!confirm('Are you sure you want to generate a new token? The old token will no longer work.')) return
                  
                  const response = await fetch(`/api/clients/${client.id}/token`, {
                    method: 'POST',
                  })
                  
                  if (response.ok) {
                    window.location.reload()
                  } else {
                    toast.error('Failed to generate new token. Please try again.')
                  }
                }}
                className="w-full py-2 px-3 text-sm bg-purple-100 hover:bg-purple-200 text-purple-700 rounded transition-colors"
              >
                Generate New Token
              </button>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-500 mb-4">No access token generated yet</p>
              <button
                onClick={async () => {
                  const response = await fetch(`/api/clients/${client.id}/token`, {
                    method: 'POST',
                  })
                  
                  if (response.ok) {
                    window.location.reload()
                  } else {
                    toast.error('Failed to generate token. Please try again.')
                  }
                }}
                className="py-2 px-3 text-sm bg-purple-100 hover:bg-purple-200 text-purple-700 rounded transition-colors"
              >
                Generate Token
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
