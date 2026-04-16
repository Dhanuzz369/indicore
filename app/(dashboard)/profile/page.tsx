'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, signOut, sendPasswordRecovery } from '@/lib/supabase/auth'
import {
  getProfile, createProfile, updateProfile, listTestSessions,
  uploadAvatar, getAvatarUrl, deleteAvatarFile,
} from '@/lib/supabase/queries'
import { STORAGE_BUCKET_ID } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
// Radix UI Select crashes on empty-string values — use a sentinel instead
const SELECT_NONE = '__none__'

import { toast } from 'sonner'
import {
  ChevronLeft, Settings, Pencil, Trophy, BarChart3,
  FileText, CheckCircle2, Target, ChevronRight,
  ShieldCheck, Bell, Crown, HelpCircle, LogOut,
  Camera, Loader2, X
} from 'lucide-react'
import Link from 'next/link'
import type { Profile, TestSession } from '@/types'

const TARGET_EXAMS = ['UPSC', 'TNPSC', 'KPSC', 'MPPSC', 'UPPSC', 'OTHER'] as const
const CURRENT_YEAR = new Date().getFullYear()
const TARGET_YEARS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR + i)

// ─── Mastery label based on avg accuracy ─────────────────────────────────────
function getMasteryLabel(avgAccuracy: number): { title: string; level: string } {
  if (avgAccuracy >= 80) return { title: 'Expert', level: 'Elite' }
  if (avgAccuracy >= 65) return { title: 'Scholar', level: 'Advanced' }
  if (avgAccuracy >= 50) return { title: 'Aspirant', level: 'Intermediate' }
  if (avgAccuracy >= 35) return { title: 'Learner', level: 'Developing' }
  return { title: 'Beginner', level: 'Foundation' }
}

export default function ProfilePage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string>('')
  const [userName, setUserName] = useState<string>('')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState({
    totalTests: 0,
    highestScore: 0,       // actual marks (not %)
    highestScoreMax: 0,    // max possible marks for that test
    avgAccuracy: 0,
    avgAttemptsPerTest: 0,
    totalAttempted: 0,
  })

  // Edit modal
  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editExam, setEditExam] = useState<string>('')
  const [editYear, setEditYear] = useState<string>('')
  const [saving, setSaving] = useState(false)

  // Avatar upload
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)

  // Avatar picker modal
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false)
  const [avatarPickerTab, setAvatarPickerTab] = useState<'male' | 'female'>('male')
  const [savingPresetAvatar, setSavingPresetAvatar] = useState(false)

  // Account security modal
  const [securityOpen, setSecurityOpen] = useState(false)
  const [securitySending, setSecuritySending] = useState(false)
  const [securitySent, setSecuritySent] = useState(false)

  // ─── Fetch data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      try {
        const user = await getCurrentUser()
        if (!user) { router.push('/login'); return }

        setUserId(user.$id)
        setUserName(user.name || '')

        let profileData: Profile
        let sessionsData: { documents: TestSession[] }

        try {
          const [p, s] = await Promise.all([
            getProfile(user.$id),
            listTestSessions({ userId: user.$id, mode: 'full_length', limit: 200 }),
          ])
          profileData = p as unknown as Profile
          sessionsData = s
        } catch (e: any) {
          if (e.code === 404) {
            const newProfile = await createProfile(user.$id, user.name || 'Aspirant')
            profileData = newProfile as unknown as Profile
            sessionsData = await listTestSessions({ userId: user.$id, mode: 'full_length', limit: 200 })
          } else {
            throw e
          }
        }

        setProfile(profileData)

        const fullLengthSessions = sessionsData.documents   // already filtered by mode at query level
        if (fullLengthSessions.length > 0) {
          const totalTests = fullLengthSessions.length
          const totalCorrect = fullLengthSessions.reduce((acc, s) => acc + (s.correct ?? 0), 0)
          const totalWrong = fullLengthSessions.reduce((acc, s) => acc + (s.incorrect ?? 0), 0)
          const totalAttempted = fullLengthSessions.reduce((acc, s) => acc + (s.attempted ?? 0), 0)
          const avgAccuracy = totalAttempted > 0
            ? Math.round((totalCorrect / totalAttempted) * 100)
            : 0
          const avgAttemptsPerTest = Math.round(totalAttempted / totalTests)

          // Actual UPSC marks per session: correct×2 − wrong×(2/3)
          let highestScore = 0
          let highestScoreMax = 0
          fullLengthSessions.forEach(s => {
            const marks = parseFloat(((s.correct ?? 0) * 2 - (s.incorrect ?? 0) * (2 / 3)).toFixed(2))
            const max = (s.total_questions ?? 0) * 2
            if (marks > highestScore) {
              highestScore = marks
              highestScoreMax = max
            }
          })

          setStats({ totalTests, highestScore, highestScoreMax, avgAccuracy, avgAttemptsPerTest, totalAttempted })
        }
      } catch (error) {
        toast.error('Failed to load profile')
        console.error(error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router])

  // ─── Open edit modal ─────────────────────────────────────────────────────────
  const openEditModal = () => {
    setEditName(profile?.full_name || userName)
    setEditExam(profile?.target_exam || SELECT_NONE)
    setEditYear(profile?.target_year ? String(profile.target_year) : SELECT_NONE)
    setEditOpen(true)
  }

  // ─── Save profile edits ──────────────────────────────────────────────────────
  const handleSaveProfile = async () => {
    if (!editName.trim()) { toast.error('Name cannot be empty'); return }
    setSaving(true)
    try {
      const updated = await updateProfile(userId, {
        full_name: editName.trim(),
        target_exam: editExam === SELECT_NONE ? null : editExam || null,
        target_year: editYear && editYear !== SELECT_NONE ? parseInt(editYear) : null,
      })
      setProfile(updated as unknown as Profile)
      setEditOpen(false)
      toast.success('Profile updated!')
    } catch (error) {
      toast.error('Failed to save profile')
      console.error(error)
    } finally {
      setSaving(false)
    }
  }

  // ─── Avatar upload ───────────────────────────────────────────────────────────
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!STORAGE_BUCKET_ID) {
      toast.error('Avatar storage not configured. Add NEXT_PUBLIC_APPWRITE_STORAGE_BUCKET_ID to your .env.local')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5 MB')
      return
    }

    setAvatarUploading(true)
    try {
      // Delete old avatar file if it exists (extract file ID from URL)
      if (profile?.avatar_url) {
        const oldFileId = extractFileIdFromUrl(profile.avatar_url)
        if (oldFileId) await deleteAvatarFile(oldFileId)
      }

      const fileId = await uploadAvatar(file)
      const avatarUrl = getAvatarUrl(fileId)

      const updated = await updateProfile(userId, { avatar_url: avatarUrl })
      setProfile(updated as unknown as Profile)
      toast.success('Avatar updated!')
    } catch (error) {
      toast.error('Failed to upload avatar')
      console.error(error)
    } finally {
      setAvatarUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ─── Sign out ────────────────────────────────────────────────────────────────
  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/login')
      toast.success('Signed out successfully')
    } catch {
      toast.error('Failed to sign out')
    }
  }

  // ─── Select preset avatar ────────────────────────────────────────────────────
  const handleSelectPresetAvatar = async (url: string) => {
    setSavingPresetAvatar(true)
    try {
      const updated = await updateProfile(userId, { avatar_url: url })
      setProfile(updated as unknown as Profile)
      setAvatarPickerOpen(false)
      toast.success('Avatar updated!')
    } catch {
      toast.error('Failed to update avatar')
    } finally {
      setSavingPresetAvatar(false)
    }
  }

  // ─── Send password reset ─────────────────────────────────────────────────────
  const handleSendPasswordReset = async () => {
    const user = await getCurrentUser()
    if (!user?.email) { toast.error('No email found'); return }
    setSecuritySending(true)
    try {
      await sendPasswordRecovery(user.email)
      setSecuritySent(true)
    } catch {
      toast.error('Failed to send reset email. Try again.')
    } finally {
      setSecuritySending(false)
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  const displayName = profile?.full_name || userName || 'Aspirant'
  const mastery = getMasteryLabel(stats.avgAccuracy)
  const avatarSrc = profile?.avatar_url ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(displayName)}`

  // ─── Loading state ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <div className="p-6 space-y-6">
          <div className="flex justify-between items-center">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-6 rounded-full" />
          </div>
          <div className="flex flex-col items-center space-y-4 py-8">
            <Skeleton className="h-32 w-32 rounded-full" />
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-10 w-32 rounded-full" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-32 rounded-3xl" />
            <Skeleton className="h-32 rounded-3xl" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </div>
        </div>
      </div>
    )
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#FDFDFD] pb-32">
      <div className="max-w-4xl mx-auto">

        {/* HEADER */}
        <div className="flex items-center justify-between px-6 pt-8 pb-4">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronLeft className="h-6 w-6 text-[#4A90E2]" />
          </button>
          <h1 className="text-sm font-black tracking-[0.2em] text-gray-900 uppercase">Profile</h1>
          <button
            onClick={openEditModal}
            className="p-2 -mr-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <Settings className="h-6 w-6 text-[#4A90E2]" />
          </button>
        </div>

        {/* AVATAR + NAME */}
        <div className="flex flex-col items-center pt-8 pb-10">
          <div className="relative">
            <div className="h-32 w-32 md:h-40 md:w-40 rounded-full p-1 bg-gradient-to-tr from-[#4A90E2] to-blue-400">
              <div className="h-full w-full rounded-full bg-white p-1">
                <div className="h-full w-full rounded-full bg-[#F5F5F7] flex items-center justify-center overflow-hidden">
                  {avatarUploading ? (
                    <Loader2 className="h-8 w-8 text-[#4A90E2] animate-spin" />
                  ) : (
                    <img
                      src={avatarSrc}
                      alt="Avatar"
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => setAvatarPickerOpen(true)}
              disabled={avatarUploading}
              className="absolute bottom-1 right-1 md:bottom-2 md:right-2 h-9 w-9 md:h-11 md:w-11 bg-[#4A90E2] border-4 border-white rounded-full flex items-center justify-center text-white shadow-lg hover:bg-[#3a7fd4] transition-colors disabled:opacity-50"
            >
              {avatarUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4 md:h-5 md:w-5" />
              )}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>

          <h2 className="mt-6 text-4xl md:text-5xl font-black text-gray-900 tracking-tight">
            {displayName.split(' ')[0]}
          </h2>

          {profile?.target_exam && (
            <p className="mt-1 text-sm text-gray-400 font-semibold">
              {profile.target_exam}{profile.target_year ? ` · ${profile.target_year}` : ''}
            </p>
          )}

          <button
            onClick={openEditModal}
            className="mt-4 px-8 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full text-[10px] font-black tracking-widest uppercase transition-colors"
          >
            Edit Profile
          </button>
        </div>

        {/* MASTERY & BEST SCORE */}
        <div className="grid grid-cols-2 gap-4 px-6 mb-8">
          <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm flex flex-col items-center text-center">
            <div className="h-12 w-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
              <Trophy className="h-6 w-6 text-blue-700" />
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Mastery</p>
            <p className="text-2xl font-black text-gray-900">{mastery.title}</p>
            <p className="text-[11px] font-bold text-blue-600 mt-2 uppercase">{mastery.level}</p>
          </div>
          <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm flex flex-col items-center text-center">
            <div className="h-12 w-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-4">
              <BarChart3 className="h-6 w-6 text-blue-700" />
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Best Score</p>
            <p className="text-2xl font-black text-gray-900">
              {stats.highestScore > 0
                ? `${stats.highestScore.toFixed(2)}`
                : '—'}
            </p>
            {stats.highestScore > 0 && stats.highestScoreMax > 0 && (
              <p className="text-[11px] font-bold text-gray-400 mt-1">out of {stats.highestScoreMax}</p>
            )}
            <p className="text-[11px] font-bold text-blue-600 mt-2 uppercase">
              {stats.totalTests > 0 ? `${stats.totalTests} full tests` : 'No full tests yet'}
            </p>
          </div>
        </div>

        {/* STATS GRID */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-6 mb-12">

          <div className="bg-blue-50/50 rounded-[2rem] p-6 border border-blue-100/50 flex flex-col">
            <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center mb-4">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <p className="text-4xl font-black text-blue-900 leading-none">{stats.totalTests}</p>
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mt-3 leading-tight">
              Tests<br />Completed
            </p>
          </div>

          <div className="bg-emerald-50/50 rounded-[2rem] p-6 border border-emerald-100/50 flex flex-col">
            <div className="h-10 w-10 bg-emerald-500 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="h-5 w-5 text-white" />
            </div>
            <p className="text-3xl font-black text-emerald-900 leading-none">
              {stats.highestScore > 0 ? stats.highestScore.toFixed(2) : '—'}
            </p>
            {stats.highestScoreMax > 0 && (
              <p className="text-xs font-bold text-emerald-400 mt-1">/ {stats.highestScoreMax}</p>
            )}
            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mt-3">
              Highest Score
            </p>
          </div>

          <div className="bg-indigo-50/50 rounded-[2rem] p-6 border border-indigo-100/50 flex flex-col">
            <div className="h-10 w-10 bg-indigo-600 rounded-full flex items-center justify-center mb-4">
              <Target className="h-5 w-5 text-white" />
            </div>
            <p className="text-4xl font-black text-indigo-900 leading-none">
              {stats.avgAccuracy > 0 ? `${stats.avgAccuracy}%` : '—'}
            </p>
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-3">
              Avg Accuracy
            </p>
          </div>

          <div className="bg-rose-50/50 rounded-[2rem] p-6 border border-rose-100/50 flex flex-col">
            <div className="h-10 w-10 bg-rose-500 rounded-full flex items-center justify-center mb-4">
              <Target className="h-5 w-5 text-white" />
            </div>
            <p className="text-4xl font-black text-rose-900 leading-none">
              {stats.avgAttemptsPerTest > 0 ? stats.avgAttemptsPerTest : '—'}
            </p>
            <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mt-3 leading-tight">
              Avg Attempts<br />per Test
            </p>
          </div>

        </div>

        {/* PREFERENCES */}
        <div className="px-6 space-y-6">
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-8 py-5 border-b border-gray-50 flex items-center justify-between">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Preferences & Account</p>
            </div>
            <div className="divide-y divide-gray-50">
              <PreferenceItem icon={<ShieldCheck className="h-5 w-5 text-gray-400" />} label="Account Security" onClick={() => { setSecuritySent(false); setSecurityOpen(true) }} />
              <PreferenceItem icon={<Bell className="h-5 w-5 text-gray-400" />} label="Notification Preferences" />
              <PreferenceItem icon={<Crown className="h-5 w-5 text-blue-700" />} label="Subscription" badge="Plus" href="/subscription-plus" />
              <PreferenceItem icon={<HelpCircle className="h-5 w-5 text-gray-400" />} label="Help & Support" href="mailto:indicoredotai@gmail.com?subject=Indicore%20Support%20Request" />
            </div>
          </div>

          {/* SIGN OUT */}
          <button
            onClick={handleSignOut}
            className="w-full h-20 bg-gradient-to-r from-[#4A90E2] to-[#3a7fd4] rounded-[2rem] flex items-center justify-center gap-4 text-white font-black tracking-widest uppercase shadow-xl shadow-blue-100 hover:scale-[1.01] hover:shadow-blue-200 transition-all active:scale-[0.98]"
          >
            Sign Out
            <LogOut className="h-6 w-6" />
          </button>

          <p className="text-center text-[10px] font-black text-gray-200 uppercase tracking-[0.2em] mt-12 mb-8">
            Indicore Aspirant Platform v2.4.1
          </p>
        </div>
      </div>

      {/* AVATAR PICKER DIALOG */}
      <AvatarPickerModal
        open={avatarPickerOpen}
        onClose={() => setAvatarPickerOpen(false)}
        currentAvatar={avatarSrc}
        tab={avatarPickerTab}
        onTabChange={setAvatarPickerTab}
        onSelect={handleSelectPresetAvatar}
        onUpload={() => { setAvatarPickerOpen(false); fileInputRef.current?.click() }}
        saving={savingPresetAvatar}
      />

      {/* ACCOUNT SECURITY DIALOG */}
      <SecurityModal
        open={securityOpen}
        onClose={() => setSecurityOpen(false)}
        onSendReset={handleSendPasswordReset}
        sending={securitySending}
        sent={securitySent}
      />

      {/* EDIT PROFILE DIALOG */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase tracking-tight">Edit Profile</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-name" className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                Full Name
              </Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                placeholder="Your full name"
                className="rounded-xl"
              />
            </div>

            {/* Target Exam */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                Target Exam
              </Label>
              <Select value={editExam} onValueChange={setEditExam}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select exam" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SELECT_NONE}>Not selected</SelectItem>
                  {TARGET_EXAMS.map(exam => (
                    <SelectItem key={exam} value={exam}>{exam}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Target Year */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                Target Year
              </Label>
              <Select value={editYear} onValueChange={setEditYear}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SELECT_NONE}>Not selected</SelectItem>
                  {TARGET_YEARS.map(y => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Avatar pick hint */}
            <p className="text-xs text-gray-400 bg-gray-50 rounded-xl px-4 py-3">
              To change your avatar, tap the camera icon on your profile picture to browse avatars.
            </p>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1 rounded-xl"
                onClick={() => setEditOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-[#4A90E2] hover:bg-[#3a7fd4] rounded-xl"
                onClick={handleSaveProfile}
                disabled={saving}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function PreferenceItem({ icon, label, badge, href, onClick }: { icon: React.ReactNode; label: string; badge?: string; href?: string; onClick?: () => void }) {
  const content = (
    <>
      <div className="flex items-center gap-4">
        <div className="shrink-0">{icon}</div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-black text-gray-700">{label}</span>
          {badge && (
            <span className="bg-blue-50 text-blue-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">
              {badge}
            </span>
          )}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-900 group-hover:translate-x-0.5 transition-all" />
    </>
  )

  if (href) {
    return (
      <Link href={href} className="w-full flex items-center justify-between px-6 py-5 hover:bg-gray-50 transition-colors group">
        {content}
      </Link>
    )
  }

  return (
    <button onClick={onClick} className="w-full flex items-center justify-between px-6 py-5 hover:bg-gray-50 transition-colors group">
      {content}
    </button>
  )
}

/** Extract Appwrite file ID from a preview URL */
function extractFileIdFromUrl(url: string): string | null {
  try {
    const match = url.match(/\/files\/([^/]+)\//)
    return match ? match[1] : null
  } catch {
    return null
  }
}

// ─── Avatar data ─────────────────────────────────────────────────────────────
const BASE = 'https://api.dicebear.com/7.x'

const MALE_AVATARS = [
  { url: `${BASE}/micah/svg?seed=Arjun&baseColor=f9c9b6,ac6651`, label: 'Arjun' },
  { url: `${BASE}/micah/svg?seed=Ravi&baseColor=f9c9b6,ac6651`, label: 'Ravi' },
  { url: `${BASE}/micah/svg?seed=Suresh&baseColor=f9c9b6`, label: 'Suresh' },
  { url: `${BASE}/micah/svg?seed=Kumar&baseColor=ac6651`, label: 'Kumar' },
  { url: `${BASE}/micah/svg?seed=Vikram&baseColor=f9c9b6`, label: 'Vikram' },
  { url: `${BASE}/micah/svg?seed=Karthik&baseColor=d08b5b`, label: 'Karthik' },
  { url: `${BASE}/micah/svg?seed=Arun&baseColor=f9c9b6,ac6651`, label: 'Arun' },
  { url: `${BASE}/micah/svg?seed=Sanjay&baseColor=ac6651,d08b5b`, label: 'Sanjay' },
  { url: `${BASE}/micah/svg?seed=Ganesh&baseColor=f9c9b6`, label: 'Ganesh' },
  { url: `${BASE}/micah/svg?seed=Mohan&baseColor=d08b5b`, label: 'Mohan' },
  { url: `${BASE}/avataaars/svg?seed=Arjun`, label: 'Classic 1' },
  { url: `${BASE}/avataaars/svg?seed=Ravi`, label: 'Classic 2' },
  { url: `${BASE}/avataaars/svg?seed=Suresh`, label: 'Classic 3' },
  { url: `${BASE}/avataaars/svg?seed=Kumar`, label: 'Classic 4' },
  { url: `${BASE}/avataaars/svg?seed=Vikram`, label: 'Classic 5' },
  { url: `${BASE}/adventurer/svg?seed=Arjun`, label: 'Adventurer 1' },
  { url: `${BASE}/adventurer/svg?seed=Ravi`, label: 'Adventurer 2' },
  { url: `${BASE}/adventurer/svg?seed=Karthik`, label: 'Adventurer 3' },
  { url: `${BASE}/personas/svg?seed=Arjun`, label: 'Persona 1' },
  { url: `${BASE}/personas/svg?seed=Vikram`, label: 'Persona 2' },
]

const FEMALE_AVATARS = [
  { url: `${BASE}/lorelei/svg?seed=Priya`, label: 'Priya' },
  { url: `${BASE}/lorelei/svg?seed=Ananya`, label: 'Ananya' },
  { url: `${BASE}/lorelei/svg?seed=Kavitha`, label: 'Kavitha' },
  { url: `${BASE}/lorelei/svg?seed=Divya`, label: 'Divya' },
  { url: `${BASE}/lorelei/svg?seed=Meera`, label: 'Meera' },
  { url: `${BASE}/lorelei/svg?seed=Pooja`, label: 'Pooja' },
  { url: `${BASE}/lorelei/svg?seed=Nithya`, label: 'Nithya' },
  { url: `${BASE}/lorelei/svg?seed=Shreya`, label: 'Shreya' },
  { url: `${BASE}/lorelei/svg?seed=Lakshmi`, label: 'Lakshmi' },
  { url: `${BASE}/lorelei/svg?seed=Deepa`, label: 'Deepa' },
  { url: `${BASE}/avataaars/svg?seed=Priya`, label: 'Classic 1' },
  { url: `${BASE}/avataaars/svg?seed=Ananya`, label: 'Classic 2' },
  { url: `${BASE}/avataaars/svg?seed=Kavitha`, label: 'Classic 3' },
  { url: `${BASE}/avataaars/svg?seed=Divya`, label: 'Classic 4' },
  { url: `${BASE}/avataaars/svg?seed=Meera`, label: 'Classic 5' },
  { url: `${BASE}/adventurer/svg?seed=Priya`, label: 'Adventurer 1' },
  { url: `${BASE}/adventurer/svg?seed=Ananya`, label: 'Adventurer 2' },
  { url: `${BASE}/adventurer/svg?seed=Kavitha`, label: 'Adventurer 3' },
  { url: `${BASE}/personas/svg?seed=Priya`, label: 'Persona 1' },
  { url: `${BASE}/personas/svg?seed=Meera`, label: 'Persona 2' },
]

// ─── AvatarPickerModal ────────────────────────────────────────────────────────
function AvatarPickerModal({
  open, onClose, currentAvatar, tab, onTabChange, onSelect, onUpload, saving,
}: {
  open: boolean
  onClose: () => void
  currentAvatar: string
  tab: 'male' | 'female'
  onTabChange: (t: 'male' | 'female') => void
  onSelect: (url: string) => void
  onUpload: () => void
  saving: boolean
}) {
  const avatars = tab === 'male' ? MALE_AVATARS : FEMALE_AVATARS

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md rounded-3xl max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
          <DialogTitle className="text-base font-black uppercase tracking-tight">Choose Avatar</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex px-6 pt-4 gap-2 shrink-0">
          {(['male', 'female'] as const).map(t => (
            <button
              key={t}
              onClick={() => onTabChange(t)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                tab === t
                  ? 'bg-[#4A90E2] text-white shadow-sm'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {t === 'male' ? '♂ Male' : '♀ Female'}
            </button>
          ))}
        </div>

        {/* Current avatar preview */}
        <div className="flex items-center gap-4 mx-6 mt-4 p-3 bg-gray-50 rounded-2xl shrink-0">
          <img src={currentAvatar} alt="Current" className="h-12 w-12 rounded-full border-2 border-[#4A90E2] bg-white" />
          <div>
            <p className="text-xs font-black text-gray-700">Current Avatar</p>
            <button onClick={onUpload} className="text-[11px] font-bold text-[#4A90E2] mt-0.5">
              Upload custom photo instead →
            </button>
          </div>
        </div>

        {/* Avatar grid */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          <div className="grid grid-cols-4 gap-3">
            {avatars.map((av) => {
              const isSelected = currentAvatar === av.url
              return (
                <button
                  key={av.url}
                  onClick={() => onSelect(av.url)}
                  disabled={saving}
                  className={`relative flex flex-col items-center gap-1.5 p-2 rounded-2xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50 ${
                    isSelected ? 'bg-[#EBF2FC] ring-2 ring-[#4A90E2]' : 'hover:bg-gray-50'
                  }`}
                >
                  <img
                    src={av.url}
                    alt={av.label}
                    className="h-14 w-14 rounded-full bg-gray-100 border border-gray-100"
                    loading="lazy"
                  />
                  {isSelected && (
                    <div className="absolute top-1 right-1 h-4 w-4 bg-[#4A90E2] rounded-full flex items-center justify-center">
                      <svg className="h-2.5 w-2.5 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                  <span className="text-[9px] font-bold text-gray-400 truncate w-full text-center">{av.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {saving && (
          <div className="px-6 pb-4 shrink-0">
            <div className="flex items-center justify-center gap-2 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-[#4A90E2]" />
              <span className="text-sm text-gray-500 font-medium">Saving avatar…</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── SecurityModal ────────────────────────────────────────────────────────────
function SecurityModal({
  open, onClose, onSendReset, sending, sent,
}: {
  open: boolean
  onClose: () => void
  onSendReset: () => void
  sending: boolean
  sent: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-base font-black uppercase tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#4A90E2]" />
            Account Security
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {sent ? (
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-black text-emerald-800">Reset email sent!</p>
              <p className="text-xs text-emerald-600 mt-1 font-medium">Check your inbox and follow the link to set a new password.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-500 font-medium leading-relaxed">
                To change your password, we'll send a secure reset link to your registered email address.
              </p>
              <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">What happens next</p>
                <ol className="space-y-1.5 text-xs text-gray-600 font-medium list-none">
                  <li className="flex items-start gap-2"><span className="text-[#4A90E2] font-black shrink-0">1.</span>We send a reset link to your email</li>
                  <li className="flex items-start gap-2"><span className="text-[#4A90E2] font-black shrink-0">2.</span>Click the link within 1 hour</li>
                  <li className="flex items-start gap-2"><span className="text-[#4A90E2] font-black shrink-0">3.</span>Set your new password</li>
                </ol>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={onClose}>
              {sent ? 'Done' : 'Cancel'}
            </Button>
            {!sent && (
              <Button
                className="flex-1 bg-[#4A90E2] hover:bg-[#3a7fd4] rounded-xl"
                onClick={onSendReset}
                disabled={sending}
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send Reset Link'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
