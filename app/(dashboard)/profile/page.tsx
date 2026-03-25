'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, signOut } from '@/lib/appwrite/auth'
import { getProfile, updateProfile, listTestSessions } from '@/lib/appwrite/queries'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { 
  ChevronLeft, Settings, Pencil, GraduationCap, BarChart3, 
  FileText, CheckCircle2, XCircle, Target, ChevronRight, 
  ShieldCheck, Bell, Crown, HelpCircle, LogOut 
} from 'lucide-react'
import Link from 'next/link'
import type { Profile, TestSession } from '@/types'

export default function ProfilePage() {
  const router = useRouter()

  // ─────────────────────────────────────────────────────────────────
  // STATE
  // ─────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string>('')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [mockStats, setMockStats] = useState({
    totalMocks: 0,
    highestScore: 0,
    avgAttempts: 0,
    avgAccuracy: 0
  })

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

        // Fetch profile and sessions in parallel
        const [profileData, sessionsData] = await Promise.all([
          getProfile(user.$id),
          listTestSessions({ userId: user.$id, mode: 'full_length', limit: 100 })
        ])

        setProfile(profileData as unknown as Profile)
        
        // Calculate mock stats from full length sessions
        const fullMocks = sessionsData.documents
        if (fullMocks.length > 0) {
          const totalMocks = fullMocks.length
          const highestScore = Math.max(...fullMocks.map(s => s.score))
          
          const totalCorrect = fullMocks.reduce((acc, curr) => acc + curr.correct, 0)
          const totalAttempted = fullMocks.reduce((acc, curr) => acc + curr.attempted, 0)
          
          const avgAttempts = Math.round(totalAttempted / totalMocks)
          const avgAccuracy = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0

          setMockStats({
            totalMocks,
            highestScore,
            avgAttempts,
            avgAccuracy
          })
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

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push('/login')
      toast.success('Signed out successfully')
    } catch (error) {
      toast.error('Failed to sign out')
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // LOADING STATE
  // ─────────────────────────────────────────────────────────────────
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
            <Skeleton className="h-24 w-24 rounded-full" />
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-10 w-32 rounded-full" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-32 rounded-3xl" />
            <Skeleton className="h-32 rounded-3xl" />
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </div>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#FDFDFD] pb-32">
      <div className="max-w-4xl mx-auto">
        {/* ── HEADER ── */}
        <div className="flex items-center justify-between px-6 pt-8 pb-4">
          <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
            <ChevronLeft className="h-6 w-6 text-[#FF6B00]" />
          </button>
          <h1 className="text-sm font-black tracking-[0.2em] text-gray-900 uppercase">Profile</h1>
          <button className="p-2 -mr-2 hover:bg-gray-100 rounded-full transition-colors">
            <Settings className="h-6 w-6 text-[#FF6B00]" />
          </button>
        </div>

        {/* ── PROFILE SECTION ── */}
        <div className="flex flex-col items-center pt-8 pb-10">
          <div className="relative">
            <div className="h-32 w-32 md:h-40 md:w-40 rounded-full p-1 bg-gradient-to-tr from-[#FF6B00] to-orange-400">
              <div className="h-full w-full rounded-full bg-white p-1">
                <div className="h-full w-full rounded-full bg-[#F5F5F7] flex items-center justify-center overflow-hidden">
                  <img 
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.full_name || 'Dhanush'}`} 
                    alt="Avatar" 
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
            </div>
            <button className="absolute bottom-1 right-1 md:bottom-2 md:right-2 h-9 w-9 md:h-11 md:w-11 bg-[#FF6B00] border-4 border-white rounded-full flex items-center justify-center text-white shadow-lg">
              <Pencil className="h-4 w-4 md:h-5 md:w-5" />
            </button>
          </div>
          
          <h2 className="mt-6 text-4xl md:text-5xl font-black text-gray-900 tracking-tight">
            {profile?.full_name?.split(' ')[0] || 'Dhanush'}
          </h2>
          
          <button className="mt-4 px-8 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full text-[10px] font-black tracking-widest uppercase transition-colors">
            Edit Profile
          </button>
        </div>

        {/* ── MASTERY & RANK ROW ── */}
        <div className="grid grid-cols-2 gap-4 px-6 mb-8">
          <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm flex flex-col items-center text-center">
            <div className="h-12 w-12 bg-orange-50 rounded-2xl flex items-center justify-center mb-4">
              <GraduationCap className="h-6 w-6 text-orange-700" />
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Mastery</p>
            <p className="text-2xl font-black text-gray-900">Scholar</p>
            <p className="text-[11px] font-bold text-orange-600 mt-2 uppercase">Lvl 12</p>
          </div>
          <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm flex flex-col items-center text-center">
            <div className="h-12 w-12 bg-orange-50 rounded-2xl flex items-center justify-center mb-4">
              <BarChart3 className="h-6 w-6 text-orange-700" />
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Rank</p>
            <p className="text-2xl font-black text-gray-900">Top 5%</p>
            <p className="text-[11px] font-bold text-orange-600 mt-2 uppercase">Physics</p>
          </div>
        </div>

        {/* ── MAIN PERFORMANCE STATS (4 BOXES) ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-6 mb-12">
          
          {/* Total Mocks */}
          <div className="bg-blue-50/50 rounded-[2rem] p-6 border border-blue-100/50 flex flex-col">
            <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center mb-4">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <p className="text-4xl font-black text-blue-900 leading-none">
              {mockStats.totalMocks}
            </p>
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mt-3 leading-tight">
              Total<br/>Attempted
            </p>
          </div>

          {/* Highest Score */}
          <div className="bg-emerald-50/50 rounded-[2rem] p-6 border border-emerald-100/50 flex flex-col">
            <div className="h-10 w-10 bg-emerald-500 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="h-5 w-5 text-white" />
            </div>
            <p className="text-4xl font-black text-emerald-900 leading-none">
              {mockStats.highestScore}
            </p>
            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mt-3">
              Highest Score
            </p>
          </div>

          {/* Avg Attempts */}
          <div className="bg-rose-50/50 rounded-[2rem] p-6 border border-rose-100/50 flex flex-col">
            <div className="h-10 w-10 bg-rose-500 rounded-full flex items-center justify-center mb-4">
              <XCircle className="h-5 w-5 text-white" />
            </div>
            <p className="text-4xl font-black text-rose-900 leading-none">
              {mockStats.avgAttempts}
            </p>
            <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mt-3">
              Avg Attempts
            </p>
          </div>

          {/* Avg Accuracy */}
          <div className="bg-indigo-50/50 rounded-[2rem] p-6 border border-indigo-100/50 flex flex-col">
            <div className="h-10 w-10 bg-indigo-600 rounded-full flex items-center justify-center mb-4">
              <Target className="h-5 w-5 text-white" />
            </div>
            <p className="text-4xl font-black text-indigo-900 leading-none">
              {mockStats.avgAccuracy}%
            </p>
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-3">
              Accuracy
            </p>
          </div>

        </div>

        {/* ── PREFERENCES LIST ── */}
        <div className="px-6 space-y-6">
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-8 py-5 border-b border-gray-50 flex items-center justify-between">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Preferences & Account</p>
            </div>
            
            <div className="divide-y divide-gray-50">
              <PreferenceItem icon={<ShieldCheck className="h-5 w-5 text-gray-400"/>} label="Account Security" />
              <PreferenceItem icon={<Bell className="h-5 w-5 text-gray-400"/>} label="Notification Preferences" />
              <PreferenceItem icon={<Crown className="h-5 w-5 text-orange-700"/>} label="Subscription" badge="Plus" />
              <PreferenceItem icon={<HelpCircle className="h-5 w-5 text-gray-400"/>} label="Help & Support" />
            </div>
          </div>

          {/* SIGN OUT BUTTON */}
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
    </div>
  )
}

function PreferenceItem({ icon, label, badge }: { icon: React.ReactNode, label: string, badge?: string }) {
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
