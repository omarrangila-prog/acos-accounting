import React from 'react'
import { cn } from '../../lib/utils'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string
  change?: number
  icon?: React.ReactNode
  accent?: string
  subtitle?: string
}

export function StatCard({ title, value, change, icon, accent = 'bg-accent-light', subtitle }: StatCardProps) {
  const isPositive = (change ?? 0) >= 0

  return (
    <div className="stat-card group cursor-default hover:shadow-card-hover transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', accent)}>
          {icon}
        </div>
        {change !== undefined && (
          <div className={cn(
            'flex items-center gap-1 text-xs font-medium',
            isPositive ? 'text-success' : 'text-danger'
          )}>
            {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(change).toFixed(1)}%
          </div>
        )}
      </div>
      <div>
        <p className="text-xl font-bold text-text-primary leading-none">{value}</p>
        {subtitle && <p className="text-xs text-text-muted mt-1">{subtitle}</p>}
      </div>
      <p className="text-xs text-text-muted font-medium">{title}</p>
    </div>
  )
}
