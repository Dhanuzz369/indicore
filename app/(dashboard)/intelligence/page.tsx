'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/supabase/auth'
import { getSkillProfile, getSessionCount } from '@/lib/supabase/queries'
import { computeReadinessScore } from '@/lib/intelligence/skill-model'
import { Loader2, Brain, TrendingDown, Clock, AlertTriangle, Zap, BookOpen, ChevronRight, Lightbulb } from 'lucide-react'
import { toast } from 'sonner'
import type { SkillProfile, SubjectScore, SubtopicRating, BehaviorSignals, Recommendation } from '@/types'

function ReadinessMeter({ score }: { score: number }) {
  const color = score >= 70 ? 'text-emerald-500' : score >= 45 ? 'text-orange-500' : 'text-red-500'
  const bg = score >= 70 ? 'bg-emerald-500' : score >= 45 ? 'bg-[#FF6B00]' : 'bg-red-500'
  const label = score >= 70 ? 'Strong' : score >= 45 ? 'Developing' : 'Needs Work'
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col items-center gap-4">
      <div className="relative w-36 h-36">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          <circle cx="60" cy="60" r="50" fill="none" stroke="#F3F4F6" strokeWidth="10" />
          <circle
            cx="60" cy="60" r="50" fill="none"
            stroke={score >= 70 ? '#10B981' : score >= 45 ? '#FF6B00' : '#EF4444'}
            strokeWidth="10"
            strokeDasharray={`${(score / 100) * 314} 314`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-4xl font-black ${color}`}>{score}</span>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">/ 100</span>
        </div>
      </div>
      <div className="text-center">
        <p className="font-black text-gray-900 text-lg">Readiness Score</p>
        <span className={`text-xs font-black uppercase tracking-widest px-2.5 py-1 rounded-full mt-1 inline-block ${score >= 70 ? 'bg-emerald-50 text-emerald-600' : score >= 45 ? 'bg-orange-50 text-orange-600' : 'bg-red-50 text-red-600'}`}>{label}</span>
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, warn }: { label: string; value: string; sub?: string; warn?: boolean }) {
  return (
    <div className={`bg-white rounded-2xl border ${warn ? 'border-red-100' : 'border-gray-100'} shadow-sm p-5`}>
      <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">{label}</p>
      <p className={`text-2xl font-black ${warn ? 'text-red-500' : 'text-gray-900'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 font-medium mt-1">{sub}</p>}
    </div>
  )
}

export default function IntelligencePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<SkillProfile | null>(null)
  const [sessionCount, setSessionCount] = useState(0)
  const [readiness, setReadiness] = useState(0)
  const [subjects, setSubjects] = useState<SubjectScore[]>([])
  const [subtopics, setSubtopics] = useState<SubtopicRating[]>([])
  const [behavior, setBehavior] = useState<BehaviorSignals | null>(null)
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])

  useEffect(() => {
    const load = async () => {
      try {
        const user = await getCurrentUser()
        if (!user) { router.push('/login'); return }
        const [prof, count] = await Promise.all([
          getSkillProfile(user.$id),
          getSessionCount(user.$id),
        ])
        setSessionCount(count)
        if (!prof) { setLoading(false); return }
        setProfile(prof)
        setReadiness(computeReadinessScore(prof))
        try { setSubjects(JSON.parse(prof.subject_scores_json)) } catch {}
        try {
          const ratings: SubtopicRating[] = JSON.parse(prof.subtopic_scores_json)
          setSubtopics(ratings.filter(r => r.subtopicId !== '__unknown__').sort((a, b) => a.rating - b.rating))
        } catch {}
        try { setBehavior(JSON.parse(prof.behavior_signals_json)) } catch {}
        try { setRecommendations(JSON.parse(prof.recommendations_json)) } catch {}
      } catch {
        toast.error('Failed to load intelligence data.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 text-[#FF6B00] animate-spin" />
      </div>
    )
  }

  // Not enough sessions yet
  if (sessionCount < 3 || !profile) {
    return (
      <div className="min-h-screen bg-[#F8F9FC]">
        <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6">
          <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto">
            <Brain className="h-10 w-10 text-[#FF6B00]" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">Intelligence Engine</h1>
            <p className="text-gray-500 mt-2 text-sm max-w-xs mx-auto">
              Complete at least <span className="font-bold text-gray-700">3 tests</span> to unlock your personalised skill analysis and guidance.
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-gray-600">Sessions completed</span>
              <span className="font-black text-gray-900">{sessionCount} / 3</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-[#FF6B00] rounded-full transition-all" style={{ width: `${Math.min(100, (sessionCount / 3) * 100)}%` }} />
            </div>
          </div>
          <button
            onClick={() => router.push('/quiz')}
            className="bg-[#FF6B00] hover:bg-[#FF8C00] text-white px-8 py-3 rounded-2xl font-black text-sm shadow-lg shadow-orange-100 transition-colors"
          >
            Start a Practice Test
          </button>
        </div>
      </div>
    )
  }

  const weakSubjects = [...subjects].sort((a, b) => a.accuracy - b.accuracy).slice(0, 3)
  const weakSubtopics = subtopics.slice(0, 4)
  const revise = recommendations.filter(r => r.type === 'revise')
  const practice = recommendations.filter(r => r.type === 'practice')
  const speedDrills = recommendations.filter(r => r.type === 'speed_drill')

  return (
    <div className="min-h-screen bg-[#F8F9FC]">
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 space-y-8">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#FF6B00] rounded-xl flex items-center justify-center shadow-md shadow-orange-100">
            <Brain className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Intelligence Engine</h1>
            <p className="text-sm text-gray-500 font-medium">Based on {sessionCount} sessions · Updated after every test</p>
          </div>
        </div>

        {/* Readiness + Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <ReadinessMeter score={readiness} />
          </div>
          <StatCard
            label="Sure But Wrong"
            value={behavior ? `${behavior.sureButWrongRate.toFixed(0)}%` : '—'}
            sub="of confident answers were incorrect"
            warn={(behavior?.sureButWrongRate ?? 0) > 25}
          />
          <StatCard
            label="Avg Time / Question"
            value={behavior ? `${Math.round(behavior.avgTimePerQuestion)}s` : '—'}
            sub="target: 120s"
            warn={(behavior?.avgTimePerQuestion ?? 0) > 150}
          />
          <StatCard
            label="Sessions Analysed"
            value={String(behavior?.totalSessions ?? sessionCount)}
            sub="ELO ratings updated"
          />
        </div>

        {/* Weak Subjects */}
        {weakSubjects.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-5">
              <TrendingDown className="h-4 w-4 text-red-500" />
              <h2 className="font-black text-gray-900 text-base">Weakest Subjects</h2>
            </div>
            <div className="space-y-3">
              {weakSubjects.map(sub => (
                <div key={sub.subjectId} className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-gray-700">{sub.subjectId}</span>
                      <span className="text-sm font-black text-gray-900">{sub.accuracy.toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${sub.accuracy < 40 ? 'bg-red-500' : sub.accuracy < 60 ? 'bg-orange-400' : 'bg-emerald-500'}`}
                        style={{ width: `${sub.accuracy}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs font-bold text-gray-400 shrink-0">ELO {sub.avgRating}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Weak Subtopics */}
        {weakSubtopics.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-5">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <h2 className="font-black text-gray-900 text-base">Confused Topics</h2>
              <span className="text-xs font-semibold text-gray-400 ml-auto">Lowest ELO ratings</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {weakSubtopics.map(st => (
                <div key={st.subtopicId} className="bg-orange-50 rounded-xl p-4 border border-orange-100">
                  <p className="text-sm font-black text-gray-900 truncate">{st.subtopicId}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{st.subjectId}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-lg font-black text-orange-600">{st.rating}</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{st.attempts} attempts</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Confidence Errors */}
        {behavior && (behavior.sureButWrongRate > 0 || behavior.guessRate > 0) && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-5">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <h2 className="font-black text-gray-900 text-base">Confidence Mistakes</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className={`rounded-xl p-4 ${behavior.sureButWrongRate > 25 ? 'bg-red-50 border border-red-100' : 'bg-gray-50 border border-gray-100'}`}>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Sure but Wrong</p>
                <p className={`text-3xl font-black mt-1 ${behavior.sureButWrongRate > 25 ? 'text-red-500' : 'text-gray-700'}`}>{behavior.sureButWrongRate.toFixed(0)}%</p>
                <p className="text-xs text-gray-500 mt-1">of confident answers were incorrect</p>
              </div>
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Guess Dependency</p>
                <p className="text-3xl font-black text-gray-700 mt-1">{behavior.guessRate.toFixed(0)}%</p>
                <p className="text-xs text-gray-500 mt-1">of answers marked as guesses</p>
              </div>
            </div>
          </div>
        )}

        {/* Action Plan */}
        {recommendations.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-5">
              <Lightbulb className="h-4 w-4 text-[#FF6B00]" />
              <h2 className="font-black text-gray-900 text-base">Your Action Plan</h2>
            </div>
            <div className="space-y-4">
              {revise.length > 0 && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-2">Revise</p>
                  {revise.map((r, i) => (
                    <div key={i} className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
                      <span className="h-5 w-5 rounded-full bg-red-50 text-red-500 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">{r.priority}</span>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{r.target.subtopicId ?? r.target.subjectId ?? 'General revision'}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{r.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {practice.length > 0 && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-2">Practice</p>
                  {practice.map((r, i) => (
                    <div key={i} className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
                      <span className="h-5 w-5 rounded-full bg-blue-50 text-blue-500 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">{r.priority}</span>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{r.target.subtopicId ?? r.target.subjectId ?? 'Targeted practice'}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{r.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {speedDrills.length > 0 && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-purple-500 mb-2">Speed Drills</p>
                  {speedDrills.map((r, i) => (
                    <div key={i} className="flex items-start gap-3 py-2.5">
                      <Zap className="h-4 w-4 text-purple-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-gray-900">Time improvement needed</p>
                        <p className="text-xs text-gray-500 mt-0.5">{r.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* CTAs */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => router.push('/quiz')}
            className="flex items-center justify-center gap-2 h-14 rounded-2xl bg-[#FF6B00] hover:bg-[#FF8C00] text-white font-black text-sm shadow-lg shadow-orange-100 transition-colors"
          >
            <Zap className="h-4 w-4" /> Start Practice
          </button>
          <button
            onClick={() => router.push('/notes')}
            className="flex items-center justify-center gap-2 h-14 rounded-2xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 font-black text-sm transition-colors"
          >
            <BookOpen className="h-4 w-4" /> Revision Deck
          </button>
        </div>

      </div>
    </div>
  )
}
