// app/(admin)/admin/[userId]/page.tsx
import { getAllUsersWithStats, getUserTimeline } from '@/lib/supabase/admin-queries'
import Link from 'next/link'
import UserCharts from '../_components/UserCharts'
import ExpandableSession from '../_components/ExpandableSession'

export const dynamic = 'force-dynamic'

const POSTHOG_PROJECT = 'https://us.posthog.com/project/your_project_id'

export default async function UserDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params
  const [allUsers, timeline] = await Promise.all([
    getAllUsersWithStats(),
    getUserTimeline(userId),
  ])
  const user = allUsers.find(u => u.id === userId)
  if (!user) return <div className="p-10 text-gray-500">User not found.</div>

  const posthogLink = `${POSTHOG_PROJECT}/persons?search=${encodeURIComponent(user.email)}`

  return (
    <div className="min-h-screen bg-[#F8F9FC]">
      {/* Header */}
      <div className="bg-[#0f172a] px-6 md:px-10 py-6">
        <div className="max-w-4xl mx-auto">
          <Link href="/admin" className="text-blue-400 text-xs font-black uppercase tracking-widest hover:text-blue-300 mb-4 inline-block">
            ← All Users
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-black text-white">{user.full_name ?? 'Unnamed'}</h1>
              <p className="text-gray-400 text-sm mt-0.5">{user.email}</p>
              <p className="text-gray-500 text-xs mt-1">
                Joined {new Date(user.created_at).toLocaleDateString('en-IN')}
                {user.target_exam ? ` · ${user.target_exam}` : ''}
                {user.target_year ? ` ${user.target_year}` : ''}
                {' · '}{user.total_sessions} tests
                {' · '}
                <span className={user.has_profile ? 'text-emerald-400' : 'text-gray-500'}>
                  {user.has_profile ? 'Onboarded' : 'Not onboarded'}
                </span>
              </p>
            </div>
            <a
              href={posthogLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#4A90E2] text-white text-xs font-black uppercase tracking-widest px-4 py-2 rounded-xl hover:bg-[#3a7fd4] transition-colors shrink-0"
            >
              View in PostHog ↗
            </a>
          </div>
          {/* Quick stats */}
          <div className="mt-5 flex flex-wrap gap-4">
            {[
              { label: 'Avg Score',   value: user.avg_score > 0 ? `${user.avg_score}%` : '—' },
              { label: 'Streak',      value: user.streak_days > 0 ? `${user.streak_days} days` : '—' },
              { label: 'Total Tests', value: user.total_sessions },
            ].map(s => (
              <div key={s.label} className="bg-white/10 rounded-xl px-4 py-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">{s.label}</p>
                <p className="text-lg font-black text-white">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 md:px-10 py-8 space-y-8">
        {/* Charts — only show if there are sessions */}
        {timeline.length > 0 && (
          <UserCharts user={user} timeline={timeline} />
        )}

        {/* Timeline */}
        <div>
          <h2 className="font-black text-[#1A1C1C] text-base mb-5">Activity Timeline</h2>
          {timeline.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-400">
              No test sessions yet.
            </div>
          ) : (
            <div className="space-y-3">
              {timeline.map(entry => (
                <ExpandableSession key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
