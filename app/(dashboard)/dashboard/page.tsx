'use client'
export const dynamic = 'force-dynamic'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useInView } from 'framer-motion'
import { getCurrentUser } from '@/lib/supabase/auth'
import { getProfile, getUserStats, getSubjectsWithCounts, getSubjectAccuracyFromHistory } from '@/lib/supabase/queries'
import { useAnalytics } from '@/hooks/useAnalytics'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Flame, ChevronRight, AlertCircle, Grid3x3, ArrowRight,
  LayoutGrid, ClipboardList, BookCheck
} from 'lucide-react'
import type { Profile, UserStats, Subject } from '@/types'
import Link from 'next/link'
import { WeakSubjectModal } from '@/components/dashboard/WeakSubjectModal'

// ─── Helpers ──────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning,'
  if (h < 17) return 'Good afternoon,'
  return 'Good evening,'
}


function getPerformanceLabel(accuracy: number) {
  if (accuracy >= 75) return { label: 'Strong',      color: 'text-emerald-600', dot: 'bg-emerald-500', trend: 'up' }
  if (accuracy >= 55) return { label: 'Moderate',    color: 'text-amber-600',   dot: 'bg-amber-400',   trend: 'flat' }
  if (accuracy >= 35) return { label: 'Needs Work',  color: 'text-orange-500',  dot: 'bg-orange-400',  trend: 'down' }
  return                      { label: 'Critical',   color: 'text-red-600',     dot: 'bg-red-500',     trend: 'down' }
}

// ─── Offerings Carousel v2 (reference design) ─────────────────────

const MONO = 'var(--font-jetbrains,"JetBrains Mono",ui-monospace,monospace)'
const DISPLAY = 'var(--font-bebas,"Bebas Neue",Impact,sans-serif)'

const layerCardStyle: React.CSSProperties = {
  background: '#fff', borderRadius: '9px', padding: '8px 9px',
  border: '1px solid #f0e8e8', display: 'flex', flexDirection: 'column',
  gap: '2px', minHeight: 0, overflow: 'hidden',
}
const layerNum = (color: string): React.CSSProperties => ({
  fontFamily: MONO, fontSize: '7px', fontWeight: 700, color, letterSpacing: '.1em',
  whiteSpace: 'nowrap',
})
const layerTitle: React.CSSProperties = {
  fontSize: '9.5px', fontWeight: 600, color: '#1a0808', lineHeight: 1.2,
}

function MockSlide({ active, onCta }: { active: boolean; onCta: () => void }) {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      opacity: active ? 1 : 0, transition: 'opacity 0.45s ease',
      pointerEvents: active ? 'all' : 'none',
      background: '#f7f7f2', display: 'flex', alignItems: 'stretch', overflow: 'hidden',
    }}>
      {/* ruled paper texture */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'repeating-linear-gradient(transparent,transparent 27px,rgba(99,102,241,.05) 27px,rgba(99,102,241,.05) 28px)',
      }} />
      {/* right accent panel */}
      <div style={{
        position: 'absolute', right: 0, top: 0, bottom: 0, width: '300px',
        background: 'linear-gradient(135deg,#eef0ff 0%,#e0e4ff 100%)',
        clipPath: 'polygon(22% 0%,100% 0%,100% 100%,0% 100%)',
      }} />
      <div style={{
        position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', width: '100%', padding: '20px 28px',
      }}>
        {/* text */}
        <div>
          <div style={{ fontFamily: MONO, fontSize: '9px', fontWeight: 600, letterSpacing: '.18em', textTransform: 'uppercase', color: '#6366f1', marginBottom: '8px' }}>
            // Full-length simulation
          </div>
          <div style={{ fontFamily: DISPLAY, fontSize: 'clamp(36px,5vw,50px)', lineHeight: .88, color: '#1a1a2e' }}>
            INDICORE<br /><span style={{ color: '#6366f1' }}>MOCK.</span>
          </div>
          <div style={{ fontFamily: MONO, fontSize: '10px', color: '#9999bb', marginTop: '8px', letterSpacing: '.04em' }}>
            100 questions&nbsp;·&nbsp;2 hours&nbsp;·&nbsp;200 marks
          </div>
          <button onClick={onCta} style={{
            display: 'inline-flex', alignItems: 'center', marginTop: '10px',
            fontFamily: MONO, fontSize: '10px', fontWeight: 700, letterSpacing: '.12em',
            padding: '7px 15px', borderRadius: '7px', background: '#6366f1', color: '#fff',
            textTransform: 'uppercase', cursor: 'pointer', border: 'none',
          }}>Attempt Now →</button>
        </div>
        {/* stacked mock cards */}
        <div className="hidden sm:block" style={{ position: 'relative', width: '200px', height: '154px', flexShrink: 0 }}>
          <div style={{ position: 'absolute', width: '138px', height: '88px', borderRadius: '12px', background: '#dde0ff', right: 0, top: '34px', transform: 'rotate(5.5deg)', border: '1px solid rgba(99,102,241,.07)' }} />
          <div style={{ position: 'absolute', width: '138px', height: '88px', borderRadius: '12px', background: '#eef0ff', right: '13px', top: '19px', transform: 'rotate(1.5deg)', border: '1px solid rgba(99,102,241,.11)' }} />
          <div style={{
            position: 'absolute', width: '138px', height: '88px', borderRadius: '12px',
            background: '#fff', right: '26px', top: '4px', transform: 'rotate(-2.5deg)',
            boxShadow: '0 4px 18px rgba(99,102,241,.13)', border: '1px solid rgba(99,102,241,.2)',
            padding: '10px 13px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontFamily: MONO, fontSize: '6.5px', fontWeight: 700, color: '#6366f1', letterSpacing: '.14em', textTransform: 'uppercase' }}>Indicore Mock</div>
              <div style={{ fontFamily: DISPLAY, fontSize: '21px', lineHeight: 1, color: '#1a1a2e', marginTop: '2px' }}>Mock 1</div>
            </div>
            <div>
              <div style={{ height: '1px', background: 'rgba(99,102,241,.12)', marginBottom: '5px' }} />
              <div style={{ display: 'flex' }}>
                {[['100', 'Questions'], ['2 Hr', 'Duration'], ['200', 'Marks']].map(([v, l]) => (
                  <div key={l} style={{ flex: 1 }}>
                    <div style={{ fontFamily: MONO, fontSize: '10px', fontWeight: 700, color: '#1a1a2e' }}>{v}</div>
                    <div style={{ fontSize: '5.5px', color: '#bbb', textTransform: 'uppercase', letterSpacing: '.08em', marginTop: '1px' }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function AnalyticsSlide({ active, stats }: { active: boolean; stats: UserStats | null }) {
  const answered = stats?.total_attempted ?? 0
  const correct = stats?.total_correct ?? 0
  const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : null
  return (
    <div style={{
      position: 'absolute', inset: 0,
      opacity: active ? 1 : 0, transition: 'opacity 0.45s ease',
      pointerEvents: active ? 'all' : 'none',
      background: '#faf7f7', display: 'flex', alignItems: 'stretch', overflow: 'hidden',
    }}>
      {/* pink blob */}
      <div style={{
        position: 'absolute', right: '-50px', top: '-70px', width: '300px', height: '300px',
        borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%,#ffe4e1,#fecaca 55%,transparent 78%)', opacity: .4,
      }} />
      <div style={{
        position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center',
        width: '100%', padding: '0 20px 0 28px', gap: '16px',
      }}>
        {/* left text */}
        <div style={{ flexShrink: 0 }}>
          <div style={{ fontFamily: MONO, fontSize: '9px', fontWeight: 600, letterSpacing: '.18em', textTransform: 'uppercase', color: '#ef4444', marginBottom: '8px' }}>
            // 6-layer engine
          </div>
          <div style={{ fontFamily: DISPLAY, fontSize: 'clamp(36px,5vw,50px)', lineHeight: .88, color: '#1a0808' }}>
            DEEP<br /><span style={{ color: '#ef4444' }}>ANALYTICS.</span>
          </div>
          <div style={{ fontSize: '11.5px', color: '#bbb', marginTop: '7px', lineHeight: 1.4 }}>
            Every layer of<br />your performance.
          </div>
        </div>
        {/* 6-layer grid */}
        <div className="hidden sm:block" style={{ width: '340px', flexShrink: 0 }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: '1fr 1fr',
          gap: '6px', width: '100%', maxHeight: '158px', height: '158px',
        }}>
          {/* L1 Score */}
          <div style={layerCardStyle}>
            <div style={layerNum('#fca5a5')}>L1 · ACCURACY</div>
            <div style={layerTitle}>Overall Score</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
              <div style={{ fontFamily: MONO, fontSize: '13px', fontWeight: 700, color: '#1a0808' }}>
                {correct}
              </div>
              <div>
                <div style={{ fontSize: '7.5px', color: '#bbb' }}>/ {answered} answered</div>
                <div style={{ fontSize: '7.5px', color: '#ef4444', fontWeight: 600 }}>
                  {accuracy !== null ? `${accuracy}% acc.` : 'No data yet'}
                </div>
              </div>
            </div>
          </div>
          {/* L2 Difficulty */}
          <div style={layerCardStyle}>
            <div style={layerNum('#fca5a5')}>L2 · DIFFICULTY</div>
            <div style={layerTitle}>Basic / Int / Advanced</div>
            <div style={{ display: 'flex', gap: '3px', alignItems: 'flex-end', height: '18px', marginTop: '2px' }}>
              <div style={{ width: '8px', borderRadius: '2px 2px 0 0', height: '16px', background: '#86efac' }} />
              <div style={{ width: '8px', borderRadius: '2px 2px 0 0', height: '11px', background: '#fcd34d' }} />
              <div style={{ width: '8px', borderRadius: '2px 2px 0 0', height: '6px', background: '#fca5a5' }} />
              <div style={{ fontSize: '7px', color: '#bbb', alignSelf: 'flex-end', marginLeft: '2px', lineHeight: 1.2 }}>82%<br />61%<br />38%</div>
            </div>
          </div>
          {/* L3 Subject */}
          <div style={layerCardStyle}>
            <div style={layerNum('#fca5a5')}>L3 · SUBJECT</div>
            <div style={layerTitle}>Weak Areas</div>
            <div style={{ marginTop: '2px' }}>
              <div style={{ fontSize: '7.5px', color: '#bbb', marginBottom: '2px' }}>History</div>
              <div style={{ height: '4px', background: '#f0e8e8', borderRadius: '2px' }}>
                <div style={{ height: '100%', width: '26%', background: '#ef4444', borderRadius: '2px' }} />
              </div>
              <div style={{ fontSize: '7.5px', color: '#bbb', marginTop: '3px', marginBottom: '2px' }}>Polity</div>
              <div style={{ height: '4px', background: '#f0e8e8', borderRadius: '2px' }}>
                <div style={{ height: '100%', width: '62%', background: '#fbbf24', borderRadius: '2px' }} />
              </div>
            </div>
          </div>
          {/* L4 Confidence */}
          <div style={layerCardStyle}>
            <div style={layerNum('#fca5a5')}>L4 · CONFIDENCE</div>
            <div style={layerTitle}>Confidence Tags</div>
            <div style={{ display: 'flex', gap: '3px', marginTop: '3px', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: MONO, fontSize: '7px', fontWeight: 700, padding: '2px 5px', borderRadius: '3px', background: '#f0fdf4', border: '1px solid #86efac', color: '#16a34a' }}>✓ Sure 12</span>
              <span style={{ fontFamily: MONO, fontSize: '7px', fontWeight: 700, padding: '2px 5px', borderRadius: '3px', background: '#fffbeb', border: '1px solid #fcd34d', color: '#b45309' }}>~ 50-50 4</span>
              <span style={{ fontFamily: MONO, fontSize: '7px', fontWeight: 700, padding: '2px 5px', borderRadius: '3px', background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626' }}>? Guess 3</span>
            </div>
          </div>
          {/* L5 Trend */}
          <div style={layerCardStyle}>
            <div style={layerNum('#fca5a5')}>L5 · TREND</div>
            <div style={layerTitle}>Over Time</div>
            <div style={{ marginTop: '3px' }}>
              <svg width="100%" height="22" viewBox="0 0 110 22" preserveAspectRatio="none">
                <polyline points="0,18 22,14 44,16 66,9 88,11 110,6" fill="none" stroke="#fca5a5" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
                <circle cx="110" cy="6" r="2.5" fill="#ef4444" />
              </svg>
            </div>
          </div>
          {/* L6 Answer Log */}
          <div style={layerCardStyle}>
            <div style={layerNum('#fca5a5')}>L6 · LOG</div>
            <div style={layerTitle}>Revised to Wrong</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px' }}>
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
              <div style={{ fontSize: '8px', color: '#1a0808', fontWeight: 600 }}>2 changes</div>
            </div>
            <div style={{ fontSize: '7.5px', color: '#bbb', marginTop: '1px' }}>−1.34 marks lost</div>
          </div>
        </div>{/* end grid */}
        </div>{/* end sm:block wrapper */}
      </div>
    </div>
  )
}

function NotesSlide({ active, onCta }: { active: boolean; onCta: () => void }) {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      opacity: active ? 1 : 0, transition: 'opacity 0.45s ease',
      pointerEvents: active ? 'all' : 'none',
      background: '#fdf8f0', display: 'flex', alignItems: 'stretch', overflow: 'hidden',
    }}>
      {/* dot grid */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'radial-gradient(circle,rgba(160,105,42,.1) 1.2px,transparent 1.2px)',
        backgroundSize: '18px 18px',
      }} />
      {/* warm blob */}
      <div style={{
        position: 'absolute', right: '-30px', top: '-50px', width: '240px', height: '240px',
        borderRadius: '50%', background: 'radial-gradient(circle,#fde68a,#fdf3d0 50%,transparent 74%)', opacity: .32,
      }} />
      <div style={{
        position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', width: '100%', padding: '20px 28px',
      }}>
        {/* text */}
        <div>
          <div style={{ fontFamily: MONO, fontSize: '9px', fontWeight: 600, letterSpacing: '.18em', textTransform: 'uppercase', color: '#b45309', marginBottom: '8px' }}>
            // Spaced repetition
          </div>
          <div style={{ fontFamily: DISPLAY, fontSize: 'clamp(36px,5vw,50px)', lineHeight: .88, color: '#1c1207' }}>
            MY<br /><span style={{ color: '#d97706' }}>FLASH CARDS.</span>
          </div>
          <div style={{ fontSize: '12px', color: '#b08050', marginTop: '9px' }}>
            Flashcards that know when to show up.
          </div>
          <button onClick={onCta} style={{
            display: 'inline-flex', alignItems: 'center', marginTop: '10px',
            fontFamily: MONO, fontSize: '10px', fontWeight: 700, letterSpacing: '.12em',
            padding: '7px 15px', borderRadius: '7px', background: '#1c1207', color: '#fdf8f0',
            textTransform: 'uppercase', cursor: 'pointer', border: 'none',
          }}>Open Flash Cards →</button>
        </div>
        {/* stacked flashcards */}
        <div className="hidden sm:block" style={{ position: 'relative', width: '200px', height: '154px', flexShrink: 0 }}>
          <div style={{ position: 'absolute', width: '136px', height: '88px', borderRadius: '11px', background: '#fae8c0', right: 0, top: '34px', transform: 'rotate(5.5deg)', border: '1px solid rgba(180,83,9,.07)' }} />
          <div style={{ position: 'absolute', width: '136px', height: '88px', borderRadius: '11px', background: '#fdf3e0', right: '13px', top: '19px', transform: 'rotate(1.5deg)', border: '1px solid rgba(180,83,9,.1)' }} />
          <div style={{
            position: 'absolute', width: '136px', height: '88px', borderRadius: '11px',
            background: '#fff', right: '26px', top: '4px', transform: 'rotate(-2.5deg)',
            boxShadow: '0 4px 18px rgba(180,83,9,.11)', border: '1px solid rgba(180,83,9,.18)',
            padding: '10px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          }}>
            <div>
              <span style={{
                display: 'inline-block', fontFamily: MONO, fontSize: '6.5px', fontWeight: 700,
                letterSpacing: '.14em', background: '#fef3c7', color: '#92400e',
                padding: '2px 7px', borderRadius: '4px',
              }}>HISTORY</span>
              <div style={{ fontSize: '8.5px', fontWeight: 500, color: '#1c1207', lineHeight: 1.45, marginTop: '5px' }}>
                Which feature characterizes Indus Valley agricultural practices?
              </div>
            </div>
            <div style={{ fontFamily: MONO, fontSize: '6.5px', color: '#b45309' }}>⏱ Due tomorrow</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function OfferingsCarousel({ stats }: { stats: UserStats | null }) {
  const [current, setCurrent] = useState(0)
  const pausedRef = useRef(false)
  const router = useRouter()
  const ACCENT = ['#6366f1', '#ef4444', '#d97706']

  useEffect(() => {
    const id = setInterval(() => {
      if (!pausedRef.current) setCurrent(c => (c + 1) % 3)
    }, 4000)
    return () => clearInterval(id)
  }, [])

  return (
    <div
      className="relative rounded-[1.375rem] overflow-hidden"
      style={{ height: '200px', boxShadow: '0 2px 30px rgba(0,0,0,0.09)' }}
      onMouseEnter={() => { pausedRef.current = true }}
      onMouseLeave={() => { pausedRef.current = false }}
    >
      <MockSlide active={current === 0} onCta={() => router.push('/quiz')} />
      <AnalyticsSlide active={current === 1} stats={stats} />
      <NotesSlide active={current === 2} onCta={() => router.push('/notes')} />

      {/* Dot nav */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
        {[0, 1, 2].map(i => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            aria-label={`Go to slide ${i + 1}`}
            style={{
              width: i === current ? '24px' : '6px',
              height: '6px',
              borderRadius: '4px',
              background: i === current ? ACCENT[current] : '#ccc',
              transition: 'all 0.3s ease',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              outline: 'none',
            }}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Weak Area Subject Card ────────────────────────────────────────
function WeakSubjectCard({
  subject,
  accuracy,
  onAttempt,
}: {
  subject: Subject
  accuracy: number
  onAttempt: (e: React.MouseEvent) => void
}) {
  const perf = getPerformanceLabel(accuracy)
  const barColor = accuracy >= 70 ? '#16a34a' : accuracy >= 55 ? '#d97706' : accuracy >= 35 ? '#f97316' : '#ef4444'

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3.5 hover:shadow-md hover:border-gray-200 transition-all">
      {/* Top row: name + Attempt Now button */}
      <div className="flex items-start justify-between gap-3 mb-1">
        <h3 className="font-bold text-gray-900 text-sm leading-snug">{subject.Name}</h3>
        <button
          onClick={onAttempt}
          className="shrink-0 px-3 py-1 rounded-full border border-gray-200 text-[11px] font-semibold text-gray-600 bg-white hover:border-gray-400 hover:text-gray-900 active:scale-95 transition-all whitespace-nowrap"
        >
          Attempt now
        </button>
      </div>

      {/* Performance label */}
      <div className="flex items-center gap-1.5 mb-2.5">
        <span className="text-xs text-gray-400">Performance:</span>
        <span className={`text-xs font-bold ${perf.color}`}>{accuracy}%</span>
        <span className={`text-[10px] font-semibold ${perf.color}`}>({perf.label})</span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${accuracy}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  )
}

// ─── Main Dashboard ────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter()
  const { track } = useAnalytics()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState<UserStats | null>(null)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [subjectAccuracy, setSubjectAccuracy] = useState<Map<string, number>>(new Map())
  const [weakPracticeSubject, setWeakPracticeSubject] = useState<{ subject: Subject; accuracy: number } | null>(null)

  // Section visibility refs for dashboard_section_viewed tracking
  const streakRef  = useRef(null)
  const weakRef    = useRef(null)
  const testsRef   = useRef(null)
  const streakView = useInView(streakRef,  { once: true })
  const weakView   = useInView(weakRef,    { once: true })
  const testsView  = useInView(testsRef,   { once: true })

  useEffect(() => { if (streakView) track('dashboard_section_viewed', { section: 'streak' }) },       [streakView])
  useEffect(() => { if (weakView)   track('dashboard_section_viewed', { section: 'weak_areas' }) },   [weakView])
  useEffect(() => { if (testsView)  track('dashboard_section_viewed', { section: 'recent_tests' }) }, [testsView])

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const user = await getCurrentUser()
      if (!user) throw new Error('Not authenticated')

      const cachedSubjects = sessionStorage.getItem('subjects_with_counts')
      const subjectsPromise = cachedSubjects
        ? Promise.resolve({ documents: JSON.parse(cachedSubjects) })
        : getSubjectsWithCounts().then(r => {
            sessionStorage.setItem('subjects_with_counts', JSON.stringify(r.documents))
            return r
          })

      const [profileData, statsData, subjectsData, accuracyMap] = await Promise.all([
        getProfile(user.$id),
        getUserStats(user.$id),
        subjectsPromise,
        getSubjectAccuracyFromHistory(user.$id),
      ])
      setProfile(profileData as unknown as Profile)
      setStats(statsData as unknown as UserStats)
      setSubjects(subjectsData.documents as unknown as Subject[])
      setSubjectAccuracy(accuracyMap)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const firstName = profile?.full_name?.split(' ')[0] || 'Aspirant'
  const streakDays = stats?.streak_days ?? 0

  // Streak milestone tracking
  useEffect(() => {
    if (streakDays > 0 && [3, 7, 14, 30].includes(streakDays)) {
      track('streak_milestone', { days: streakDays })
    }
  }, [streakDays])

  // Build weak subjects from real accuracy data — only subjects attempted, sorted worst first
  const weakSubjects = subjects
    .filter(s => subjectAccuracy.has(s.Name))
    .map(s => ({ subject: s, accuracy: subjectAccuracy.get(s.Name)! }))
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 6)

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F7]">
        <div className="bg-white px-5 pt-8 pb-6 space-y-5">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-9 w-48" />
        </div>
        <div className="px-4 mt-4 space-y-4">
          <Skeleton className="h-52 rounded-[2rem]" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-4 w-36" />
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="text-center space-y-4 p-6">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto" />
          <p className="text-gray-500">{error}</p>
          <button
            onClick={fetchData}
            className="px-6 py-2.5 bg-[#4A90E2] text-white rounded-xl text-sm font-semibold hover:bg-[#3a7fd4] transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7]">

      {/* HEADER */}
      <div ref={streakRef} className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 md:px-6 pt-6 md:pt-10 pb-5 md:pb-8">
          <p className="text-[10px] font-black tracking-[0.25em] text-gray-400 uppercase mb-1.5">Overview</p>
          <div className="flex items-end gap-2 md:gap-3 flex-wrap">
            <h1 className="text-2xl md:text-5xl font-black text-gray-900 leading-tight tracking-tight">
              {getGreeting()}<br />
              <span className="text-[#4A90E2]">{firstName}!</span>
            </h1>
            {/* Streak badge inline */}
            <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 text-blue-700 px-2.5 py-1 md:px-3 md:py-1.5 rounded-full mb-0.5">
              <Flame className="h-3 w-3 md:h-3.5 md:w-3.5 text-blue-500" />
              <span className="text-[11px] md:text-xs font-black">
                {streakDays > 0 ? `${streakDays} day streak` : 'Start your streak'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-8">

        {/* OFFERINGS CAROUSEL */}
        <OfferingsCarousel stats={stats} />

        {/* CORE PRACTICE */}
        <div>
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <h2 className="text-lg md:text-2xl font-black text-gray-900">Core Practice</h2>
            <Link href="/quiz" className="text-[10px] font-black tracking-widest uppercase text-[#4A90E2] flex items-center gap-1 hover:translate-x-1 transition-transform">
              VIEW LIBRARY <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Link href="/quiz">
              <div className="h-full relative bg-[#4A90E2] rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-8 overflow-hidden shadow-lg shadow-blue-100 group transition-all hover:-translate-y-1">
                <div className="absolute -right-8 -top-8 w-48 h-48 bg-white/10 rounded-full" />
                <div className="absolute -right-2 top-10 w-32 h-32 bg-white/10 rounded-full" />
                <div className="relative z-10">
                  <div className="inline-flex items-center gap-1 bg-white/20 text-white text-[9px] font-black tracking-[0.2em] uppercase px-3 py-1.5 rounded-full mb-3 md:mb-4">
                    Marathon Session
                  </div>
                  <h3 className="text-white font-black text-xl md:text-3xl leading-tight mb-5 md:mb-8">
                    Full Length<br />Mock Test
                  </h3>
                  <button className="flex items-center gap-2 bg-white text-[#4A90E2] font-black text-xs md:text-sm px-4 md:px-7 py-2.5 md:py-3.5 rounded-xl md:rounded-2xl hover:bg-blue-50 transition-colors shadow-sm">
                    Start Session
                    <ArrowRight className="h-4 w-4 md:h-5 md:w-5" />
                  </button>
                </div>
              </div>
            </Link>

            <Link href="/quiz?tab=subject">
              <div className="h-full relative bg-white rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-8 border border-gray-100 shadow-sm overflow-hidden group transition-all hover:-translate-y-1 hover:shadow-md">
                <div className="absolute right-4 top-4 md:right-6 md:top-6 w-16 md:w-20 h-16 md:h-20 bg-gray-50 rounded-3xl flex items-center justify-center opacity-50 group-hover:scale-110 transition-transform">
                  <Grid3x3 className="h-8 md:h-10 w-8 md:w-10 text-gray-200" />
                </div>
                <div className="relative z-10">
                  <div className="inline-flex items-center gap-1 bg-gray-100 text-gray-500 text-[9px] font-black tracking-[0.2em] uppercase px-3 py-1.5 rounded-full mb-3 md:mb-4">
                    Targeted Training
                  </div>
                  <h3 className="text-gray-900 font-black text-xl md:text-3xl leading-tight mb-5 md:mb-8">
                    Subject-Wise<br />Deep Dive
                  </h3>
                  <button className="flex items-center gap-2 border-2 border-[#4A90E2] text-[#4A90E2] font-black text-xs md:text-sm px-4 md:px-7 py-2 md:py-3 rounded-xl md:rounded-2xl hover:bg-blue-50 transition-colors">
                    Browse Subjects
                    <LayoutGrid className="h-4 w-4 md:h-5 md:w-5" />
                  </button>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* FOCUS ON WEAK AREAS */}
        <div ref={weakRef}>
          <div className="flex items-start justify-between mb-3 md:mb-4">
            <h2 className="text-lg md:text-2xl font-black text-gray-900">Focus on Weak Areas</h2>
            <div className="flex items-center gap-1 bg-red-50 border border-red-100 text-red-500 text-[9px] font-black tracking-wide uppercase px-3 py-1.5 rounded-full shrink-0">
              <AlertCircle className="h-3 w-3" />
              Attention Required
            </div>
          </div>

          {weakSubjects.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-[2rem] border border-gray-100">
              <BookCheck className="h-12 w-12 text-gray-200 mx-auto mb-4" />
              <p className="text-sm text-gray-400 font-medium">Complete some tests to see your weak areas</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {weakSubjects.map(({ subject, accuracy: acc }) => (
                <WeakSubjectCard
                  key={subject.$id}
                  subject={subject}
                  accuracy={acc}
                  onAttempt={(e) => {
                    e.stopPropagation()
                    track('weak_area_clicked', { subject_name: subject.Name, accuracy: acc })
                    setWeakPracticeSubject({ subject, accuracy: acc })
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* MY TESTS QUICK LINK */}
        <div ref={testsRef}>
        <Link href="/tests">
          <div className="flex items-center justify-between bg-white rounded-[1.5rem] md:rounded-[2rem] px-4 md:px-8 py-4 md:py-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
            <div className="flex items-center gap-3 md:gap-5">
              <div className="w-10 md:w-14 h-10 md:h-14 bg-[#4A90E2]/10 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0">
                <ClipboardList className="h-5 md:h-7 w-5 md:w-7 text-[#4A90E2]" />
              </div>
              <div>
                <p className="text-sm md:text-lg font-black text-gray-900">My Test History</p>
                <p className="text-xs md:text-sm text-gray-400">View all sessions & deep analytics</p>
              </div>
            </div>
            <ChevronRight className="h-5 md:h-6 w-5 md:w-6 text-gray-300 group-hover:text-[#4A90E2] group-hover:translate-x-1 transition-all" />
          </div>
        </Link>
        </div>

      </div>

      <WeakSubjectModal
        subject={weakPracticeSubject?.subject ?? null}
        accuracy={weakPracticeSubject?.accuracy ?? 0}
        onClose={() => setWeakPracticeSubject(null)}
      />
    </div>
  )
}
