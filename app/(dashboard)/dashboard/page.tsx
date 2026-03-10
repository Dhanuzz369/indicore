'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/appwrite/auth'
import { getProfile, getUserStats, getSubjects } from '@/lib/appwrite/queries'
import { Skeleton } from '@/components/ui/skeleton'
import { Flame, Target, BookCheck, CheckCircle, ChevronRight, TrendingUp, AlertCircle } from 'lucide-react'
import type { Profile, UserStats, Subject } from '@/types'
import Link from 'next/link'

function getEmoji(name?: string) {
  if (!name) return '📚'
  const l = name.toLowerCase()
  if (l.includes('geo')) return '🌍'
  if (l.includes('polity') || l.includes('governance')) return '⚖️'
  if (l.includes('hist')) return '🏛️'
  if (l.includes('econ')) return '📈'
  if (l.includes('environ')) return '🌿'
  if (l.includes('science') || l.includes('tech')) return '🔬'
  if (l.includes('art') || l.includes('cult')) return '🎨'
  if (l.includes('intern') || l.includes('relation')) return '🌐'
  return '📚'
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

const FEATURE_CARDS = [
  {
    id: 'full-test',
    title: 'FULL LENGTH TEST',
    subtitle: 'Practice like it\'s Prelims day.',
    emoji: '📝',
    bg: 'from-indigo-600 to-indigo-800',
    href: '/quiz',
    badge: 'UPSC • TNPSC',
    fullWidth: true,
  },
  {
    id: 'subject',
    title: 'SUBJECT PRACTICE',
    subtitle: 'UPSC subject-wise PYQs',
    emoji: '⚖️',
    bg: 'from-orange-500 to-orange-700',
    href: '/quiz?tab=subject',
    badge: 'Topic-wise',
    fullWidth: false,
  },
  {
    id: 'results',
    title: 'MY RESULTS',
    subtitle: 'View your progress & scores',
    emoji: '📊',
    bg: 'from-emerald-500 to-emerald-700',
    href: '/results',
    badge: 'Analytics',
    fullWidth: false,
  },
]

export default function DashboardPage() {
  const router = useRouter()
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
      if (!user) throw new Error('User not found')
      const [profileData, statsData, subjectsData] = await Promise.all([
        getProfile(user.$id),
        getUserStats(user.$id),
        getSubjects(),
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

  const firstName = profile?.full_name?.split(' ')[0] || 'there'
  const accuracy = stats && stats.total_attempted > 0
    ? Math.round((stats.total_correct / stats.total_attempted) * 100)
    : 0

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Skeleton className="h-52 w-full rounded-none" />
        <div className="p-4 space-y-4 mt-4">
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}
          </div>
          <Skeleton className="h-36 rounded-2xl" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-36 rounded-2xl" />
            <Skeleton className="h-36 rounded-2xl" />
          </div>
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
          <button onClick={fetchData} className="px-4 py-2 bg-[#FF6B00] text-white rounded-lg text-sm font-medium">
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Hero Banner (dark gradient, like reference) ── */}
      <div className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-5 pt-6 pb-10 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-[#FF6B00]/20 rounded-full blur-3xl" />
          <div className="absolute top-20 -left-8 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl" />
        </div>

        {/* Greeting */}
        <div className="relative z-10">
          <p className="text-gray-400 text-sm font-medium">{getGreeting()} 👋</p>
          <h1 className="text-white text-2xl font-bold mt-1 mb-1">
            {firstName}!
          </h1>
          {profile?.target_exam && (
            <div className="inline-flex items-center gap-1.5 bg-[#FF6B00]/20 border border-[#FF6B00]/30 px-3 py-1 rounded-full mt-1">
              <Target className="h-3 w-3 text-[#FF6B00]" />
              <span className="text-[#FF6B00] text-xs font-semibold">
                Target: {profile.target_exam} {profile.target_year}
              </span>
            </div>
          )}
        </div>

        {/* Stat pills */}
        <div className="relative z-10 flex gap-4 mt-5">
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-2 rounded-xl">
            <Flame className="h-4 w-4 text-orange-400" />
            <div>
              <p className="text-white font-bold text-base leading-none">{stats?.streak_days ?? 0}</p>
              <p className="text-gray-400 text-[10px]">Day Streak</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-2 rounded-xl">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            <div>
              <p className="text-white font-bold text-base leading-none">{accuracy}%</p>
              <p className="text-gray-400 text-[10px]">Accuracy</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-2 rounded-xl">
            <BookCheck className="h-4 w-4 text-blue-400" />
            <div>
              <p className="text-white font-bold text-base leading-none">{stats?.total_attempted ?? 0}</p>
              <p className="text-gray-400 text-[10px]">Attempted</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Content Section pulled up over the hero ── */}
      <div className="relative -mt-4 px-4 space-y-5 pb-6">

        {/* Quick stats row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{stats?.total_correct ?? 0}</p>
              <p className="text-xs text-gray-500">Correct</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
              <Target className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{stats?.total_wrong ?? 0}</p>
              <p className="text-xs text-gray-500">Incorrect</p>
            </div>
          </div>
        </div>

        {/* Core Practice Section */}
        <div>
          <h2 className="text-gray-900 font-bold text-base mb-3">Core Practice</h2>

          <div className="space-y-3">
            {/* Full Length Test - wide card */}
            <Link href="/quiz">
              <div className="relative bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-2xl p-5 overflow-hidden shadow-sm">
                <div className="absolute -right-4 -bottom-4 text-7xl opacity-20">📝</div>
                <div className="relative z-10">
                  <div className="inline-block bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full mb-2">
                    UPSC • TNPSC
                  </div>
                  <h3 className="text-white font-bold text-lg leading-tight">FULL LENGTH TEST</h3>
                  <p className="text-indigo-200 text-sm mt-0.5">Practice like it&apos;s Prelims day.</p>
                  <div className="flex items-center gap-1 text-white/80 text-xs mt-3">
                    <span>Start now</span>
                    <ChevronRight className="h-3 w-3" />
                  </div>
                </div>
              </div>
            </Link>

            {/* Two smaller cards */}
            <div className="grid grid-cols-2 gap-3">
              <Link href="/quiz?tab=subject">
                <div className="relative bg-gradient-to-br from-orange-500 to-orange-700 rounded-2xl p-4 overflow-hidden shadow-sm h-full">
                  <div className="absolute -right-3 -bottom-3 text-5xl opacity-20">⚖️</div>
                  <div className="relative z-10 flex flex-col h-full">
                    <div className="inline-block bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full mb-2 w-fit">
                      Topic-wise
                    </div>
                    <h3 className="text-white font-bold text-sm leading-tight">SUBJECT PRACTICE</h3>
                    <p className="text-orange-100 text-xs mt-1 flex-1">UPSC subject-wise PYQs</p>
                    <div className="flex items-center gap-0.5 text-white/80 text-xs mt-2">
                      <span>Explore</span>
                      <ChevronRight className="h-3 w-3" />
                    </div>
                  </div>
                </div>
              </Link>

              <Link href="/results">
                <div className="relative bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl p-4 overflow-hidden shadow-sm h-full">
                  <div className="absolute -right-3 -bottom-3 text-5xl opacity-20">📊</div>
                  <div className="relative z-10 flex flex-col h-full">
                    <div className="inline-block bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full mb-2 w-fit">
                      Analytics
                    </div>
                    <h3 className="text-white font-bold text-sm leading-tight">MY RESULTS</h3>
                    <p className="text-emerald-100 text-xs mt-1 flex-1">View progress & scores</p>
                    <div className="flex items-center gap-0.5 text-white/80 text-xs mt-2">
                      <span>View</span>
                      <ChevronRight className="h-3 w-3" />
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Practice by Subject */}
        {subjects.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-gray-900 font-bold text-base">Practice by Subject</h2>
              <Link href="/quiz?tab=subject" className="text-[#FF6B00] text-xs font-medium flex items-center gap-0.5">
                See all <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {subjects.map(subj => (
                <Link key={subj.$id} href={`/quiz?tab=subject&subject=${subj.slug}`}>
                  <div
                    className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer border-l-4"
                    style={{ borderLeftColor: subj.color || '#FF6B00' }}
                  >
                    <div className="text-2xl mb-2">{getEmoji(subj.Name)}</div>
                    <h3 className="font-semibold text-sm text-gray-900 leading-tight">{subj.Name}</h3>
                    <div className="flex items-center gap-0.5 text-[#FF6B00] text-xs font-medium mt-2">
                      <span>Practice</span>
                      <ChevronRight className="h-3 w-3" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
