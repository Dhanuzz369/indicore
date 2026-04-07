// app/(admin)/admin/page.tsx
import { getAllUsersWithStats, getPlatformMetrics } from '@/lib/supabase/admin-queries'
import AdminUserTable from './_components/AdminUserTable'
import AdminAutoRefresh from './_components/AdminAutoRefresh'
import AdminDateFilter from './_components/AdminDateFilter'
import { Suspense } from 'react'

export const dynamic = 'force-dynamic'

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">{label}</p>
      <p className="text-3xl font-black text-[#1A1C1C]">{value}</p>
    </div>
  )
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  const { from, to } = await searchParams

  const [users, metrics] = await Promise.all([
    getAllUsersWithStats(from, to),
    getPlatformMetrics(from, to),
  ])

  const dateLabel = from && to
    ? `${new Date(from).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${new Date(to).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
    : 'All time'

  return (
    <div className="min-h-screen bg-[#F8F9FC]">
      {/* Header */}
      <div className="bg-[#0f172a] px-6 md:px-10 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-400 mb-1">Indicore</p>
            <h1 className="text-2xl font-black text-white tracking-tight">Admin</h1>
          </div>
          <div className="flex flex-col items-end gap-1">
            <p className="text-xs text-gray-400 font-medium">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <AdminAutoRefresh />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-10 py-8 space-y-6">
        {/* Date filter */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-4">
          <div className="flex items-center gap-4 flex-wrap">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 shrink-0">Period</p>
            <Suspense fallback={null}>
              <AdminDateFilter />
            </Suspense>
            {(from || to) && (
              <span className="ml-auto text-xs text-gray-500 font-medium">{dateLabel}</span>
            )}
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Users"       value={metrics.total_users} />
          <StatCard label="Tests in Period"   value={metrics.tests_in_period} />
          <StatCard label="Avg Score"         value={`${metrics.avg_score_period}%`} />
          <StatCard label="Active Users"      value={metrics.dau} />
        </div>

        {/* User table */}
        <AdminUserTable users={users} />
      </div>
    </div>
  )
}
