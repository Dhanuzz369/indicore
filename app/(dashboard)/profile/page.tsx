'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/appwrite/auth'
import { getProfile, updateProfile, getUserStats } from '@/lib/appwrite/queries'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { User, Edit2, Save, X, Target, Award, TrendingUp } from 'lucide-react'
import type { Profile, UserStats } from '@/types'

export default function ProfilePage() {
  const router = useRouter()

  // ─────────────────────────────────────────────────────────────────
  // STATE
  // ─────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [userId, setUserId] = useState<string>('')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState<UserStats | null>(null)

  // Form state
  const [fullName, setFullName] = useState('')
  const [targetExam, setTargetExam] = useState<string>('')
  const [targetYear, setTargetYear] = useState<string>('')

  // ─────────────────────────────────────────────────────────────────
  // FETCH DATA ON MOUNT
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      try {
        const user = await getCurrentUser()
        if (!user) {
          router.push('/login')
          return
        }

        setUserId(user.$id)

        // Fetch profile
        const profileData = await getProfile(user.$id)
        setProfile(profileData as unknown as Profile)
        setFullName(profileData.full_name || '')
        setTargetExam(profileData.target_exam || 'UPSC')
        setTargetYear(profileData.target_year?.toString() || '2026')

        // Fetch stats
        const statsData = await getUserStats(user.$id)
        setStats(statsData as unknown as UserStats)
      } catch (error) {
        toast.error('Failed to load profile')
        console.error(error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router])

  // ─────────────────────────────────────────────────────────────────
  // HANDLE SAVE
  // ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    try {
      await updateProfile(userId, {
        full_name: fullName,
        target_exam: targetExam as any,
        target_year: parseInt(targetYear),
      })

      // Refresh profile
      const updatedProfile = await getProfile(userId)
      setProfile(updatedProfile as unknown as Profile)

      toast.success('Profile updated!')
      setIsEditing(false)
    } catch (error) {
      toast.error('Failed to update profile')
      console.error(error)
    }
  }

  const handleCancel = () => {
    // Reset form to current profile values
    setFullName(profile?.full_name || '')
    setTargetExam(profile?.target_exam || 'UPSC')
    setTargetYear(profile?.target_year?.toString() || '2026')
    setIsEditing(false)
  }

  // ─────────────────────────────────────────────────────────────────
  // LOADING STATE
  // ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-6 space-y-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    )
  }

  // Calculate accuracy
  const accuracy =
    stats && stats.total_attempted > 0
      ? Math.round((stats.total_correct / stats.total_attempted) * 100)
      : 0

  // Get initials
  const initials = profile?.full_name
    ? profile.full_name
        .split(' ')
        .slice(0, 2)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : 'U'

  // ─────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-6 space-y-6">
        {/* SECTION 1: Profile Card */}
        <Card>
          <CardContent className="p-8">
            <div className="flex flex-col items-center text-center space-y-4">
              {/* Avatar */}
              <div className="h-20 w-20 rounded-full bg-[#FF6B00] flex items-center justify-center text-white text-2xl font-bold">
                {initials}
              </div>

              {/* Name */}
              <h1 className="text-2xl font-bold">{profile?.full_name || 'User'}</h1>

              {/* Target Exam + Year Badge */}
              {profile?.target_exam && profile?.target_year && (
                <Badge className="bg-[#FF6B00] hover:bg-[#FF8C00] text-white">
                  <Target className="h-3 w-3 mr-1" />
                  {profile.target_exam} {profile.target_year}
                </Badge>
              )}

              {/* Edit Profile Button */}
              {!isEditing && (
                <Button
                  onClick={() => setIsEditing(true)}
                  variant="outline"
                  className="mt-4"
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* SECTION 2: Edit Form */}
        {isEditing && (
          <Card>
            <CardHeader>
              <CardTitle>Edit Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                />
              </div>

              {/* Target Exam */}
              <div className="space-y-2">
                <Label htmlFor="targetExam">Target Exam</Label>
                <Select value={targetExam} onValueChange={setTargetExam}>
                  <SelectTrigger id="targetExam">
                    <SelectValue placeholder="Select exam" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UPSC">UPSC</SelectItem>
                    <SelectItem value="TNPSC">TNPSC</SelectItem>
                    <SelectItem value="KPSC">KPSC</SelectItem>
                    <SelectItem value="MPPSC">MPPSC</SelectItem>
                    <SelectItem value="UPPSC">UPPSC</SelectItem>
                    <SelectItem value="OTHER">OTHER</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Target Year */}
              <div className="space-y-2">
                <Label htmlFor="targetYear">Target Year</Label>
                <Select value={targetYear} onValueChange={setTargetYear}>
                  <SelectTrigger id="targetYear">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="2026">2026</SelectItem>
                    <SelectItem value="2027">2027</SelectItem>
                    <SelectItem value="2028">2028</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleSave}
                  className="flex-1 bg-[#FF6B00] hover:bg-[#FF8C00]"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
                <Button onClick={handleCancel} variant="outline" className="flex-1">
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* SECTION 3: Stats Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[#FF6B00]" />
              Your Statistics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-3xl font-bold text-blue-700">
                  {stats?.total_attempted || 0}
                </p>
                <p className="text-sm text-blue-600 mt-1">Total Attempted</p>
              </div>

              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-3xl font-bold text-green-700">
                  {stats?.total_correct || 0}
                </p>
                <p className="text-sm text-green-600 mt-1">Correct</p>
              </div>

              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-3xl font-bold text-red-700">
                  {stats?.total_wrong || 0}
                </p>
                <p className="text-sm text-red-600 mt-1">Wrong</p>
              </div>

              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-3xl font-bold text-purple-700">{accuracy}%</p>
                <p className="text-sm text-purple-600 mt-1">Accuracy</p>
              </div>
            </div>

            {/* Accuracy Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Overall Accuracy</span>
                <span className="text-muted-foreground">{accuracy}%</span>
              </div>
              <Progress value={accuracy} className="h-3" />
            </div>

            {/* Streak Badge */}
            {stats && stats.streak_days > 0 && (
              <div className="flex items-center justify-center gap-2 p-4 bg-orange-50 rounded-lg">
                <Award className="h-5 w-5 text-[#FF6B00]" />
                <span className="font-semibold text-[#FF6B00]">
                  {stats.streak_days} Day Streak! 🔥
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
