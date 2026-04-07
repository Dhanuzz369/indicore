// app/(admin)/admin/_components/AdminUserTable.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AdminUser } from '@/types/admin'

type SortKey = 'full_name' | 'total_sessions' | 'avg_score' | 'streak_days' | 'last_active' | 'created_at'

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

function SortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  if (!active) return <span className="text-gray-300 ml-1">↕</span>
  return <span className="text-[#4A90E2] ml-1">{dir === 'asc' ? '↑' : '↓'}</span>
}

export default function AdminUserTable({ users }: { users: AdminUser[] }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('last_active')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const filtered = users
    .filter(u =>
      !query ||
      (u.full_name ?? '').toLowerCase().includes(query.toLowerCase()) ||
      u.email.toLowerCase().includes(query.toLowerCase())
    )
    .sort((a, b) => {
      const av: string | number | null = a[sortKey]
      const bv: string | number | null = b[sortKey]
      if (av === null) return 1
      if (bv === null) return -1
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      }
      return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number)
    })

  const headers: { label: string; key?: SortKey }[] = [
    { label: 'Status' },
    { label: 'Name',        key: 'full_name' },
    { label: 'Email' },
    { label: 'Exam' },
    { label: 'Tests',       key: 'total_sessions' },
    { label: 'Avg Score',   key: 'avg_score' },
    { label: 'Streak',      key: 'streak_days' },
    { label: 'Last Active', key: 'last_active' },
    { label: 'Joined',      key: 'created_at' },
  ]

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
              {headers.map(h => (
                <th
                  key={h.label}
                  onClick={h.key ? () => handleSort(h.key!) : undefined}
                  className={`text-left px-6 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 whitespace-nowrap ${h.key ? 'cursor-pointer hover:text-gray-600 select-none' : ''}`}
                >
                  {h.label}
                  {h.key && <SortIcon active={sortKey === h.key} dir={sortDir} />}
                </th>
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
                <td className="px-6 py-4">
                  {u.has_profile
                    ? <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 rounded-lg px-2 py-1">Onboarded</span>
                    : <span className="text-[10px] font-black uppercase tracking-wider bg-gray-100 text-gray-500 rounded-lg px-2 py-1">Signed Up</span>
                  }
                </td>
                <td className="px-6 py-4 font-bold text-[#1A1C1C] whitespace-nowrap">{u.full_name ?? '—'}</td>
                <td className="px-6 py-4 text-gray-500 max-w-[200px] truncate">{u.email}</td>
                <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                  {u.target_exam ? `${u.target_exam}${u.target_year ? ' ' + u.target_year : ''}` : '—'}
                </td>
                <td className="px-6 py-4 font-bold">{u.total_sessions}</td>
                <td className="px-6 py-4">
                  <span className={`font-black ${u.avg_score >= 60 ? 'text-emerald-600' : u.avg_score >= 40 ? 'text-amber-600' : 'text-red-500'}`}>
                    {u.avg_score > 0 ? `${u.avg_score}%` : '—'}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-600 whitespace-nowrap">{u.streak_days > 0 ? `🔥 ${u.streak_days}d` : '—'}</td>
                <td className="px-6 py-4 text-gray-500 whitespace-nowrap">{timeAgo(u.last_active)}</td>
                <td className="px-6 py-4 text-gray-400 whitespace-nowrap">{new Date(u.created_at).toLocaleDateString('en-IN')}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={9} className="px-6 py-10 text-center text-gray-400 text-sm">No users found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
