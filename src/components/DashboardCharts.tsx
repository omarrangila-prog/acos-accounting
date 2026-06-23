'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'

// Charts are heavy; this component is dynamically imported (code-split) so the
// recharts bundle only loads with the dashboard, not the whole app.
export default function DashboardCharts({ d }: { d: any }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="card p-4 sm:p-5">
        <p className="section-title mb-4">Revenue vs Expenses (6 Months)</p>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={d.monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} tickFormatter={(v) => formatCurrency(v, true)} />
            <Tooltip formatter={(v: any) => formatCurrency(v)} />
            <Bar dataKey="revenue" fill="#12A150" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expenses" fill="#DC2626" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="card p-4 sm:p-5">
        <p className="section-title mb-4">Weekly Cash Flow</p>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={d.weeklyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} tickFormatter={(v) => formatCurrency(v, true)} />
            <Tooltip formatter={(v: any) => formatCurrency(v)} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="inflow" stroke="#12A150" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="outflow" stroke="#DC2626" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
