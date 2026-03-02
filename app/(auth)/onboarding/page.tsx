'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, setSessionCookie } from '@/lib/appwrite/auth'
import { createProfile, createUserStats, getProfile, updateProfile } from '@/lib/appwrite/queries'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, Trophy, ArrowRight } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────
// EXAM OPTIONS
// ─────────────────────────────────────────────────────────────────
const EXAM_OPTIONS = [
  { value: 'UPSC', label: 'UPSC' },
  { value: 'TNPSC', label: 'TNPSC' },
  { value: 'KPSC', label: 'KPSC' },
  { value: 'MPPSC', label: 'MPPSC' },
  { value: 'UPPSC', label: 'UPPSC' },
  { value: 'OTHER', label: 'Other' },
]

const TARGET_YEARS = [2025, 2026, 2027, 2028]

export default function OnboardingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [selectedExam, setSelectedExam] = useState<string>('')
  const [selectedYear, setSelectedYear] = useState<number | null>(null)

  // ─────────────────────────────────────────────────────────────────
  // ON MOUNT: Verify Appwrite session & set our indicore_session cookie
  // ─────────────────────────────────────────────────────────────────
  // After Google OAuth, Appwrite redirects here with a valid session,
  // but our indicore_session cookie doesn't exist yet. We set it now
  // so subsequent navigation to /dashboard passes proxy.ts auth check.
  useEffect(() => {
    const bootstrap = async () => {
      const user = await getCurrentUser()
      if (!user) {
        // No valid Appwrite session at all — send to login
        router.push('/login')
        return
      }
      // Valid Appwrite session confirmed — stamp our cookie immediately
      setSessionCookie()
    }
    bootstrap()
  }, [router])

  // Check if form is complete
  const isFormComplete = selectedExam && selectedYear

  // ─────────────────────────────────────────────────────────────────
  // SUBMIT HANDLER
  // ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!isFormComplete) return

    setLoading(true)

    try {
      // Get current user (Google OAuth user will be authenticated here)
      const user = await getCurrentUser()

      // Set our indicore_session cookie so proxy.ts can detect the authenticated state.
      // For Google OAuth users this is the first time the session cookie is set.
      // For email/password users it's already set but this is harmless.
      setSessionCookie()

      if (!user) {
        toast.error('Session expired. Please login again.')
        router.push('/login')
        return
      }

      // ─────────────────────────────────────────────────────────────
      // UPSERT PROFILE
      // For Google OAuth users, no profile exists yet. We try to fetch
      // the profile first; if it doesn't exist, we create one, then update.
      // For email/password users who came here from signup, profile exists.
      // ─────────────────────────────────────────────────────────────
      let profileExists = false
      try {
        await getProfile(user.$id)
        profileExists = true
      } catch {
        // Profile doesn't exist (this is a new Google OAuth user)
        profileExists = false
      }

      if (!profileExists) {
        // Create profile for Google OAuth users
        // Appwrite stores the user's name from their Google account in user.name
        await createProfile(user.$id, user.name || 'User')

        // Also create user stats for Google OAuth users
        try {
          await createUserStats(user.$id)
        } catch {
          // Stats might already exist in rare cases, ignore
        }
      }

      // Now update the profile with target exam and year
      await updateProfile(user.$id, {
        target_exam: selectedExam,
        target_year: selectedYear,
      })

      toast.success('Profile setup complete!')
      router.push('/dashboard')
    } catch (error) {
      console.error('Onboarding error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update profile')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-white">
      <Card className="w-full max-w-lg shadow-lg">
        {/* ─────────────────────────────────────────────────────────────
            HEADER
            ───────────────────────────────────────────────────────────── */}
        <CardHeader className="text-center space-y-4 pb-6">
          <div className="flex justify-center">
            <div className="flex items-center gap-2">
              <Trophy className="h-8 w-8 text-[#FF6B00]" />
              <span className="text-2xl font-bold text-[#FF6B00]">Indicore</span>
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Set up your profile</CardTitle>
            <CardDescription className="text-base mt-2">
              Personalise your experience
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-8">
          {/* ─────────────────────────────────────────────────────────────
              SECTION 1: TARGET EXAM
              ───────────────────────────────────────────────────────────── */}
          <div className="space-y-3">
            <label className="text-sm font-medium">
              Which exam are you preparing for?
            </label>

            <div className="grid grid-cols-2 gap-3">
              {EXAM_OPTIONS.map((exam) => {
                const isSelected = selectedExam === exam.value

                return (
                  <button
                    key={exam.value}
                    onClick={() => setSelectedExam(exam.value)}
                    disabled={loading}
                    className={`
                      p-4 rounded-lg border-2 transition-all text-center font-medium
                      ${isSelected
                        ? 'border-[#FF6B00] bg-[#FFF3EC] text-[#FF6B00]'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }
                      ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    {exam.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              SECTION 2: TARGET YEAR
              ───────────────────────────────────────────────────────────── */}
          <div className="space-y-3">
            <label className="text-sm font-medium">
              What is your target year?
            </label>

            <div className="flex flex-wrap gap-3">
              {TARGET_YEARS.map((year) => {
                const isSelected = selectedYear === year

                return (
                  <button
                    key={year}
                    onClick={() => setSelectedYear(year)}
                    disabled={loading}
                    className={`
                      px-6 py-2.5 rounded-full font-medium transition-all
                      ${isSelected
                        ? 'bg-[#FF6B00] text-white'
                        : 'border border-gray-200 hover:border-[#FF6B00] text-gray-700'
                      }
                      ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    {year}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              SUBMIT BUTTON
              ───────────────────────────────────────────────────────────── */}
          <div className="pt-4">
            <Button
              onClick={handleSubmit}
              disabled={!isFormComplete || loading}
              className="w-full bg-[#FF6B00] hover:bg-[#FF8C00]"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Setting up...
                </>
              ) : (
                <>
                  Start Practising
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>

            {/* Helper text when form is incomplete */}
            {!isFormComplete && !loading && (
              <p className="text-center text-sm text-muted-foreground mt-3">
                {!selectedExam ? 'Please select your target exam' : 'Please select your target year'}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
