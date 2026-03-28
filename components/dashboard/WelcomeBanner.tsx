'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { Profile, UserStats } from '@/types'

interface WelcomeBannerProps {
  profile: Profile | null
  stats: UserStats | null
}

export function WelcomeBanner({ profile, stats }: WelcomeBannerProps) {
  const router = useRouter()

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  // Get first name from full name
  const firstName = profile?.full_name?.split(' ')[0] || 'there'

  // Calculate accuracy
  const accuracy = stats && stats.total_attempted > 0
    ? Math.round((stats.total_correct / stats.total_attempted) * 100)
    : 0

  return (
    <Card className="bg-gradient-to-r from-[#4A90E2] to-[#3a7fd4] text-white border-none shadow-lg">
      <div className="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold">
            {getGreeting()}, {firstName}!
          </h1>
          {profile?.target_exam && profile?.target_year && (
            <p className="text-white/90 text-sm md:text-base">
              Target: {profile.target_exam} {profile.target_year}
            </p>
          )}
          {stats && stats.total_attempted > 0 && (
            <p className="text-white/80 text-sm">
              Overall Accuracy: {accuracy}%
            </p>
          )}
        </div>

        <Button
          onClick={() => router.push('/quiz')}
          className="bg-white text-[#4A90E2] hover:bg-gray-50 font-semibold"
          size="lg"
        >
          Start Practice
        </Button>
      </div>
    </Card>
  )
}
