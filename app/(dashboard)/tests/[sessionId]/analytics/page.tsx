'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getTestSession } from '@/lib/appwrite/queries'
import type { TestSession } from '@/types'
import { formatDuration, formatDateTime, formatAvgTime } from '@/lib/formatters'
import { AnalyticsBars } from '@/components/tests/AnalyticsBars'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft, Clock, CheckCircle, XCircle, MinusCircle,
  Zap, Target, AlertCircle, Bot, Brain, TrendingDown
} from 'lucide-react'
import { toast } from 'sonner'

interface ParsedAnalytics {
  subjectStats?: { subject: string; accuracy: number; correct: number; total: number }[]
  timingStats?: { questionText: string; timeTaken: number; targetTime: number }[]
  buttonUsageStats?: {
    totalGuess: number
    correctGuess: number
    total5050: number
    correct5050: number
    totalAreYouSure: number
    correctAreYouSure: number
  }
  overallTime?: { targetTime: number; actualTime: number }
  suggestions?: string[]
}

function pct(correct: number, total: number) {
  return total > 0 ? Math.round((correct / total) * 100) : 0
}

export default function SessionAnalyticsPage() {
  const { sessionId } = useParams() as { sessionId: string }
  const router = useRouter()

  const [session, setSession] = useState<TestSession | null>(null)
  const [analytics, setAnalytics] = useState<ParsedAnalytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!sessionId) return
    const load = async () => {
      try {
        const sess = await getTestSession(sessionId)
        setSession(sess)
        try {
          setAnalytics(JSON.parse(sess.analytics))
        } catch {
          setAnalytics(null)
        }
      } catch (e) {
        console.error(e)
        toast.error('Failed to load analytics.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [sessionId])

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-8 w-1/3" />
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl w-full" />)}
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-center">
        <div className="space-y-3">
          <p className="text-gray-500">Session not found.</p>
          <Button onClick={() => router.push('/tests')} variant="outline">Back to My Tests</Button>
        </div>
      </div>
    )
  }

  const sureAcc = pct(analytics?.buttonUsageStats?.correctAreYouSure ?? 0, analytics?.buttonUsageStats?.totalAreYouSure ?? 0)
  const fiftyAcc = pct(analytics?.buttonUsageStats?.correct5050 ?? 0, analytics?.buttonUsageStats?.total5050 ?? 0)
  const guessAcc = pct(analytics?.buttonUsageStats?.correctGuess ?? 0, analytics?.buttonUsageStats?.totalGuess ?? 0)

  const slowestQuestions = (analytics?.timingStats ?? [])
    .filter(t => t.timeTaken > 0)
    .sort((a, b) => b.timeTaken - a.timeTaken)
    .slice(0, 10)

  return (
    <div className="min-h-screen bg-[#F8F9FC] pb-20">
      {/* Nav */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/tests')}
            className="gap-1.5 text-gray-500 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" /> My Tests
          </Button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">Analytics — {session.paper_label}</p>
            <p className="text-xs text-gray-400">{formatDateTime(session.submitted_at)}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/tests/${sessionId}/results`)}
            className="gap-1.5 text-xs font-semibold"
          >
            <Brain className="h-3.5 w-3.5" /> Results
          </Button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">

        {/* ── Overview metrics ── */}
        <div className="bg-[#111] rounded-[2rem] p-6 text-white">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 mb-4">Overview</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-1 text-center">
              <p className="text-3xl font-black text-[#FF6B00]">{session.score.toFixed(0)}%</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Accuracy</p>
            </div>
            <div className="space-y-1 text-center">
              <p className="text-3xl font-black text-white">{formatDuration(session.total_time_seconds)}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Time</p>
            </div>
            <div className="space-y-1 text-center">
              <p className="text-3xl font-black text-white">
                {formatAvgTime(session.total_time_seconds, session.total_questions)}
              </p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Avg/Q</p>
            </div>
            <div className="space-y-1 text-center">
              <p className="text-3xl font-black text-emerald-400">{session.correct}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Correct</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-white/10">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              <span className="font-semibold text-emerald-300">{session.correct}</span>
              <span className="text-gray-500">correct</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <XCircle className="h-4 w-4 text-red-400" />
              <span className="font-semibold text-red-300">{session.incorrect}</span>
              <span className="text-gray-500">wrong</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MinusCircle className="h-4 w-4 text-gray-500" />
              <span className="font-semibold text-gray-400">{session.skipped}</span>
              <span className="text-gray-500">skipped</span>
            </div>
          </div>
        </div>

        {/* ── Subject Performance ── */}
        {analytics?.subjectStats && analytics.subjectStats.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <Target className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="font-black text-gray-900 text-sm uppercase tracking-tight">Subject Performance</h3>
            </div>
            <Separator />
            <AnalyticsBars data={analytics.subjectStats} />
          </div>
        )}

        {/* ── Confidence / Button Usage ── */}
        {analytics?.buttonUsageStats && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                <Zap className="h-5 w-5 text-indigo-600" />
              </div>
              <h3 className="font-black text-gray-900 text-sm uppercase tracking-tight">Confidence Button Analysis</h3>
            </div>
            <Separator />
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-emerald-50 rounded-xl p-4 text-center border border-emerald-100">
                <p className="text-2xl font-black text-emerald-700">{analytics.buttonUsageStats.totalAreYouSure}</p>
                <p className="text-xs font-semibold text-emerald-600 mt-1">100% Sure</p>
                <p className="text-xs text-emerald-500 font-bold mt-0.5">{sureAcc}% accuracy</p>
              </div>
              <div className="bg-purple-50 rounded-xl p-4 text-center border border-purple-100">
                <p className="text-2xl font-black text-purple-700">{analytics.buttonUsageStats.total5050}</p>
                <p className="text-xs font-semibold text-purple-600 mt-1">50:50</p>
                <p className="text-xs text-purple-500 font-bold mt-0.5">{fiftyAcc}% accuracy</p>
              </div>
              <div className="bg-yellow-50 rounded-xl p-4 text-center border border-yellow-100">
                <p className="text-2xl font-black text-yellow-700">{analytics.buttonUsageStats.totalGuess}</p>
                <p className="text-xs font-semibold text-yellow-600 mt-1">Guess</p>
                <p className="text-xs text-yellow-500 font-bold mt-0.5">{guessAcc}% accuracy</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Slowest Questions (Time Management) ── */}
        {slowestQuestions.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-black text-gray-900 text-sm uppercase tracking-tight">Time Management</h3>
                <p className="text-xs text-gray-400">Top 10 slowest questions</p>
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              {slowestQuestions.map((t, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <span className="text-xs font-black text-gray-400 w-5 shrink-0">#{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-700 line-clamp-2">{t.questionText}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`text-xs font-bold ${t.timeTaken > t.targetTime ? 'text-red-600' : 'text-emerald-600'}`}>
                      {formatDuration(Math.round(t.timeTaken))}
                    </p>
                    <p className="text-[10px] text-gray-400">target: {formatDuration(t.targetTime)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── AI Feedback ── */}
        <div className={`rounded-2xl border p-6 space-y-3 ${session.ai_feedback
          ? 'bg-gradient-to-br from-[#FF6B00]/5 to-orange-50 border-[#FF6B00]/20'
          : 'bg-gray-50 border-gray-100'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#FF6B00]/10 rounded-xl flex items-center justify-center">
              <Bot className="h-5 w-5 text-[#FF6B00]" />
            </div>
            <h3 className="font-black text-gray-900 text-sm uppercase tracking-tight">AI Feedback</h3>
          </div>
          {session.ai_feedback ? (
            <p className="text-sm text-gray-700 leading-relaxed">{session.ai_feedback}</p>
          ) : (
            <div className="text-center py-4 space-y-2">
              <AlertCircle className="h-8 w-8 text-gray-300 mx-auto" />
              <p className="text-sm text-gray-400 italic">
                AI feedback not available yet.
              </p>
              {/* TODO: Integrate AI feedback generation here */}
              <p className="text-xs text-gray-300">
                Configure your AI key to enable personalised guidance.
              </p>
            </div>
          )}
        </div>

        {/* ── Strategy Suggestions ── */}
        {analytics?.suggestions && analytics.suggestions.length > 0 && (
          <div className="bg-gray-900 rounded-[2rem] p-8 text-white space-y-4">
            <h3 className="font-black text-sm uppercase tracking-widest flex items-center gap-2">
              <Zap className="h-4 w-4 text-[#FF6B00]" /> Strategy Protocol
            </h3>
            <div className="space-y-3">
              {analytics.suggestions.map((s, i) => (
                <div key={i} className="flex gap-3">
                  <span className="text-[#FF6B00] font-black italic shrink-0">#{i + 1}</span>
                  <p className="text-sm text-gray-300 leading-relaxed">{s}</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
