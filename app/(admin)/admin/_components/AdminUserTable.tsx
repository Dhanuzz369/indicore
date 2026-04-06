// app/(admin)/admin/_components/AdminUserTable.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AdminUser } from '@/types/admin'

function timeAgo(iso: string | null): string {
  if (!iso) return 'Never'
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-IN')
}

export default function AdminUserTable({ users }: { users: AdminUser[] }) {
  const router = useRouter()
  const [query, setQuery] = useState('')

  const filtered = users.filter(u =>
    !query ||
    (u.full_name ?? '').toLowerCase().includes(query.toLowerCase()) ||
    u.email.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-4">
        <h2 className="font-black text-[#1A1C1C] text-base flex-1">Users ({users.length})</h2>
        <input
          type="text"
          placeholder="Search name or email…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="text-sm border border-gray-200 rounded-xl px-4 py-2 w-64 focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {['Name', 'Email', 'Tests', 'Avg Score', 'Streak', 'Last Active', 'Joined'].map(h => (
                <th key={h} className="text-left px-6 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr
                key={u.id}
                onClick={() => router.push(`/admin/${u.id}`)}
                className="border-b border-gray-50 hover:bg-blue-50/40 cursor-pointer transition-colors"
              >
                <td className="px-6 py-4 font-bold text-[#1A1C1C]">{u.full_name ?? '—'}</td>
                <td className="px-6 py-4 text-gray-500">{u.email}</td>
                <td className="px-6 py-4 font-bold">{u.total_sessions}</td>
                <td className="px-6 py-4">
                  <span className={`font-black ${u.avg_score >= 60 ? 'text-emerald-600' : u.avg_score >= 40 ? 'text-amber-600' : 'text-red-500'}`}>
                    {u.avg_score > 0 ? `${u.avg_score}%` : '—'}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-600">{u.streak_days > 0 ? `🔥 ${u.streak_days}d` : '—'}</td>
                <td className="px-6 py-4 text-gray-500">{timeAgo(u.last_active)}</td>
                <td className="px-6 py-4 text-gray-400">{new Date(u.created_at).toLocaleDateString('en-IN')}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-6 py-10 text-center text-gray-400 text-sm">No users found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
