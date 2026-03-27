'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/supabase/auth'
import { getSkillProfile, getSessionCount } from '@/lib/supabase/queries'
import { Loader2, Brain, TrendingDown, AlertTriangle, Zap, BookOpen, Lightbulb, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import type { SkillProfile, SubjectScore, SubtopicRating, BehaviorSignals, Recommendation } from '@/types'


export default function IntelligencePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<SkillProfile | null>(null)
  const [sessionCount, setSessionCount] = useState(0)
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

  // Subjects below 50% accuracy — shown in Weaker Subjects frame
  const weakSubjects = subjects.filter(s => s.accuracy < 50).sort((a, b) => a.accuracy - b.accuracy)

  // Confused topics: wrong 3+ times out of 5+ attempts
  const confusedTopics = subtopics
    .filter(st => (st.wrong_count ?? 0) >= 3 && st.attempts >= 5)
    .sort((a, b) => (b.wrong_count ?? 0) - (a.wrong_count ?? 0))

  // Rotational batch: advances every 3 sessions, shows 4 cards at a time
  const BATCH_SIZE = 4
  const batchIndex = Math.floor(Math.max(0, sessionCount - 3) / 3)
  const batchStart = confusedTopics.length > 0
    ? (batchIndex * BATCH_SIZE) % confusedTopics.length
    : 0
  // Wrap-around slice: take 4 starting from batchStart, wrapping if near end
  const confusedBatch = confusedTopics.length > 0
    ? Array.from({ length: Math.min(BATCH_SIZE, confusedTopics.length) }, (_, i) =>
        confusedTopics[(batchStart + i) % confusedTopics.length]
      )
    : []

  const revise = recommendations.filter(r => r.type === 'revise')
  const practice = recommendations.filter(r => r.type === 'practice')
  const speedDrills = recommendations.filter(r => r.type === 'speed_drill')

  // Sure But Wrong from behavior signals
  const sureButWrongRate = behavior?.sureButWrongRate ?? 0
  const sureButWrongHigh = sureButWrongRate > 25

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

        {/* Sure But Wrong — slim banner */}
        {behavior && (
          <div className={`rounded-2xl border p-5 flex items-center gap-4 ${sureButWrongHigh ? 'bg-red-50 border-red-100' : 'bg-white border-gray-100 shadow-sm'}`}>
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${sureButWrongHigh ? 'bg-red-100' : 'bg-orange-50'}`}>
              <AlertCircle className={`h-5 w-5 ${sureButWrongHigh ? 'text-red-500' : 'text-orange-500'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Sure But Wrong</p>
              <p className={`text-2xl font-black leading-tight ${sureButWrongHigh ? 'text-red-500' : 'text-gray-900'}`}>
                {sureButWrongRate.toFixed(0)}%
              </p>
            </div>
            <p className="text-xs text-gray-400 font-medium text-right max-w-[160px] leading-relaxed">
              {sureButWrongHigh
                ? 'High — you are overconfident on wrong answers'
                : 'of confident answers were incorrect'}
            </p>
          </div>
        )}

        {/* Weaker Subjects — <50% accuracy */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <TrendingDown className="h-4 w-4 text-red-500" />
            <h2 className="font-black text-gray-900 text-base">Weaker Subjects</h2>
            <span className="text-xs font-semibold text-gray-400 ml-auto">Below 50% accuracy</span>
          </div>
          {weakSubjects.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm font-bold text-emerald-600">All subjects above 50% — strong work!</p>
              <p className="text-xs text-gray-400 mt-1">Keep taking tests to track subject trends</p>
            </div>
          ) : (
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
                        className={`h-full rounded-full transition-all ${sub.accuracy < 30 ? 'bg-red-500' : 'bg-orange-400'}`}
                        style={{ width: `${sub.accuracy}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs font-bold text-gray-400 shrink-0">{sub.attempts} attempts</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Confused Topics — rotational batch */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <h2 className="font-black text-gray-900 text-base">Confused Topics</h2>
            {confusedTopics.length > BATCH_SIZE && (
              <span className="text-xs font-semibold text-gray-400 ml-auto">
                {Math.floor(batchStart / BATCH_SIZE) + 1} of {Math.ceil(confusedTopics.length / BATCH_SIZE)} · rotates every 3 tests
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 font-medium mb-5">Wrong 3+ times out of 5+ attempts</p>
          {confusedBatch.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm font-bold text-gray-500">No confused topics yet</p>
              <p className="text-xs text-gray-400 mt-1">A topic appears here when you get it wrong 3+ times out of 5 attempts</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {confusedBatch.map(st => (
                <div key={st.subtopicId} className="bg-orange-50 rounded-xl p-4 border border-orange-100">
                  <p className="text-sm font-black text-gray-900 truncate">{st.subtopicId}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{st.subjectId}</p>
                  <div className="mt-3">
                    <span className="text-lg font-black text-orange-600">
                      {st.wrong_count ?? 0}/{st.attempts} wrong
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

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
