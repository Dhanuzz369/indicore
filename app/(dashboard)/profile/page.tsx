'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, signOut } from '@/lib/appwrite/auth'
import {
  getProfile, createProfile, updateProfile, listTestSessions,
  uploadAvatar, getAvatarUrl, deleteAvatarFile,
} from '@/lib/appwrite/queries'
import { STORAGE_BUCKET_ID } from '@/lib/appwrite/config'
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
    highestScore: 0,
    avgAccuracy: 0,
    totalCorrect: 0,
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
            listTestSessions({ userId: user.$id, limit: 200 }),
          ])
          profileData = p as unknown as Profile
          sessionsData = s
        } catch (e: any) {
          if (e.code === 404) {
            const newProfile = await createProfile(user.$id, user.name || 'Aspirant')
            profileData = newProfile as unknown as Profile
            sessionsData = await listTestSessions({ userId: user.$id, limit: 200 })
          } else {
            throw e
          }
        }

        setProfile(profileData)

        const allSessions = sessionsData.documents
        if (allSessions.length > 0) {
          const totalTests = allSessions.length
          const highestScore = Math.max(...allSessions.map(s => s.score))
          const totalCorrect = allSessions.reduce((acc, s) => acc + s.correct, 0)
          const totalAttempted = allSessions.reduce((acc, s) => acc + s.attempted, 0)
          const avgAccuracy = totalAttempted > 0
            ? Math.round((totalCorrect / totalAttempted) * 100)
            : 0

          setStats({ totalTests, highestScore, avgAccuracy, totalCorrect, totalAttempted })
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
    setEditExam(profile?.target_exam || '')
    setEditYear(profile?.target_year ? String(profile.target_year) : '')
    setEditOpen(true)
  }

  // ─── Save profile edits ──────────────────────────────────────────────────────
  const handleSaveProfile = async () => {
    if (!editName.trim()) { toast.error('Name cannot be empty'); return }
    setSaving(true)
    try {
      const updated = await updateProfile(userId, {
        full_name: editName.trim(),
        target_exam: editExam || null,
        target_year: editYear ? parseInt(editYear) : null,
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
            <ChevronLeft className="h-6 w-6 text-[#FF6B00]" />
          </button>
          <h1 className="text-sm font-black tracking-[0.2em] text-gray-900 uppercase">Profile</h1>
          <button
            onClick={openEditModal}
            className="p-2 -mr-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <Settings className="h-6 w-6 text-[#FF6B00]" />
          </button>
        </div>

        {/* AVATAR + NAME */}
        <div className="flex flex-col items-center pt-8 pb-10">
          <div className="relative">
            <div className="h-32 w-32 md:h-40 md:w-40 rounded-full p-1 bg-gradient-to-tr from-[#FF6B00] to-orange-400">
              <div className="h-full w-full rounded-full bg-white p-1">
                <div className="h-full w-full rounded-full bg-[#F5F5F7] flex items-center justify-center overflow-hidden">
                  {avatarUploading ? (
                    <Loader2 className="h-8 w-8 text-[#FF6B00] animate-spin" />
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
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarUploading}
              className="absolute bottom-1 right-1 md:bottom-2 md:right-2 h-9 w-9 md:h-11 md:w-11 bg-[#FF6B00] border-4 border-white rounded-full flex items-center justify-center text-white shadow-lg hover:bg-[#FF8C00] transition-colors disabled:opacity-50"
            >
              {avatarUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4 md:h-5 md:w-5" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
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
            <div className="h-12 w-12 bg-orange-50 rounded-2xl flex items-center justify-center mb-4">
              <Trophy className="h-6 w-6 text-orange-700" />
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Mastery</p>
            <p className="text-2xl font-black text-gray-900">{mastery.title}</p>
            <p className="text-[11px] font-bold text-orange-600 mt-2 uppercase">{mastery.level}</p>
          </div>
          <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm flex flex-col items-center text-center">
            <div className="h-12 w-12 bg-orange-50 rounded-2xl flex items-center justify-center mb-4">
              <BarChart3 className="h-6 w-6 text-orange-700" />
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Best Score</p>
            <p className="text-2xl font-black text-gray-900">
              {stats.highestScore > 0 ? `${stats.highestScore.toFixed(0)}%` : '—'}
            </p>
            <p className="text-[11px] font-bold text-orange-600 mt-2 uppercase">
              {stats.totalTests > 0 ? `${stats.totalTests} tests` : 'No tests yet'}
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
            <p className="text-4xl font-black text-emerald-900 leading-none">
              {stats.highestScore > 0 ? `${stats.highestScore.toFixed(0)}%` : '—'}
            </p>
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
              <CheckCircle2 className="h-5 w-5 text-white" />
            </div>
            <p className="text-4xl font-black text-rose-900 leading-none">{stats.totalCorrect}</p>
            <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mt-3">
              Total Correct
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
              <PreferenceItem icon={<ShieldCheck className="h-5 w-5 text-gray-400" />} label="Account Security" />
              <PreferenceItem icon={<Bell className="h-5 w-5 text-gray-400" />} label="Notification Preferences" />
              <PreferenceItem icon={<Crown className="h-5 w-5 text-orange-700" />} label="Subscription" badge="Plus" />
              <PreferenceItem icon={<HelpCircle className="h-5 w-5 text-gray-400" />} label="Help & Support" />
            </div>
          </div>

          {/* SIGN OUT */}
          <button
            onClick={handleSignOut}
            className="w-full h-20 bg-gradient-to-r from-[#FF6B00] to-orange-500 rounded-[2rem] flex items-center justify-center gap-4 text-white font-black tracking-widest uppercase shadow-xl shadow-orange-100 hover:scale-[1.01] hover:shadow-orange-200 transition-all active:scale-[0.98]"
          >
            Sign Out
            <LogOut className="h-6 w-6" />
          </button>

          <p className="text-center text-[10px] font-black text-gray-200 uppercase tracking-[0.2em] mt-12 mb-8">
            Indicore Aspirant Platform v2.4.1
          </p>
        </div>
      </div>

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
                  <SelectItem value="">Not selected</SelectItem>
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
                  <SelectItem value="">Not selected</SelectItem>
                  {TARGET_YEARS.map(y => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Avatar upload hint */}
            <p className="text-xs text-gray-400 bg-gray-50 rounded-xl px-4 py-3">
              To change your avatar, tap the camera icon on your profile picture.
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
                className="flex-1 bg-[#FF6B00] hover:bg-[#FF8C00] rounded-xl"
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

function PreferenceItem({ icon, label, badge }: { icon: React.ReactNode; label: string; badge?: string }) {
  return (
    <button className="w-full flex items-center justify-between px-6 py-5 hover:bg-gray-50 transition-colors group">
      <div className="flex items-center gap-4">
        <div className="shrink-0">{icon}</div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-black text-gray-700">{label}</span>
          {badge && (
            <span className="bg-orange-50 text-orange-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">
              {badge}
            </span>
          )}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-900 group-hover:translate-x-0.5 transition-all" />
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
