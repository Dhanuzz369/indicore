// app/(admin)/admin/page.tsx
import { getAllUsersWithStats, getPlatformMetrics } from '@/lib/supabase/admin-queries'
import AdminUserTable from './_components/AdminUserTable'
import AdminAutoRefresh from './_components/AdminAutoRefresh'
import type { AdminUser, PlatformMetrics } from '@/types/admin'

export const dynamic = 'force-dynamic'

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">{label}</p>
      <p className="text-3xl font-black text-[#1A1C1C]">{value}</p>
    </div>
  )
}

export default async function AdminPage() {
  const [users, metrics] = await Promise.all([
    getAllUsersWithStats(),
    getPlatformMetrics(),
  ])

  return (
    <div className="min-h-screen bg-[#F8F9FC]">
      {/* Header */}
      <div className="bg-[#0f172a] px-6 md:px-10 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
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

      <div className="max-w-7xl mx-auto px-6 md:px-10 py-8 space-y-8">
        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Users"      value={metrics.total_users} />
          <StatCard label="Tests Today"      value={metrics.tests_today} />
          <StatCard label="Avg Score (Week)" value={`${metrics.avg_score_week}%`} />
          <StatCard label="DAU"              value={metrics.dau} />
        </div>

        {/* User table — client component for search/sort */}
        <AdminUserTable users={users} />
      </div>
    </div>
  )
}
