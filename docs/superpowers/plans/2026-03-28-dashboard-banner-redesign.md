# Dashboard Banner Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 5 stat cards on the dashboard with a 3-slide auto-advancing product offerings carousel, and move the streak count inline with the greeting header.

**Architecture:** Single-file change to `app/(dashboard)/dashboard/page.tsx`. An inline `OfferingsCarousel` component handles slide state with `useState` + `useEffect` `setInterval`. The `getUserStats` fetch is removed since stats are no longer displayed; only `streak_days` is needed, pulled from the stats fetch which is also removed (streak shown from profile or a minimal stats fetch — see Task 1 note).

**Tech Stack:** Next.js 15 App Router, React 19, Tailwind CSS v4, Lucide React, no new dependencies

---

### Task 1: Add `OfferingsCarousel` component and remove stat cards

**Files:**
- Modify: `app/(dashboard)/dashboard/page.tsx`

This task:
1. Adds the `OfferingsCarousel` inline component at the top of the file (above `WeakSubjectCard`)
2. Removes the 5 stat cards from the JSX
3. Inserts `<OfferingsCarousel />` in their place
4. Moves streak inline with the greeting
5. Cleans up dead imports and state

---

- [ ] **Step 1: Read the current file to confirm exact content before editing**

Read `app/(dashboard)/dashboard/page.tsx` lines 1–20 to confirm current imports.

- [ ] **Step 2: Replace the entire file with the new implementation**

Write the following complete file to `app/(dashboard)/dashboard/page.tsx`:

```tsx
'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/supabase/auth'
import { getProfile, getUserStats, getSubjectsWithCounts } from '@/lib/supabase/queries'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Flame, ChevronRight, AlertCircle, Grid3x3, ArrowRight,
  LayoutGrid, ChevronDown, ClipboardList, BookCheck
} from 'lucide-react'
import type { Profile, UserStats, Subject } from '@/types'
import Link from 'next/link'

// ─── Helpers ──────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning,'
  if (h < 17) return 'Good afternoon,'
  return 'Good evening,'
}

function getSubjectEmoji(name?: string) {
  if (!name) return '📚'
  const l = name.toLowerCase()
  if (l.includes('geo')) return '🌍'
  if (l.includes('polity') || l.includes('govern')) return '⚖️'
  if (l.includes('hist') || l.includes('ancient') || l.includes('modern')) return '🏛️'
  if (l.includes('econ')) return '📈'
  if (l.includes('environ')) return '🌿'
  if (l.includes('science') || l.includes('tech')) return '🔬'
  if (l.includes('art') || l.includes('cult')) return '🎨'
  if (l.includes('intern') || l.includes('relat')) return '🌐'
  if (l.includes('ethics') || l.includes('integ')) return '🧭'
  return '📚'
}

function getSubjectBgColor(name?: string, color?: string) {
  if (color) return color
  if (!name) return '#4A90E2'
  const l = name.toLowerCase()
  if (l.includes('geo')) return '#1a9c72'
  if (l.includes('hist')) return '#7c3aed'
  if (l.includes('polity')) return '#1d4ed8'
  if (l.includes('econ')) return '#0891b2'
  if (l.includes('environ')) return '#16a34a'
  if (l.includes('science')) return '#9333ea'
  if (l.includes('art')) return '#d97706'
  return '#4A90E2'
}

function getPerformanceLabel(accuracy: number) {
  if (accuracy >= 70) return { label: 'Improving', color: 'text-emerald-600', dot: 'bg-emerald-500', trend: 'up' }
  if (accuracy >= 55) return { label: 'Medium', color: 'text-amber-600', dot: 'bg-amber-400', trend: 'flat' }
  return { label: 'Low', color: 'text-red-500', dot: 'bg-red-500', trend: 'down' }
}

// ─── Offerings Carousel ────────────────────────────────────────────

const SLIDES = [
  {
    bg: '#4A90E2',
    badge: 'MOCK TESTS',
    headline: 'Full-Length Mocks',
    tagline: 'Test yourself against real exam patterns',
    cta: 'Start Mock',
    href: '/quiz',
  },
  {
    bg: '#6366f1',
    badge: 'ANALYTICS',
    headline: 'Deep Analytics',
    tagline: 'See where you stand, know what to fix',
    cta: 'View Analytics',
    href: '/intelligence',
  },
  {
    bg: '#10b981',
    badge: 'SMART NOTES',
    headline: 'Smart Notes',
    tagline: 'Structured revision at your fingertips',
    cta: 'Open Notes',
    href: '/notes',
  },
]

function OfferingsCarousel() {
  const router = useRouter()
  const [current, setCurrent] = useState(0)
  const pausedRef = useRef(false)

  useEffect(() => {
    const id = setInterval(() => {
      if (!pausedRef.current) {
        setCurrent(c => (c + 1) % SLIDES.length)
      }
    }, 4000)
    return () => clearInterval(id)
  }, [])

  return (
    <div
      className="relative h-52 rounded-[2rem] overflow-hidden"
      onMouseEnter={() => { pausedRef.current = true }}
      onMouseLeave={() => { pausedRef.current = false }}
    >
      {/* Slide track */}
      <div
        className="flex h-full"
        style={{
          width: `${SLIDES.length * 100}%`,
          transform: `translateX(-${(current * 100) / SLIDES.length}%)`,
          transition: 'transform 500ms ease-in-out',
        }}
      >
        {SLIDES.map((slide, i) => (
          <div
            key={i}
            className="relative flex flex-col justify-between p-8 h-full"
            style={{ width: `${100 / SLIDES.length}%`, backgroundColor: slide.bg }}
          >
            {/* Decorative circles */}
            <div className="absolute -right-8 -top-8 w-48 h-48 bg-white/10 rounded-full pointer-events-none" />
            <div className="absolute -right-2 top-10 w-32 h-32 bg-white/10 rounded-full pointer-events-none" />

            <div className="relative z-10">
              {/* Badge */}
              <div className="inline-flex items-center bg-white/20 text-white text-[9px] font-black tracking-[0.2em] uppercase px-3 py-1.5 rounded-full mb-3">
                {slide.badge}
              </div>
              {/* Headline */}
              <h3 className="text-white font-black text-3xl leading-tight mb-1">{slide.headline}</h3>
              {/* Tagline */}
              <p className="text-white/70 text-sm font-semibold">{slide.tagline}</p>
            </div>

            {/* CTA */}
            <div className="relative z-10">
              <button
                onClick={() => router.push(slide.href)}
                className="flex items-center gap-2 bg-white font-black text-sm px-6 py-2.5 rounded-2xl hover:opacity-90 transition-opacity shadow-sm"
                style={{ color: slide.bg }}
              >
                {slide.cta}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Dot indicators */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className="rounded-full bg-white transition-all duration-300"
            style={{
              width: i === current ? '20px' : '8px',
              height: '8px',
              opacity: i === current ? 1 : 0.4,
            }}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Weak Area Subject Card ────────────────────────────────────────
function WeakSubjectCard({ subject, accuracy }: { subject: Subject; accuracy: number }) {
  const [open, setOpen] = useState(false)
  const perf = getPerformanceLabel(accuracy)
  const bgColor = getSubjectBgColor(subject.Name, subject.color)
  const emoji = getSubjectEmoji(subject.Name)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-gray-50/60 transition-colors"
      >
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0 shadow-sm"
          style={{ backgroundColor: bgColor + '18', border: `1.5px solid ${bgColor}30` }}
        >
          {emoji}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 text-sm leading-tight">{subject.Name}</h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-xs text-gray-500">Performance:</span>
            <span className={`text-xs font-bold ${perf.color}`}>{accuracy}%</span>
            <span
              className={`text-[10px] font-semibold ${perf.color} px-1.5 py-0.5 rounded-full`}
              style={{ backgroundColor: perf.dot.replace('bg-', '') + '15' }}
            >
              ({perf.label})
            </span>
          </div>
        </div>

        <ChevronDown className={`h-4 w-4 text-gray-400 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Accuracy bar */}
      <div className="px-4 pb-1">
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${accuracy}%`,
              backgroundColor: accuracy >= 70 ? '#16a34a' : accuracy >= 55 ? '#d97706' : '#ef4444',
            }}
          />
        </div>
      </div>

      {/* Subtopics */}
      {open && (
        <div className="border-t border-gray-50 pb-2 animate-in fade-in slide-in-from-top-1 duration-200">
          {['Ancient Period', 'Medieval Era', 'Modern History', 'Post-Independence'].map((sub, i) => (
            <Link
              key={i}
              href={`/quiz?tab=subject&subject=${subject.slug}`}
              className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-sm shrink-0">
                  {getSubjectEmoji(sub)}
                </div>
                <span className="text-xs font-medium text-gray-700">{sub}</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-[#4A90E2] transition-colors" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Dashboard ────────────────────────────────────────────────
export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState<UserStats | null>(null)
  const [subjects, setSubjects] = useState<Subject[]>([])

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

      const [profileData, statsData, subjectsData] = await Promise.all([
        getProfile(user.$id),
        getUserStats(user.$id),
        subjectsPromise,
      ])
      setProfile(profileData as unknown as Profile)
      setStats(statsData as unknown as UserStats)
      setSubjects(subjectsData.documents as unknown as Subject[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const firstName = profile?.full_name?.split(' ')[0] || 'Aspirant'
  const streakDays = stats?.streak_days ?? 0

  const weakSubjects = subjects.slice(0, 4).map((s, i) => ({
    subject: s,
    accuracy: [42, 58, 81, 65][i % 4] ?? 50,
  }))

  // ── Loading skeleton ──
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

  // ── Error state ──
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
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 pt-10 pb-8">
          <p className="text-[11px] font-black tracking-[0.25em] text-gray-400 uppercase mb-2">Overview</p>
          <div className="flex items-end gap-3 flex-wrap">
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 leading-tight tracking-tight">
              {getGreeting()}<br />
              <span className="text-[#4A90E2]">{firstName}!</span>
            </h1>
            {/* Streak badge inline */}
            <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 text-blue-700 px-3 py-1.5 rounded-full mb-1">
              <Flame className="h-3.5 w-3.5 text-blue-500" />
              <span className="text-xs font-black">
                {streakDays > 0 ? `${streakDays} day streak` : 'Start your streak'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-8">

        {/* OFFERINGS CAROUSEL */}
        <OfferingsCarousel />

        {/* CORE PRACTICE */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-black text-gray-900">Core Practice</h2>
            <Link href="/quiz" className="text-[10px] font-black tracking-widest uppercase text-[#4A90E2] flex items-center gap-1 hover:translate-x-1 transition-transform">
              VIEW LIBRARY <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* FULL LENGTH MOCK TEST */}
            <Link href="/quiz">
              <div className="h-full relative bg-[#4A90E2] rounded-[2rem] p-8 overflow-hidden shadow-lg shadow-blue-100 group transition-all hover:-translate-y-1">
                <div className="absolute -right-8 -top-8 w-48 h-48 bg-white/10 rounded-full" />
                <div className="absolute -right-2 top-10 w-32 h-32 bg-white/10 rounded-full" />
                <div className="relative z-10">
                  <div className="inline-flex items-center gap-1 bg-white/20 text-white text-[9px] font-black tracking-[0.2em] uppercase px-3 py-1.5 rounded-full mb-4">
                    Marathon Session
                  </div>
                  <h3 className="text-white font-black text-3xl leading-tight mb-8">
                    Full Length<br />Mock Test
                  </h3>
                  <button className="flex items-center gap-2 bg-white text-[#4A90E2] font-black text-sm px-7 py-3.5 rounded-2xl hover:bg-blue-50 transition-colors shadow-sm">
                    Start Session
                    <ArrowRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </Link>

            {/* SUBJECT-WISE DEEP DIVE */}
            <Link href="/quiz?tab=subject">
              <div className="h-full relative bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm overflow-hidden group transition-all hover:-translate-y-1 hover:shadow-md">
                <div className="absolute right-6 top-6 w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center text-3xl opacity-50 group-hover:scale-110 transition-transform">
                  <Grid3x3 className="h-10 w-10 text-gray-200" />
                </div>
                <div className="relative z-10">
                  <div className="inline-flex items-center gap-1 bg-gray-100 text-gray-500 text-[9px] font-black tracking-[0.2em] uppercase px-3 py-1.5 rounded-full mb-4">
                    Targeted Training
                  </div>
                  <h3 className="text-gray-900 font-black text-3xl leading-tight mb-8">
                    Subject-Wise<br />Deep Dive
                  </h3>
                  <button className="flex items-center gap-2 border-2 border-[#4A90E2] text-[#4A90E2] font-black text-sm px-7 py-3 rounded-2xl hover:bg-blue-50 transition-colors">
                    Browse Subjects
                    <LayoutGrid className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* FOCUS ON WEAK AREAS */}
        <div>
          <div className="flex items-start justify-between mb-4">
            <h2 className="text-2xl font-black text-gray-900">Focus on Weak Areas</h2>
            <div className="flex items-center gap-1 bg-red-50 border border-red-100 text-red-500 text-[9px] font-black tracking-wide uppercase px-3 py-1.5 rounded-full shrink-0">
              <AlertCircle className="h-3 w-3" />
              Attention Required
            </div>
          </div>

          {subjects.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-[2rem] border border-gray-100">
              <BookCheck className="h-12 w-12 text-gray-200 mx-auto mb-4" />
              <p className="text-sm text-gray-400 font-medium">Complete some tests to see weak areas</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {weakSubjects.map(({ subject, accuracy: acc }) => (
                <WeakSubjectCard key={subject.$id} subject={subject} accuracy={acc} />
              ))}
            </div>
          )}
        </div>

        {/* MY TESTS QUICK LINK */}
        <Link href="/tests">
          <div className="flex items-center justify-between bg-white rounded-[2rem] px-8 py-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-[#4A90E2]/10 rounded-2xl flex items-center justify-center">
                <ClipboardList className="h-7 w-7 text-[#4A90E2]" />
              </div>
              <div>
                <p className="text-lg font-black text-gray-900">My Test History</p>
                <p className="text-sm text-gray-400">View all sessions & deep analytics</p>
              </div>
            </div>
            <ChevronRight className="h-6 w-6 text-gray-300 group-hover:text-[#4A90E2] group-hover:translate-x-1 transition-all" />
          </div>
        </Link>

      </div>
    </div>
  )
}
```

- [ ] **Step 3: Run TypeScript check**

```bash
export PATH="$PATH:/opt/homebrew/bin"
npx tsc --noEmit 2>&1 | grep "dashboard/page" | head -20
```

Expected output: no lines (zero errors). If errors appear, fix them before continuing.

- [ ] **Step 4: Commit**

```bash
git add "app/(dashboard)/dashboard/page.tsx"
git commit -m "feat(dashboard): replace stat cards with product offerings carousel

Remove accuracy, attempted, correct, incorrect stat cards.
Move streak inline with greeting as a pill badge.
Add 3-slide auto-advancing carousel showcasing Mock Tests,
Analytics, and Notes with CTA buttons and dot indicators.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```
