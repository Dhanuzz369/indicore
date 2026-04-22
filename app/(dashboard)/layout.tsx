'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser, signOut, clearSessionCookie } from '@/lib/supabase/auth'
import { getProfile, getDueNotesCount } from '@/lib/supabase/queries'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import {
  LayoutDashboard,
  Brain,
  BarChart3,
  User,
  LogOut,
  Trophy,
  ChevronRight,
  ClipboardList,
  BookOpen,
  Sparkles,
  HelpCircle,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Profile } from '@/types'
import { usePathname } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAnalytics } from '@/hooks/useAnalytics'

const navigation = [
  { name: 'Home',         href: '/dashboard',      icon: LayoutDashboard },
  { name: 'Practice',     href: '/quiz',            icon: Brain },
  { name: 'My Tests',     href: '/tests',           icon: ClipboardList },
  { name: 'Flash Cards',  href: '/notes',           icon: BookOpen },
  { name: 'Results',      href: '/results',         icon: BarChart3 },
  { name: 'Intelligence', href: '/intelligence',    icon: Sparkles },
  { name: 'Profile',      href: '/profile',         icon: User },
]

function getInitials(name: string | null | undefined) {
  if (!name) return 'U'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [dueCount, setDueCount] = useState(0)
  const { identify, reset } = useAnalytics()

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = await getCurrentUser()
        if (!user) { router.push('/login'); return }
        const userProfile = await getProfile(user.$id)
        setProfile(userProfile as unknown as Profile)
        identify(user.$id, {
          email: user.email ?? '',
          name: (userProfile as any)?.full_name ?? '',
          exam_type: (userProfile as any)?.target_exam ?? '',
        })
        try {
          const count = await getDueNotesCount(user.$id)
          setDueCount(count)
        } catch { /* non-critical */ }
      } catch {
        clearSessionCookie()
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }
    fetchUserData()
  }, [router])

  const handleSignOut = async () => {
    reset()
    try {
      await signOut()
      toast.success('Signed out successfully')
      router.push('/login')
    } catch {
      clearSessionCookie()
      router.push('/login')
    }
  }

  // Detect if current page is the quiz session (full screen, no nav)
  const isSessionPage = pathname === '/quiz/session'

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-[#4A90E2]/20 flex items-center justify-center mx-auto">
            <Trophy className="h-6 w-6 text-[#4A90E2]" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-32 mx-auto" />
            <Skeleton className="h-3 w-20 mx-auto" />
          </div>
        </div>
      </div>
    )
  }

  // Session page: full-screen, no header/footer chrome
  if (isSessionPage) {
    return <>{children}</>
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* ── Desktop Left Sidebar ── */}
      <aside className="hidden md:flex w-64 flex-col bg-white border-r border-gray-100 shrink-0">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-gray-100 shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#4A90E2] flex items-center justify-center">
              <Trophy className="h-4 w-4 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Indicore</span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navigation.map(item => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive
                    ? 'bg-[#4A90E2] text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {item.name}
                {item.name === 'Notes' && dueCount > 0 ? (
                  <span className={`ml-auto text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${isActive ? 'bg-white/30 text-white' : 'bg-[#4A90E2] text-white'}`}>
                    {dueCount > 99 ? '99+' : dueCount}
                  </span>
                ) : (
                  isActive && <ChevronRight className="h-4 w-4 ml-auto opacity-70" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* ── Upgrade to Pro CTA ── */}
        <div className="px-4 pb-3 shrink-0">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#4A90E2] to-[#6366f1] p-4 text-white shadow-lg shadow-blue-100">
            {/* decorative circles */}
            <div className="absolute -top-4 -right-4 h-20 w-20 rounded-full bg-white/10" />
            <div className="absolute -bottom-3 -left-3 h-14 w-14 rounded-full bg-white/10" />
            <div className="relative">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Zap className="h-3.5 w-3.5 text-yellow-300 fill-yellow-300" />
                <span className="text-[11px] font-black uppercase tracking-wider">Upgrade to Pro</span>
              </div>
              <p className="text-[11px] text-white/70 leading-relaxed mb-3">
                Unlock unlimited mocks, AI insights & detailed analytics.
              </p>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-1.5 bg-white text-[#4A90E2] text-[11px] font-black px-3 py-1.5 rounded-lg hover:bg-white/90 transition-colors"
              >
                Get Pro <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>

        {/* ── Help Centre + Log Out ── */}
        <div className="px-4 pb-2 space-y-0.5 shrink-0">
          <Link
            href="/help"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-all"
          >
            <HelpCircle className="h-5 w-5 shrink-0" />
            Help Centre
          </Link>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 hover:text-red-600 transition-all"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            Log Out
          </button>
        </div>

        {/* ── User card at bottom ── */}
        <div className="p-4 border-t border-gray-100 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left">
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarFallback className="bg-[#4A90E2] text-white text-sm font-semibold">
                    {profile ? getInitials(profile.full_name) : 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{profile?.full_name}</p>
                  <p className="text-xs text-gray-500 truncate">{profile?.target_exam || 'UPSC Aspirant'}</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 mb-2">
              <DropdownMenuLabel className="text-xs text-gray-500 font-normal">Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile" className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" /> Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSignOut} className="text-red-500 cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" /> Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* ── Main Area ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Mobile top bar */}
        <header className="md:hidden flex items-center justify-between px-4 h-14 bg-white border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#4A90E2] flex items-center justify-center">
              <Trophy className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-bold text-gray-900">Indicore</span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button>
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-[#4A90E2] text-white text-xs font-semibold">
                    {profile ? getInitials(profile.full_name) : 'U'}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel className="text-xs">{profile?.full_name}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile" className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" /> Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSignOut} className="text-red-500 cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" /> Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page content - scrollable */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          {children}
        </main>

        {/* ── Mobile Bottom Navigation ── */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50 safe-area-bottom">
          <div className="grid grid-cols-7 h-16">
            {navigation.map(item => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex flex-col items-center justify-center gap-1 transition-colors relative"
                >
                  <div className="relative">
                    <item.icon className={`h-5 w-5 ${isActive ? 'text-[#4A90E2]' : 'text-gray-400'}`} />
                    {item.name === 'Notes' && dueCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 bg-[#4A90E2] rounded-full text-white text-[8px] font-black flex items-center justify-center">
                        {dueCount > 9 ? '9+' : dueCount}
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] font-medium ${isActive ? 'text-[#4A90E2]' : 'text-gray-400'}`}>
                    {item.name}
                  </span>
                  {isActive && (
                    <div className="absolute bottom-0 w-8 h-0.5 bg-[#4A90E2] rounded-full" />
                  )}
                </Link>
              )
            })}
          </div>
        </nav>

      </div>
    </div>
  )
}
