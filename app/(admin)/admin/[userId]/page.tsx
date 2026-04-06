// app/(admin)/admin/[userId]/page.tsx
import { getAllUsersWithStats, getUserTimeline } from '@/lib/supabase/admin-queries'
import Link from 'next/link'
import type { TimelineEntry } from '@/types/admin'

export const dynamic = 'force-dynamic'

const POSTHOG_PROJECT = 'https://us.posthog.com/project/your_project_id'

function formatDuration(secs: number | null): string {
  if (!secs) return '—'
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}m ${s}s`
}

function scorePct(entry: TimelineEntry): number {
  if (!entry.total_questions) return 0
  return Math.round((entry.correct / entry.total_questions) * 100)
}

function EntryIcon({ mode }: { mode: string }) {
  const icons: Record<string, string> = {
    mock: '📋', practice: '🎯', full: '📄', retake: '🔁',
  }
  return <span className="text-lg">{icons[mode] ?? '📋'}</span>
}

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
              { label: 'Avg Score',  value: user.avg_score > 0 ? `${user.avg_score}%` : '—' },
              { label: 'Streak',     value: user.streak_days > 0 ? `${user.streak_days} days` : '—' },
              { label: 'Total Tests',value: user.total_sessions },
            ].map(s => (
              <div key={s.label} className="bg-white/10 rounded-xl px-4 py-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">{s.label}</p>
                <p className="text-lg font-black text-white">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="max-w-4xl mx-auto px-6 md:px-10 py-8">
        <h2 className="font-black text-[#1A1C1C] text-base mb-5">Activity Timeline</h2>

        {timeline.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-400">
            No test sessions yet.
          </div>
        ) : (
          <div className="space-y-3">
            {timeline.map(entry => (
              <div key={entry.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#4A90E2]/10 flex items-center justify-center shrink-0">
                    <EntryIcon mode={entry.mode} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="font-black text-[#1A1C1C] text-sm">
                        {entry.paper_label ?? entry.exam_type}
                      </p>
                      <p className="text-xs text-gray-400 shrink-0">
                        {new Date(entry.submitted_at).toLocaleString('en-IN', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3 mt-1.5">
                      <span className={`text-xs font-black ${scorePct(entry) >= 60 ? 'text-emerald-600' : scorePct(entry) >= 40 ? 'text-amber-600' : 'text-red-500'}`}>
                        {scorePct(entry)}%
                      </span>
                      <span className="text-xs text-gray-400">
                        {entry.correct}/{entry.total_questions} correct
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatDuration(entry.total_time_seconds)}
                      </span>
                    </div>
                    {/* Subject breakdown */}
                    {entry.subject_breakdown && entry.subject_breakdown.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {entry.subject_breakdown.map(s => (
                          <span key={s.subject} className="text-[10px] bg-gray-100 text-gray-600 rounded-lg px-2 py-0.5 font-medium">
                            {s.subject}: {s.attempted > 0 ? `${Math.round((s.correct / s.attempted) * 100)}%` : '—'}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
