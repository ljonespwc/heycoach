'use client'

import { Loader2 } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  loading?: boolean
  className?: string
  valueColor?: string
}

export function StatCard({ 
  title, 
  value, 
  loading = false, 
  className = '',
  valueColor = 'text-primary'
}: StatCardProps) {
  return (
    <div className={`p-6 bg-card rounded-lg border border-border feature-card ${className}`}>
      <h3 className="text-lg font-semibold mb-2 text-gray-900">{title}</h3>
      {loading ? (
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground">Loading...</span>
        </div>
      ) : (
        <p className={`text-3xl font-bold ${valueColor}`}>{value}</p>
      )}
    </div>
  )
}