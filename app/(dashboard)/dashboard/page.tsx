'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { getCurrentUser } from '@/lib/appwrite/auth'
import { getProfile, getUserStats, getSubjects } from '@/lib/appwrite/queries'
import { WelcomeBanner } from '@/components/dashboard/WelcomeBanner'
import { StatsCard } from '@/components/dashboard/StatsCard'
import { SubjectGrid } from '@/components/dashboard/SubjectGrid'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { BookCheck, CheckCircle, Target, Flame, AlertCircle } from 'lucide-react'
import type { Profile, UserStats, Subject } from '@/types'

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState<UserStats | null>(null)
  const [subjects, setSubjects] = useState<Subject[]>([])

  // ─────────────────────────────────────────────────────────────────
  // FETCH DATA ON MOUNT
  // ─────────────────────────────────────────────────────────────────
  const fetchDashboardData = async () => {
    setLoading(true)
    setError(null)

    try {
      // Step 1: Get current user
      const user = await getCurrentUser()
      if (!user) throw new Error('User not found')

      // Step 2: Fetch profile, stats, and subjects in parallel
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

  useEffect(() => {
    fetchDashboardData()
  }, [])

  // ─────────────────────────────────────────────────────────────────
  // LOADING STATE
  // ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-32 w-full rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
        </div>
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────
  // ERROR STATE
  // ─────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <div>
            <h3 className="text-lg font-semibold">Failed to Load Dashboard</h3>
            <p className="text-muted-foreground mt-1">{error}</p>
          </div>
          <Button onClick={fetchDashboardData} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  // Calculate accuracy percentage
  const accuracyPercentage = stats
    ? Math.round((stats.total_correct / Math.max(stats.total_attempted, 1)) * 100) + '%'
    : '0%'

  // ─────────────────────────────────────────────────────────────────
  // DASHBOARD CONTENT
  // ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6">
      {/* Section 1: Welcome Banner */}
      <WelcomeBanner profile={profile} stats={stats} />

      {/* Section 2: Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Questions Attempted"
          value={stats?.total_attempted ?? 0}
          subtitle="Total questions"
          icon={BookCheck}
          color="text-blue-500"
        />
        <StatsCard
          title="Correct Answers"
          value={stats?.total_correct ?? 0}
          subtitle="Right answers"
          icon={CheckCircle}
          color="text-green-500"
        />
        <StatsCard
          title="Accuracy"
          value={accuracyPercentage}
          subtitle="Success rate"
          icon={Target}
          color="text-[#FF6B00]"
        />
        <StatsCard
          title="Day Streak"
          value={stats?.streak_days ?? 0}
          subtitle="Consecutive days"
          icon={Flame}
          color="text-orange-500"
        />
      </div>

      {/* Section 3: Practice by Subject */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Practice by Subject</h2>
        <SubjectGrid subjects={subjects} />
      </div>
    </div>
  )
}
