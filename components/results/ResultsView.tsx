'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useQuizStore } from '@/store/quiz-store'
import { getTestSession, listAttemptsBySession, getQuestionsByIds, getSubjects } from '@/lib/supabase/queries'
import {
  CheckCircle, ChevronDown, BookOpen, Clock, RefreshCw, Home,
  Brain, Target, Zap, Loader2, ArrowLeft, TrendingDown, Sparkles
} from 'lucide-react'
import type { Question, SelectionEvent } from '@/types'
import { generateTestAnalytics } from '@/lib/analytics/engine'
import { toast } from 'sonner'
import { FeedbackCard } from './FeedbackCard'
import { FeedbackModal } from './FeedbackModal'
import FullMockNudgeModal from '@/components/modals/FullMockNudgeModal'


// ─── Helpers ──────────────────────────────────────────────────

function resolveSubjectName(session: {
  paper_label?: string | null
  analytics?: string | Record<string, unknown> | null
}): string {
  // Priority 1: paper_label (e.g. "Polity Practice")
  if (session.paper_label) return session.paper_label

  // Priority 2: first subject from analytics.subjectStats
  try {
    const analytics = typeof session.analytics === 'string'
      ? JSON.parse(session.analytics)
      : session.analytics
    const firstSubject = analytics?.subjectStats?.[0]?.subject
    if (firstSubject) return firstSubject
  } catch { /* ignore */ }

  // Priority 3: fallback
  return 'this subject'
}

function confLabel(tag: string | null | undefined) {
  if (tag === 'sure') return '100% Sure'
  if (tag === 'fifty_fifty') return '50:50'
  if (tag === 'guess') return "It's a Guess"
  return 'Not Tagged'
}

function formatTime(seconds: number | undefined) {
  if (seconds === undefined) return '0s'
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${s}s`
}

function getSureInsight(mistakes: number): { message: string; recommendation: string } | null {
  if (mistakes === 0) return null
  if (mistakes <= 2) return {
    message: 'You did well, but aim for 100% accuracy here.',
    recommendation: 'Recheck all the questions you were sure in — look for traps like "correct/incorrect" or tricky wording of statements.',
  }
  if (mistakes <= 5) return {
    message: 'You are dealing with overconfidence — revisit these questions.',
    recommendation: 'Revise the topics these questions belong to and understand the nuances.',
  }
  return {
    message: 'Serious knowledge gap — this can spoil your whole attempt.',
    recommendation: 'Do not attempt questions based on assumption. Fill knowledge gaps and revise core concepts.',
  }
}

function getHitRateInsight(hitRate: number): { message: string; recommendation: string } {
  if (hitRate >= 40) return {
    message: 'Calculated guesses are working — keep following this elimination technique.',
    recommendation: 'Revisit and revise to convert some of them into the "Sure" category next time.',
  }
  return {
    message: 'You are moving from elimination to gamble — high chances of bleeding marks here.',
    recommendation: 'Attempt such questions only when you can clearly eliminate 2 options, or move them into the "Guess" category.',
  }
}

function getScoreThreshold(pct: number) {
  if (pct >= 80) return { label: 'Outstanding! 🏆' }
  if (pct >= 60) return { label: 'Great Work! 🎯' }
  if (pct >= 40) return { label: 'Good Effort! 📚' }
  if (pct >= 20) return { label: 'Keep Practising! 💪' }
  return { label: 'Needs More Work! 🔥' }
}

/** Format a list of numbers into "1, 2, and 3" style */
function formatQuestionList(nums: number[]): string {
  if (nums.length === 0) return ''
  if (nums.length === 1) return `${nums[0]}`
  if (nums.length === 2) return `${nums[0]} and ${nums[1]}`
  return `${nums.slice(0, -1).join(', ')}, and ${nums[nums.length - 1]}`
}

// ─── Sub-components ───────────────────────────────────────────

function SubjectPerformanceCard({
  subject, label, correct, total, accuracy, questions, answers, onQuestionClick
}: {
  subject: string   // UUID — used for filtering questions
  label: string     // resolved name — used for display
  correct: number
  total: number
  accuracy: number
  questions: Question[]
  answers: Record<string, any>
  onQuestionClick: (questionIndex: number) => void
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const subjectQuestions = questions.filter(q => q.subject_id === subject)

  // Collect unique subtopics from wrong answers for "Areas to revisit"
  const areasToRevisit = useMemo(() => {
    const seen = new Set<string>()
    for (const q of subjectQuestions) {
      const ans = answers[q.$id]
      if (ans && ans.isCorrect === false && q.subtopic) {
        seen.add(q.subtopic)
      }
    }
    return Array.from(seen).slice(0, 6) // max 6 chips
  }, [subjectQuestions, answers])

  return (
    <div className="bg-white shadow-sm rounded-2xl border border-gray-200 transition-all hover:border-white/[0.10]">
      <div
        className="flex items-center justify-between p-5 md:p-6 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm ${accuracy >= 70 ? 'bg-emerald-500/10 text-emerald-400' : accuracy >= 50 ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'}`}>
            {accuracy}%
          </div>
          <div>
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">{(label ?? subject ?? 'Unknown').replace(/_/g, ' ')}</h3>
            <p className="text-xs text-gray-700 font-bold uppercase">{correct} / {total} Correct</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-xs text-gray-800 font-medium">
            {isExpanded ? 'Hide questions' : 'Show questions'}
          </span>
          <div className={`w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-800 hover:text-gray-900/60 transition-all ${isExpanded ? 'rotate-180' : ''}`}>
            <ChevronDown className="h-4 w-4" />
          </div>
        </div>
      </div>
      {/* ── Mini stacked progress bar ── */}
      <div className="h-1 flex overflow-hidden">
        {(() => {
          const correct = subjectQuestions.filter(q => answers[q.$id]?.isCorrect === true).length
          const wrong = subjectQuestions.filter(q => answers[q.$id]?.isCorrect === false).length
          const skipped = subjectQuestions.length - correct - wrong
          const total = subjectQuestions.length || 1
          return (
            <>
              <div className="bg-emerald-500/60 transition-all duration-1000" style={{ width: `${(correct / total) * 100}%` }} />
              <div className="bg-red-500/60 transition-all duration-1000" style={{ width: `${(wrong / total) * 100}%` }} />
              <div className="bg-gray-100 transition-all duration-1000" style={{ width: `${(skipped / total) * 100}%` }} />
            </>
          )
        })()}
      </div>
      {isExpanded && (
        <div className="px-5 pb-5 md:px-6 md:pb-6 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="border-t border-gray-100 pt-5">
            <p className="text-[9px] font-black text-gray-800 uppercase tracking-[0.2em] mb-4">
              Question Numbers — click to review
            </p>
            <div className="flex flex-wrap gap-2">
              {subjectQuestions.map((q) => {
                const answer = answers[q.$id]
                const isCorrect = answer?.isCorrect
                const isSkipped = !answer
                const globalIndex = questions.findIndex(allQ => allQ.$id === q.$id)
                let statusColor = 'bg-gray-100 text-gray-700 border-gray-200 hover:border-white/20'
                if (isCorrect) statusColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:border-emerald-500/40'
                else if (!isSkipped) statusColor = 'bg-red-500/10 text-red-400 border-red-500/20 hover:border-red-500/40'
                const confTag = answer?.confidenceTag
                const confDot = confTag === 'sure' ? 'ring-1 ring-emerald-400/60'
                  : confTag === 'fifty_fifty' ? 'ring-1 ring-purple-400/60'
                  : confTag === 'guess' ? 'ring-1 ring-yellow-400/60'
                  : ''
                const wasRevised = (answer?.selectionHistory?.change_count ?? 0) > 0
                return (
                  <div key={q.$id} className="relative">
                    <button
                      title={`Q${globalIndex + 1} — ${isSkipped ? 'Not Answered' : isCorrect ? 'Correct' : 'Incorrect'}${confTag ? ` (${confLabel(confTag)})` : ''}${wasRevised ? ' · Revised' : ''} — Took ${formatTime(answer?.timeTaken)}`}
                      onClick={() => onQuestionClick(globalIndex)}
                      className={`h-9 w-9 flex items-center justify-center rounded-xl font-black text-xs border transition-all hover:scale-110 ${statusColor} ${confDot}`}
                    >
                      {globalIndex + 1}
                    </button>
                    {wasRevised && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-400 rounded-full border border-[#111827]" />
                    )}
                  </div>
                )
              })}
            </div>
            <div className="flex flex-wrap gap-4 mt-4 text-[9px] text-gray-800">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500/10 border border-emerald-500/30" />Correct</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-500/10 border border-red-500/30" />Wrong</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-100 border border-gray-200" />Skipped</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border border-emerald-400/60" />Sure</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border border-purple-400/60" />50:50</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border border-yellow-400/60" />Guess</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />Revised</span>
            </div>

            {/* Areas to revisit */}
            {areasToRevisit.length > 0 && (
              <div className="mt-5 pt-4 border-t border-gray-100">
                <p className="text-[9px] font-black text-gray-800 uppercase tracking-[0.2em] mb-3">
                  Areas to revisit
                </p>
                <div className="flex flex-wrap gap-2">
                  {areasToRevisit.map(area => (
                    <span
                      key={area}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function TaggedQuestionsDropdown({
  tag, title, questions, answers, confidenceMap, onQuestionClick
}: {
  tag: 'sure' | 'fifty_fifty' | 'guess'
  title: string
  questions: Question[]
  answers: Record<string, any>
  confidenceMap: Record<string, string>
  onQuestionClick: (index: number) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const taggedItems = questions.map((q, index) => {
    const finalTag = confidenceMap[q.$id] || answers[q.$id]?.confidenceTag || null
    return { q, index, finalTag, answer: answers[q.$id] }
  }).filter(item => item.finalTag === tag)

  if (taggedItems.length === 0) return null

  const themeClass = tag === 'sure'
    ? 'text-emerald-400 bg-emerald-500/[0.08] hover:bg-emerald-500/[0.12] border-emerald-500/20'
    : tag === 'fifty_fifty'
      ? 'text-blue-400 bg-blue-500/[0.08] hover:bg-blue-500/[0.12] border-blue-500/20'
      : 'text-violet-400 bg-violet-500/[0.08] hover:bg-violet-500/[0.12] border-violet-500/20'

  return (
    <div className="mt-3 rounded-xl overflow-hidden border transition-all duration-300" style={{ borderColor: 'rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-4 py-3 text-xs font-black transition-all ${themeClass}`}
      >
        <div className="flex items-center gap-2">
          <BookOpen className="h-3.5 w-3.5 opacity-70" />
          <span className="uppercase tracking-widest">{title}</span>
          <span className="px-1.5 py-0.5 rounded-md bg-gray-200 text-[10px] ml-1">{taggedItems.length}</span>
        </div>
        <ChevronDown className={`h-4 w-4 transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <div className={`transition-all duration-500 ease-in-out ${isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
        <div className="p-4 border-t border-gray-100">
          <p className="text-[9px] font-black text-gray-800 uppercase tracking-widest mb-3">Questions marked as {tag.replace('_', ':')}</p>
          <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2">
            {taggedItems.map(({ q, index, answer }) => {
              const isCorrect = answer?.isCorrect
              let statusStyle = 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-white/[0.08]'
              if (isCorrect === true) statusStyle = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
              else if (isCorrect === false) statusStyle = 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
              return (
                <button
                  key={q.$id}
                  onClick={() => onQuestionClick(index)}
                  className={`flex items-center justify-center h-9 w-9 rounded-xl text-[11px] font-black border transition-all hover:scale-110 active:scale-95 ${statusStyle}`}
                  title={`${isCorrect === true ? 'Correct' : isCorrect === false ? 'Incorrect' : 'Skipped'}`}
                >
                  {index + 1}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Local data shape for replay ──────────────────────────────

interface LocalData {
  questions: Question[]
  answers: Record<string, any>
  confidenceMap: Record<string, string>
  elapsedSeconds: number
  paperLabel: string
  isFullLength: boolean
}

// ─── Props ─────────────────────────────────────────────────────

interface ResultsViewProps {
  sessionId: string
  replayMode?: boolean
}

// ─── Main component ────────────────────────────────────────────

export function ResultsView({ sessionId, replayMode = false }: ResultsViewProps) {
  const router = useRouter()

  // ── Zustand store (live mode only) ──
  const {
    questions: storeQuestions,
    answers: storeAnswers,
    confidenceMap: storeConfidenceMap,
    elapsedSeconds: storeElapsed,
    paperLabel: storePaperLabel,
    testMode: storeTestMode,
    getScore,
    reset,
    // live rehydration setters
    setQuestions, setAnswers, setConfidenceForQuestion,
    setTestMode, setPaperLabel, setElapsed, setConfidenceMap,
  } = useQuizStore()

  const setPendingReattempt = useQuizStore(s => s.setPendingReattempt)

  // ── Local state (replay mode only — fully isolated from store) ──
  const [localData, setLocalData] = useState<LocalData | null>(null)
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null)

  const [isRehydrating, setIsRehydrating] = useState(false)
  const [storedAnalytics, setStoredAnalytics] = useState<any>(null)
  const [subjectMap, setSubjectMap] = useState<Record<string, string>>({})

  // Load subjects once for UUID → name resolution
  useEffect(() => {
    getSubjects().then(res => {
      const map: Record<string, string> = {}
      for (const s of res.documents as any[]) map[s.$id] = s.Name
      setSubjectMap(map)
    }).catch(() => {})
  }, [])

  // ── Which data source to display ──
  const displayQuestions  = replayMode ? (localData?.questions  ?? []) : storeQuestions
  const displayAnswers    = replayMode ? (localData?.answers    ?? {}) : storeAnswers
  const displayConfMap    = replayMode ? (localData?.confidenceMap ?? {}) : storeConfidenceMap
  const displayElapsed    = replayMode ? (localData?.elapsedSeconds ?? 0) : storeElapsed
  const displayPaperLabel = replayMode ? (localData?.paperLabel ?? '') : storePaperLabel

  const reattemptQuestions = useMemo(
    () => displayQuestions.filter(q => {
      const ans = displayAnswers[q.$id]
      return !ans || !ans.isCorrect
    }),
    [displayQuestions, displayAnswers]
  )

  // ─── REPLAY REHYDRATION (local state, never touches store) ───
  useEffect(() => {
    if (!replayMode || !sessionId) return

    let cancelled = false
    const load = async () => {
      setIsRehydrating(true)
      setStoredAnalytics(null)
      setLocalData(null)
      try {
        const session = await getTestSession(sessionId)
        if (cancelled) return
        if (!session) throw new Error('Session not found')

        // Parse stored analytics (do NOT recalculate)
        if (session.analytics || session.results_history) {
          try {
            const raw = session.results_history || session.analytics
            setStoredAnalytics(typeof raw === 'string' ? JSON.parse(raw) : raw)
          } catch { /* ignore */ }
        }

        // Prefer snapshot — exact frozen replay
        if (session.snapshot) {
          try {
            const snap = typeof session.snapshot === 'string' ? JSON.parse(session.snapshot) : session.snapshot
            if (snap.questions?.length > 0) {
              if (!cancelled) setLocalData({
                questions: snap.questions,
                answers: snap.answers ?? {},
                confidenceMap: snap.confidenceMap ?? {},
                elapsedSeconds: snap.elapsedSeconds ?? session.total_time_seconds,
                paperLabel: snap.paperLabel ?? session.paper_label,
                isFullLength: session.mode === 'full_length',
              })
              return
            }
          } catch { /* fall through to DB */ }
        }

        // Fallback: reconstruct from Appwrite attempts + questions
        const qIds: string[] = session.question_ids ? JSON.parse(session.question_ids) : []
        if (qIds.length === 0) {
          // Legacy session with no question data — show summary-only view
          if (!cancelled) setLocalData({
            questions: [],
            answers: {},
            confidenceMap: {},
            elapsedSeconds: session.total_time_seconds ?? 0,
            paperLabel: session.paper_label ?? 'Practice Session',
            isFullLength: session.mode === 'full_length',
          })
          return
        }

        const [attResult, qResult] = await Promise.all([
          listAttemptsBySession(sessionId),
          getQuestionsByIds(qIds),
        ])
        if (cancelled) return

        const orderedQs = qIds
          .map((id: string) => (qResult.documents as unknown as Question[]).find(q => q.$id === id))
          .filter(Boolean) as Question[]

        const reconstructedAnswers: Record<string, any> = {}
        const reconstructedConfMap: Record<string, string> = {}

        attResult.documents.forEach((att: any) => {
          reconstructedAnswers[att.question_id] = {
            selectedOption: att.selected_option,
            isCorrect: att.is_correct,
            timeTaken: att.time_taken_seconds,
            confidenceTag: att.confidence_tag,
            used5050: !!att.used_5050,
            isGuess: !!(att.is_guess || att.used_guess),
            usedAreYouSure: !!att.used_areyousure,
            selectionHistory: (() => { if (!att.selection_history) return { events: [], change_count: 0 }; const p = JSON.parse(att.selection_history); return p.selections ?? p })(),
          }
          if (att.confidence_tag) reconstructedConfMap[att.question_id] = att.confidence_tag
        })

        if (!cancelled) setLocalData({
          questions: orderedQs,
          answers: reconstructedAnswers,
          confidenceMap: reconstructedConfMap,
          elapsedSeconds: session.total_time_seconds,
          paperLabel: session.paper_label,
          isFullLength: session.mode === 'full_length',
        })
      } catch (e: any) {
        console.error('Replay load failed:', e)
        if (!cancelled) toast.error('Failed to load this test session.')
      } finally {
        if (!cancelled) setIsRehydrating(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [sessionId, replayMode])

  // ─── LIVE REHYDRATION (store, for /results?session=id fallback) ─
  useEffect(() => {
    if (replayMode || !sessionId || storeQuestions.length > 0) return

    let cancelled = false
    const load = async () => {
      setIsRehydrating(true)
      try {
        const session = await getTestSession(sessionId)
        if (cancelled || !session) return

        if (session.analytics || session.results_history) {
          try {
            const raw = session.results_history || session.analytics
            setStoredAnalytics(typeof raw === 'string' ? JSON.parse(raw) : raw)
          } catch { /* ignore */ }
        }

        if (session.snapshot) {
          try {
            const snap = typeof session.snapshot === 'string' ? JSON.parse(session.snapshot) : session.snapshot
            if (snap.questions?.length > 0) {
              setQuestions(snap.questions)
              setTestMode(session.mode === 'full_length')
              setPaperLabel(snap.paperLabel || session.paper_label)
              setElapsed(snap.elapsedSeconds || session.total_time_seconds)
              if (snap.answers) setAnswers(snap.answers)
              if (snap.confidenceMap) setConfidenceMap(snap.confidenceMap)
              return
            }
          } catch { /* fall through */ }
        }

        const attResult = await listAttemptsBySession(sessionId)
        const qIds: string[] = session.question_ids ? JSON.parse(session.question_ids) : []
        if (qIds.length === 0) return

        const qResult = await getQuestionsByIds(qIds)
        const orderedQs = qIds
          .map((id: string) => (qResult.documents as unknown as Question[]).find(q => q.$id === id))
          .filter(Boolean)

        if (cancelled) return
        setQuestions(orderedQs as any)
        setTestMode(session.mode === 'full_length')
        setPaperLabel(session.paper_label)
        setElapsed(session.total_time_seconds)

        const reconstructedAnswers: Record<string, any> = {}
        attResult.documents.forEach((att: any) => {
          reconstructedAnswers[att.question_id] = {
            selectedOption: att.selected_option,
            isCorrect: att.is_correct,
            timeTaken: att.time_taken_seconds,
            confidenceTag: att.confidence_tag,
            used5050: !!att.used_5050,
            isGuess: !!(att.is_guess || att.used_guess),
            usedAreYouSure: !!att.used_areyousure,
            selectionHistory: (() => { if (!att.selection_history) return { events: [], change_count: 0 }; const p = JSON.parse(att.selection_history); return p.selections ?? p })(),
          }
          if (att.confidence_tag) setConfidenceForQuestion(att.question_id, att.confidence_tag)
        })
        setAnswers(reconstructedAnswers)
      } catch (e: any) {
        console.error('Rehydration failed:', e)
        toast.error('Failed to reconstruct analysis.')
      } finally {
        if (!cancelled) setIsRehydrating(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [sessionId, replayMode, storeQuestions.length, setQuestions, setAnswers, setConfidenceForQuestion, setTestMode, setPaperLabel, setElapsed, setConfidenceMap])

  // ─── ANALYTICS ───────────────────────────────────────────────
  const subjectsList = useMemo(
    () => Object.entries(subjectMap).map(([id, name]) => ({ $id: id, Name: name })),
    [subjectMap]
  )

  // Determine whether this is a full-length mock or practice session
  // live mode: use testMode from store; replay mode: use isFullLength from localData
  const isFullLength = replayMode ? (localData?.isFullLength ?? false) : storeTestMode

  const generatedAnalytics = useMemo(() =>
    generateTestAnalytics({
      questions: displayQuestions,
      attempts: Object.entries(displayAnswers).map(([id, ans]: [string, any]) => {
        const finalTag: 'sure' | 'fifty_fifty' | 'guess' | null = displayConfMap[id] || ans.confidenceTag || null
        return {
          question_id: id,
          selected_option: ans.selectedOption,
          is_correct: ans.isCorrect,
          time_taken_seconds: ans.timeTaken,
          used_5050: finalTag === 'fifty_fifty',
          used_guess: finalTag === 'guess',
          used_areyousure: finalTag === 'sure',
          is_guess: finalTag === 'guess',
          confidence_tag: finalTag,
          selection_history: ans.selectionHistory ? JSON.stringify(ans.selectionHistory) : undefined,
        }
      }),
      totalTestTime: displayElapsed,
      subjects: subjectsList,
      practiceMode: !isFullLength,
    }),
    [displayQuestions, displayAnswers, displayConfMap, displayElapsed, subjectsList, isFullLength]
  )

  // Resolve UUID → name in storedAnalytics if needed
  const resolvedStoredAnalytics = useMemo(() => {
    if (!storedAnalytics?.subjectStats || Object.keys(subjectMap).length === 0) return storedAnalytics
    return {
      ...storedAnalytics,
      subjectStats: storedAnalytics.subjectStats.map((s: any) => ({
        ...s,
        subject: subjectMap[s.subject] ?? s.subject ?? 'Unknown',
      })),
    }
  }, [storedAnalytics, subjectMap])

  const analytics = (resolvedStoredAnalytics?.subjectStats ? resolvedStoredAnalytics : null) || generatedAnalytics
  const score = analytics.score || getScore()

  // ─── Revision summary ──────────────────────────────────────
  const revisionSummary = useMemo(() => {
    type RevisedQ = {
      qNum: number
      firstWasCorrect: boolean
      finalIsCorrect: boolean
    }
    const revised: RevisedQ[] = []

    displayQuestions.forEach((q, idx) => {
      const answer = displayAnswers[q.$id]
      // Skip unanswered stubs
      if (!answer || !answer.selectedOption) return

      const hist = answer.selectionHistory
      const events: SelectionEvent[] = hist?.events ?? []

      // Count changes robustly: prefer change_count, fallback to counting 'change' events
      const changeCount: number =
        (typeof hist?.change_count === 'number' && hist.change_count > 0)
          ? hist.change_count
          : events.filter((e: SelectionEvent) => e.type === 'change').length

      if (changeCount === 0) return

      // Determine first answer.
      // Priority: first 'change' event's 'from' (most reliable — records original pick)
      // then 'select' event's 'option' (first explicit selection before any change)
      const firstChangeEvt = events.find((e: SelectionEvent) => e.type === 'change')
      const selectEvt      = events.find((e: SelectionEvent) => e.type === 'select')
      const firstOption: string | null = firstChangeEvt?.from ?? selectEvt?.option ?? null

      // If we can determine the first option AND the question has a correct_option, use it.
      // Otherwise fall back to isCorrect inversion: if the final answer is wrong, treat first as correct (conservative).
      let firstWasCorrect: boolean
      if (firstOption != null && q.correct_option) {
        firstWasCorrect = firstOption === q.correct_option
      } else {
        // Fallback: assume the original answer was correct (shows the card conservatively)
        firstWasCorrect = !answer.isCorrect
      }
      const finalIsCorrect = !!answer.isCorrect

      revised.push({ qNum: idx + 1, firstWasCorrect, finalIsCorrect })
    })

    if (revised.length === 0) return null

    return {
      total: revised.length,
      correctToWrong: revised.filter(r =>  r.firstWasCorrect && !r.finalIsCorrect),
      wrongToCorrect: revised.filter(r => !r.firstWasCorrect &&  r.finalIsCorrect),
      neutral:        revised.filter(r => !r.firstWasCorrect && !r.finalIsCorrect),
    }
  }, [displayQuestions, displayAnswers])

  // ── Potential Score state ──────────────────────────────────
  const [potentialRevealed, setPotentialRevealed] = useState(false)
  const [lostMarksHighlighted, setLostMarksHighlighted] = useState(false)

  // ── Subject bar chart hover state ───────────────────────────
  const [hoveredStat, setHoveredStat] = useState<{ subject: string; accuracy: number; correct: number; total: number; marksLost: number } | null>(null)

  // ── Confidence accordion state ──────────────────────────────
  const [isExpandedSure, setIsExpandedSure] = useState(false)
  const [isExpanded5050, setIsExpanded5050] = useState(false)
  const [isExpandedGuesses, setIsExpandedGuesses] = useState(false)
  const [isExpandedRevision, setIsExpandedRevision] = useState(false)
  const sureCardRef    = useRef<HTMLDivElement>(null)
  const revisionCardRef = useRef<HTMLDivElement>(null)

  // ── Potential score calculation ──────────────────────────────
  const MARKS_PER_QUESTION = 2.667
  const bu = analytics.buttonUsageStats || {}
  const sureWrong         = Math.max(0, (bu.totalAreYouSure ?? 0) - (bu.correctAreYouSure ?? 0))
  const revisionWrong     = revisionSummary?.correctToWrong?.length ?? 0
  const marksLostSure     = sureWrong * MARKS_PER_QUESTION
  const marksLostRevision = revisionWrong * MARKS_PER_QUESTION
  const rawPotential      = (score.marksScored ?? 0) + marksLostSure + marksLostRevision
  const potentialScore    = Math.min(rawPotential, 200)
  const hasRecoverableMarks = sureWrong > 0 || revisionWrong > 0

  const handleReattempt = () => {
    setPendingReattempt(reattemptQuestions, sessionId)
    router.push('/quiz/session?mode=reattempt')
  }

  const handleShowLostMarks = () => {
    setLostMarksHighlighted(true)
    setTimeout(() => {
      const target = sureWrong > 0 ? sureCardRef.current : revisionCardRef.current
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 100)
  }

  const handleQuestionClick = (index: number) => {
    if (replayMode) {
      router.push(`/tests/${sessionId}/review?q=${index}`)
    } else {
      router.push(`/results/review?q=${index}`)
    }
  }

  // ─── Loading ─────────────────────────────────────────────────
  if (isRehydrating) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] p-6 bg-gray-50">
        <Loader2 className="h-10 w-10 text-indigo-400 animate-spin mb-4" />
        <p className="text-gray-700 font-black text-sm uppercase tracking-widest">Reconstructing Analysis...</p>
      </div>
    )
  }

  // ─── Empty state ─────────────────────────────────────────────
  const hasData = displayQuestions.length > 0
  if (!hasData) {
    return (
      <div className="flex items-center justify-center min-h-[80vh] p-6 bg-gray-50">
        <div className="text-center space-y-4 max-w-xs">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto ring-1 ring-white/[0.06]">
            <BookOpen className="h-10 w-10 text-gray-800" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">No Full Analysis Available</h2>
          <p className="text-gray-700 text-sm">
            {replayMode ? 'This is a legacy session. Question-level replay data was not saved for this test.' : 'Complete a practice session to unlock the Analytical Engine.'}
          </p>
          <button
            onClick={() => router.push(replayMode ? '/tests' : '/quiz')}
            className="bg-indigo-600 text-gray-900 px-8 py-3 rounded-xl font-bold text-sm hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-900/50"
          >
            {replayMode ? 'Back to My Tests' : 'Start Practice'}
          </button>
        </div>
      </div>
    )
  }

  // ─── Merged answers with confidence ──────────────────────────
  const mergedAnswers = Object.fromEntries(
    Object.entries(displayAnswers).map(([qId, ans]: [string, any]) => [
      qId,
      { ...ans, confidenceTag: displayConfMap[qId] || ans.confidenceTag || null }
    ])
  )

  // ─── Main render ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 pb-28">

      {/* ── Header ── */}
      <div className="sticky top-0 z-30 bg-gray-50/90 backdrop-blur-xl border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-900/50">
              <Brain className="h-5 w-5 text-gray-900" />
            </div>
            <div>
              <h1 className="text-base md:text-lg font-black text-gray-900 tracking-tight leading-none uppercase italic">
                AE <span className="text-indigo-400">PRO</span>
                <span className="hidden sm:inline text-gray-700"> · Analytical Engine</span>
              </h1>
              <p className="text-[10px] text-gray-700 font-bold uppercase tracking-[0.2em] mt-0.5 max-w-[140px] sm:max-w-none truncate">
                {displayPaperLabel || 'Real-time Analysis'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {replayMode ? (
              <button
                onClick={() => setPendingNavigation(() => () => router.push('/tests'))}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-700 hover:text-gray-800 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" /> My Tests
              </button>
            ) : (
              <>
                <button
                  onClick={() => setPendingNavigation(() => () => router.push('/dashboard'))}
                  className="hidden md:flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-700 hover:text-gray-800 transition-colors"
                >
                  <Home className="h-4 w-4" /> Dashboard
                </button>
                <button
                  onClick={() => setPendingNavigation(() => () => { reset(); router.push('/quiz') })}
                  className="bg-gray-100 border border-gray-200 px-5 py-2.5 rounded-xl text-sm font-black text-gray-800 hover:bg-gray-200 hover:text-gray-900 transition-all flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" /> Retake
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-3 md:px-6 mt-5 md:mt-7 space-y-5">

        {/* ── Reattempt CTA ── */}
        {!replayMode && (
          <div className="flex justify-center px-1">
            <button
              onClick={handleReattempt}
              disabled={reattemptQuestions.length === 0}
              className="w-full sm:w-auto px-7 py-3 bg-indigo-600 text-gray-900 rounded-xl font-black text-sm uppercase tracking-wider hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-900/50 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <RefreshCw className="h-4 w-4 shrink-0" />
              Reattempt Wrong Questions ({reattemptQuestions.length})
            </button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* SECTION 1 — Hero: metric cards (left) + Trajectory (right) */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-2 lg:grid-cols-[230px_1fr] gap-4 items-start">

          {/* Left: stacked metric cards */}
          <div className="col-span-2 lg:col-span-1 grid grid-cols-2 lg:grid-cols-1 gap-4">

            {/* Current Score */}
            <div className="bg-white shadow-sm rounded-2xl border border-gray-200 p-4 md:p-5 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-28 h-28 bg-indigo-500/[0.04] rounded-full -translate-y-10 translate-x-10 pointer-events-none" />
              <p className="text-[9px] font-black text-gray-700 uppercase tracking-[0.2em] mb-2 flex items-center gap-1.5">
                <TrendingDown className="h-2.5 w-2.5" /> Current Score
              </p>
              <div className="flex items-baseline gap-1 leading-none">
                <span className={`text-[2.4rem] font-black tracking-tight leading-none ${(score.marksScored ?? 0) < 0 ? 'text-red-400' : 'text-gray-900'}`}>
                  {typeof score.marksScored === 'number' ? score.marksScored.toFixed(2) : score.correct}
                </span>
              </div>
              <p className="text-[10px] text-gray-800 font-medium mt-0.5 mb-3">out of 200.00</p>
              <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.max(2, Math.min(100, ((score.marksScored ?? 0) / 200) * 100))}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className="text-[9px] text-gray-800 font-medium">{Math.floor(displayElapsed / 60)} min</span>
                <button
                  onClick={() => handleQuestionClick(0)}
                  className="text-[9px] font-black text-indigo-400 uppercase tracking-widest hover:text-indigo-300 flex items-center gap-1 transition-colors"
                >
                  <Clock className="h-2.5 w-2.5" /> Review
                </button>
              </div>
            </div>

            {/* Potential Score — flip card */}
            <div
              className={`relative overflow-hidden rounded-2xl ${!potentialRevealed ? 'cursor-pointer' : ''}`}
              style={{ perspective: '1000px' }}
              onClick={() => !potentialRevealed && setPotentialRevealed(true)}
            >
              <div
                className="relative w-full transition-transform duration-[550ms] ease-in-out [transform-style:preserve-3d]"
                style={{ transform: potentialRevealed ? 'rotateY(180deg)' : 'rotateY(0deg)', minHeight: '160px' }}
              >
                {/* Front */}
                <div
                  className="absolute inset-0 [backface-visibility:hidden] rounded-2xl overflow-hidden flex flex-col p-4 md:p-5"
                  style={{ background: 'linear-gradient(140deg, #4F46E5 0%, #2563EB 100%)' }}
                >
                  <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,255,255,0.10) 0%, transparent 70%)' }} />
                  <div className="relative flex flex-col h-full">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3 text-white/80" />
                      <span className="text-[9px] font-black text-white/80 uppercase tracking-[0.2em]">Potential</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center py-2">
                      <p className="text-[2.2rem] font-black text-white/50 select-none tracking-tight leading-none" style={{ filter: 'blur(8px)' }}>00.00</p>
                      <p className="text-[9px] text-white/60 font-medium mt-2 uppercase tracking-widest">tap to reveal</p>
                    </div>
                    <div className="h-0.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full w-1/2 bg-white/25 rounded-full animate-pulse" />
                    </div>
                  </div>
                </div>
                {/* Back */}
                <div
                  className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] rounded-2xl overflow-hidden flex flex-col p-4 md:p-5"
                  style={{ background: 'linear-gradient(140deg, #4F46E5 0%, #2563EB 100%)' }}
                  onClick={e => e.stopPropagation()}
                >
                  <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(255,255,255,0.10) 0%, transparent 70%)' }} />
                  <div className="relative flex flex-col h-full">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3 text-white/80" />
                      <span className="text-[9px] font-black text-white/80 uppercase tracking-[0.2em]">Potential</span>
                    </div>
                    <div className="mt-2">
                      <div className="flex items-baseline gap-1.5 leading-none">
                        <span className="text-[2rem] font-black text-white tracking-tight leading-none">{potentialScore.toFixed(2)}</span>
                        <span className="text-sm font-bold text-white/80">/ 200</span>
                      </div>
                    </div>
                    {hasRecoverableMarks ? (
                      <div className="mt-auto">
                        <p className="text-[10px] text-white/80 font-medium leading-snug mt-1.5">
                          +<span className="font-black text-gray-900">{Math.max(0, potentialScore - (score.marksScored ?? 0)).toFixed(2)}</span> recoverable marks
                        </p>
                        <button
                          onClick={lostMarksHighlighted ? undefined : handleShowLostMarks}
                          disabled={lostMarksHighlighted}
                          className={`mt-2.5 w-full py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 ${lostMarksHighlighted ? 'bg-gray-200 text-gray-700 cursor-default' : 'bg-gray-300 text-gray-900 hover:bg-white/30'}`}
                        >
                          {lostMarksHighlighted ? 'Showing ✓' : 'See lost marks →'}
                        </button>
                      </div>
                    ) : (
                      <p className="text-[10px] text-gray-800 font-medium mt-2">No recoverable marks</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Accuracy */}
            <div className="col-span-2 lg:col-span-1 bg-white shadow-sm rounded-2xl border border-gray-200 p-4 md:p-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-[9px] font-black text-gray-700 uppercase tracking-[0.2em] mb-1">Accuracy</p>
                <p className="text-[2rem] font-black text-gray-900 leading-none">{score.percentage}<span className="text-base text-gray-700">%</span></p>
                <p className="text-[10px] text-gray-700 font-medium mt-1">{score.correct}C · {score.wrong}W · {displayQuestions.length - score.correct - score.wrong}S</p>
              </div>
              <div className="relative shrink-0 w-[60px] h-[60px]">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth="3.2" />
                  <circle
                    cx="18" cy="18" r="15.9" fill="none"
                    stroke={score.percentage >= 70 ? '#22C55E' : score.percentage >= 50 ? '#F59E0B' : '#EF4444'}
                    strokeWidth="3.2"
                    strokeDasharray={`${score.percentage} ${100 - score.percentage}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[10px] font-black text-gray-900">{score.percentage}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Analytical Trajectory — subject bar chart */}
          <div className="col-span-2 lg:col-span-1 bg-white shadow-sm rounded-2xl border border-gray-200 p-5 md:p-6 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-base font-black text-gray-900 tracking-tight">Analytical Trajectory</h3>
                <p className="text-[10px] text-gray-700 font-medium mt-0.5">Real-time score progression across last 50 mock sessions</p>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-[10px] font-black text-indigo-400 uppercase tracking-wider border border-indigo-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse inline-block" />
                Live
              </span>
            </div>

            <div className="flex items-center gap-4 mb-4 flex-wrap">
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500/60" /><span className="text-[9px] font-bold text-gray-700 uppercase tracking-wider">Below 50%</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500/60" /><span className="text-[9px] font-bold text-gray-700 uppercase tracking-wider">50–70%</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500/60" /><span className="text-[9px] font-bold text-gray-700 uppercase tracking-wider">Above 70%</span></div>
            </div>

            <div className="space-y-3 flex-1" onMouseLeave={() => setHoveredStat(null)}>
              {[...analytics.subjectStats].sort((a: any, b: any) => (a.accuracy || 0) - (b.accuracy || 0)).map((stat: any) => {
                const accuracy = stat.accuracy || 0
                const color = accuracy >= 70 ? '#22C55E' : accuracy >= 50 ? '#F59E0B' : '#EF4444'
                const subjectName = (stat.subject ?? 'Unknown').replace(/_/g, ' ')
                const isHovered = hoveredStat?.subject === subjectName
                return (
                  <div
                    key={stat.subject}
                    className="flex items-center gap-3 cursor-pointer"
                    onMouseEnter={() => setHoveredStat({ subject: subjectName, accuracy, correct: stat.correct, total: stat.total, marksLost: stat.marksLost ?? 0 })}
                  >
                    <div className="w-20 shrink-0 text-right">
                      <span className={`text-[10px] font-bold uppercase tracking-tight truncate block transition-colors duration-150 ${isHovered ? 'text-gray-900' : 'text-gray-700'}`} title={subjectName}>
                        {subjectName.length > 9 ? subjectName.slice(0, 9) : subjectName}
                      </span>
                    </div>
                    <div className={`flex-1 h-7 rounded-lg overflow-hidden relative transition-all ${isHovered ? 'ring-1 ring-white/15' : ''}`} style={{ backgroundColor: 'rgba(0,0,0,0.05)' }}>
                      <div
                        className="absolute left-0 top-0 h-full rounded-lg transition-all duration-700 ease-out flex items-center px-2.5"
                        style={{ width: `${Math.max(6, accuracy)}%`, backgroundColor: color, opacity: isHovered ? 0.9 : 0.55 }}
                      >
                        {accuracy >= 20 && <span className="text-[10px] font-black text-white whitespace-nowrap">{accuracy}%</span>}
                      </div>
                      {accuracy < 20 && (
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-black whitespace-nowrap" style={{ color }}>{accuracy}%</span>
                      )}
                    </div>
                    <div className="w-10 shrink-0 text-right">
                      <span className={`text-[9px] font-bold transition-colors duration-150 ${isHovered ? 'text-gray-900/60' : 'text-gray-800'}`}>{stat.correct}/{stat.total}</span>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className={`mt-3 transition-all duration-200 overflow-hidden ${hoveredStat ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0'}`}>
              {hoveredStat && (
                <div className="rounded-xl px-4 py-3 flex items-center justify-between gap-4 flex-wrap bg-gray-100 border border-gray-200">
                  <div>
                    <p className="text-[11px] font-black text-gray-900 uppercase tracking-wide">{hoveredStat.subject}</p>
                    <p className="text-[10px] text-gray-800 font-medium mt-0.5">{hoveredStat.correct} of {hoveredStat.total} correct</p>
                  </div>
                  <div className="flex items-center gap-5">
                    <div className="text-center">
                      <p className="text-base font-black" style={{ color: hoveredStat.accuracy >= 70 ? '#22C55E' : hoveredStat.accuracy >= 50 ? '#F59E0B' : '#EF4444' }}>{hoveredStat.accuracy}%</p>
                      <p className="text-[9px] text-gray-700 font-semibold uppercase">Accuracy</p>
                    </div>
                    {hoveredStat.marksLost > 0 && (
                      <div className="text-center">
                        <p className="text-base font-black text-red-400">−{hoveredStat.marksLost.toFixed(1)}</p>
                        <p className="text-[9px] text-gray-700 font-semibold uppercase">Lost</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* SECTION 2 — Subject Performance | Strategy Protocols | Item Analysis */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Subject Performance */}
          <div className="bg-white shadow-sm rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                <Target className="h-3.5 w-3.5 text-indigo-400" />
              </div>
              <h3 className="text-sm font-black text-gray-900">Subject Performance</h3>
            </div>
            <div className="space-y-3.5">
              {[...analytics.subjectStats].sort((a: any, b: any) => (b.accuracy || 0) - (a.accuracy || 0)).map((stat: any) => {
                const accuracy = stat.accuracy || 0
                const colorText = accuracy >= 70 ? 'text-emerald-400' : accuracy >= 50 ? 'text-amber-400' : 'text-red-400'
                const barColor = accuracy >= 70 ? '#22C55E' : accuracy >= 50 ? '#F59E0B' : '#EF4444'
                const subjectName = (stat.subject ?? 'Unknown').replace(/_/g, ' ')
                return (
                  <div key={stat.subject}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-gray-700 uppercase truncate max-w-[130px]">{subjectName}</span>
                      <span className={`text-[11px] font-black ${colorText}`}>{accuracy}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${accuracy}%`, backgroundColor: barColor, opacity: 0.65 }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Strategy Protocols */}
          {analytics.suggestions.length > 0 ? (
            <div className="bg-white shadow-sm rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Zap className="h-3.5 w-3.5 text-amber-400" />
                </div>
                <h3 className="text-sm font-black text-gray-900">Strategy Protocols</h3>
              </div>
              <div className="space-y-4">
                {analytics.suggestions.slice(0, 4).map((s: string, idx: number) => (
                  <div key={idx} className="flex gap-3">
                    <div className="shrink-0 w-5 h-5 rounded-md bg-amber-500/10 flex items-center justify-center mt-0.5">
                      <span className="text-[9px] font-black text-amber-400">{idx + 1}</span>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-amber-400/70 uppercase tracking-wider mb-0.5">Priority {idx + 1}</p>
                      <p className="text-xs text-gray-900/45 font-medium leading-relaxed">{s}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white shadow-sm rounded-2xl border border-gray-200 p-5 flex flex-col items-center justify-center text-center min-h-[200px]">
              <div className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                <Zap className="h-5 w-5 text-gray-800" />
              </div>
              <p className="text-sm font-bold text-gray-700">No strategy insights yet</p>
              <p className="text-xs text-gray-800 mt-1">Complete more questions to unlock</p>
            </div>
          )}

          {/* Item Analysis */}
          {(() => {
            const bu = analytics.buttonUsageStats || {}
            const sureTotal = bu.totalAreYouSure ?? 0
            const sureCorrect = bu.correctAreYouSure ?? 0
            const logicTotal = bu.total5050 ?? 0
            const logicCorrect = bu.correct5050 ?? 0
            const guessTotal = bu.totalGuess ?? 0
            const guessCorrect = bu.correctGuess ?? 0
            const successRate = displayQuestions.length > 0 ? Math.round((score.correct / displayQuestions.length) * 100) : 0
            return (
              <div className="bg-white shadow-sm rounded-2xl border border-gray-200 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <Brain className="h-3.5 w-3.5 text-emerald-400" />
                  </div>
                  <h3 className="text-sm font-black text-gray-900">Item Analysis</h3>
                </div>
                <div className="space-y-3">
                  {[
                    { icon: <CheckCircle className="h-3.5 w-3.5 text-emerald-400/50" />, label: 'Sure Items', val: `${sureCorrect}/${sureTotal}`, accent: '' },
                    { icon: <Brain className="h-3.5 w-3.5 text-blue-400/50" />, label: '50:50 Logic', val: `${logicCorrect}/${logicTotal}`, accent: '' },
                    { icon: <Zap className="h-3.5 w-3.5 text-violet-400/50" />, label: 'Guesses', val: `${guessCorrect}/${guessTotal}`, accent: '' },
                    { icon: <Target className="h-3.5 w-3.5 text-amber-400/50" />, label: 'Success Rate', val: `${successRate}%`, accent: 'text-amber-400' },
                    { icon: <Clock className="h-3.5 w-3.5 text-gray-800" />, label: 'Attempted', val: `${score.correct + score.wrong}/${displayQuestions.length}`, accent: '' },
                  ].map(({ icon, label, val, accent }, i, arr) => (
                    <div key={label}>
                      <div className="flex items-center justify-between py-0.5">
                        <div className="flex items-center gap-2">
                          {icon}
                          <span className="text-[11px] font-bold text-gray-900/45">{label}</span>
                        </div>
                        <span className={`text-sm font-black ${accent || 'text-gray-900'}`}>{val}</span>
                      </div>
                      {i < arr.length - 1 && <div className="h-px bg-gray-100 mt-2" />}
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}
        </div>

        {/* ═══════════════════════════════════════════════ */}
        {/* SECTION 3 — Confidence Accordions + Revision  */}
        {/* ═══════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-4 items-start">

          {/* Left: Sure / 50:50 / Guess accordions */}
          <div className="space-y-3">

            {/* Sure Items */}
            {(() => {
              const bu = analytics.buttonUsageStats || {}
              const total   = bu.totalAreYouSure   ?? 0
              const correct = bu.correctAreYouSure ?? 0
              const mistakes = total - correct
              const insight = getSureInsight(mistakes)
              return (
                <div
                  ref={sureCardRef}
                  className={`bg-white shadow-sm rounded-2xl border overflow-hidden transition-all duration-300 ${
                    lostMarksHighlighted ? 'border-indigo-500/40 ring-1 ring-indigo-500/20' : 'border-gray-200'
                  }`}
                >
                  <button
                    onClick={() => setIsExpandedSure(v => !v)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/[0.015] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                        <CheckCircle className="h-4 w-4 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-gray-900">Sure Items</p>
                        <p className="text-xs text-gray-700 font-medium">
                          {total > 0 ? `${correct} / ${total} correct · ${mistakes} mistake${mistakes !== 1 ? 's' : ''}` : 'No sure answers tagged'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {mistakes > 0 && (
                        <span className="hidden sm:inline text-[10px] font-black text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                          −{(mistakes * 2.667).toFixed(1)} marks
                        </span>
                      )}
                      <ChevronDown className={`h-4 w-4 text-gray-800 transition-transform duration-300 ${isExpandedSure ? 'rotate-180' : ''}`} />
                    </div>
                  </button>
                  {isExpandedSure && (
                    <div className="px-5 pb-5 pt-2 border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-200 flex flex-col gap-4">
                      <div className="bg-white/[0.03] rounded-xl p-4">
                        {insight ? (
                          <>
                            <p className="text-sm font-semibold text-gray-700 leading-relaxed">{insight.message}</p>
                            <p className="text-xs text-gray-800 font-medium leading-relaxed mt-1.5">{insight.recommendation}</p>
                          </>
                        ) : (
                          <p className="text-sm text-gray-800 font-medium leading-relaxed">
                            {total > 0 ? 'Perfect accuracy on sure items — your confident answers are reliable.' : 'Tag questions as "Sure" during the test to track your confident answers.'}
                          </p>
                        )}
                      </div>
                      <TaggedQuestionsDropdown tag="sure" title="Review Sure Items" questions={displayQuestions} answers={displayAnswers} confidenceMap={displayConfMap} onQuestionClick={handleQuestionClick} />
                    </div>
                  )}
                </div>
              )
            })()}

            {/* 50:50 Logic */}
            {(() => {
              const bu = analytics.buttonUsageStats || {}
              const total   = bu.total5050   ?? 0
              const correct = bu.correct5050 ?? 0
              const hitRate = total > 0 ? Math.round((correct / total) * 100) : null
              const insight = hitRate !== null ? getHitRateInsight(hitRate) : null
              const wrong50 = total - correct
              return (
                <div className="bg-white shadow-sm rounded-2xl border border-gray-200 overflow-hidden transition-all duration-300">
                  <button
                    onClick={() => setIsExpanded5050(v => !v)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/[0.015] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                        <Brain className="h-4 w-4 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-gray-900">50:50 Logic</p>
                        <p className="text-xs text-gray-700 font-medium">
                          {total > 0 ? `${correct} / ${total} correct · ${hitRate}% hit rate` : 'No 50:50 answers tagged'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {wrong50 > 0 && (
                        <span className="hidden sm:inline text-[10px] font-black text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                          −{(wrong50 * MARKS_PER_QUESTION).toFixed(1)} marks
                        </span>
                      )}
                      <ChevronDown className={`h-4 w-4 text-gray-800 transition-transform duration-300 ${isExpanded5050 ? 'rotate-180' : ''}`} />
                    </div>
                  </button>
                  {isExpanded5050 && (
                    <div className="px-5 pb-5 pt-2 border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-200 flex flex-col gap-4">
                      <div className="bg-white/[0.03] rounded-xl p-4">
                        {insight ? (
                          <>
                            <p className="text-sm font-semibold text-gray-700 leading-relaxed">{insight.message}</p>
                            <p className="text-xs text-gray-800 font-medium leading-relaxed mt-1.5">{insight.recommendation}</p>
                          </>
                        ) : (
                          <p className="text-sm text-gray-800 font-medium leading-relaxed">Tag questions where you narrowed to two options to track your elimination accuracy.</p>
                        )}
                      </div>
                      <TaggedQuestionsDropdown tag="fifty_fifty" title="Review Fifty-Fifty Items" questions={displayQuestions} answers={displayAnswers} confidenceMap={displayConfMap} onQuestionClick={handleQuestionClick} />
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Guesses */}
            {(() => {
              const bu = analytics.buttonUsageStats || {}
              const total   = bu.totalGuess   ?? 0
              const correct = bu.correctGuess ?? 0
              const wrongGuess = total - correct
              return (
                <div className="bg-white shadow-sm rounded-2xl border border-gray-200 overflow-hidden transition-all duration-300">
                  <button
                    onClick={() => setIsExpandedGuesses(v => !v)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/[0.015] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
                        <Zap className="h-4 w-4 text-violet-400" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-gray-900">Guesses</p>
                        <p className="text-xs text-gray-700 font-medium">
                          {total > 0 ? `${correct} / ${total} correct · in this zone` : 'No guess answers tagged'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {wrongGuess > 0 && (
                        <span className="hidden sm:inline text-[10px] font-black text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                          −{(wrongGuess * MARKS_PER_QUESTION).toFixed(1)} marks
                        </span>
                      )}
                      <ChevronDown className={`h-4 w-4 text-gray-800 transition-transform duration-300 ${isExpandedGuesses ? 'rotate-180' : ''}`} />
                    </div>
                  </button>
                  {isExpandedGuesses && (
                    <div className="px-5 pb-5 pt-2 border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-200 flex flex-col gap-4">
                      <TaggedQuestionsDropdown tag="guess" title="Review Guess Items" questions={displayQuestions} answers={displayAnswers} confidenceMap={displayConfMap} onQuestionClick={handleQuestionClick} />
                    </div>
                  )}
                </div>
              )
            })()}
          </div>

          {/* Right: Answer Revision */}
          <div>
            {revisionSummary && revisionSummary.total > 0 && (() => {
              const ctw     = revisionSummary.correctToWrong
              const nLost   = ctw.length
              const marksLost = parseFloat((nLost * MARKS_PER_QUESTION).toFixed(2))
              return (
                <div
                  ref={revisionCardRef}
                  className={`bg-white shadow-sm rounded-2xl border overflow-hidden transition-all duration-300 ${
                    lostMarksHighlighted ? 'border-indigo-500/40 ring-1 ring-indigo-500/20' : 'border-gray-200'
                  }`}
                >
                  <button
                    onClick={() => setIsExpandedRevision(v => !v)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/[0.015] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                        <RefreshCw className="h-4 w-4 text-amber-400" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-gray-900">Answer Revisions</p>
                        <p className="text-xs text-gray-700 font-medium">
                          Changed <span className="font-black text-gray-700">{revisionSummary.total}</span> answer{revisionSummary.total !== 1 ? 's' : ''} during this test
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isFullLength && nLost > 0 && (
                        <span className="hidden sm:inline text-[10px] font-black text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                          −{marksLost} marks
                        </span>
                      )}
                      <ChevronDown className={`h-4 w-4 text-gray-800 transition-transform duration-300 ${isExpandedRevision ? 'rotate-180' : ''}`} />
                    </div>
                  </button>
                  {isExpandedRevision && (
                    <div className="px-5 pb-5 pt-2 border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-200 space-y-3">
                      {nLost > 0 && (
                        <div className="rounded-xl bg-red-500/[0.07] border border-red-500/20 px-4 py-3">
                          <p className="text-sm font-bold text-red-400 leading-snug mb-1">
                            Changed <span className="text-emerald-400">correct</span> → <span className="text-red-400">wrong</span>
                          </p>
                          <p className="text-xs text-red-400/50 font-semibold mb-3">
                            {isFullLength
                              ? <>Marks lost: <span className="font-black text-red-400">−{marksLost}</span> &nbsp;({nLost} × {MARKS_PER_QUESTION})</>
                              : <>{nLost} correct answer{nLost !== 1 ? 's' : ''} thrown away by revision</>
                            }
                          </p>
                          <p className="text-[9px] font-black text-gray-800 uppercase tracking-[0.15em] mb-2">Click to review</p>
                          <div className="flex flex-wrap gap-2">
                            {ctw.map(r => (
                              <button
                                key={r.qNum}
                                onClick={() => handleQuestionClick(r.qNum - 1)}
                                className="h-9 w-9 flex items-center justify-center rounded-xl font-black text-xs border transition-all hover:scale-110 active:scale-95 bg-red-500/10 border-red-500/25 text-red-400 hover:bg-red-500/20"
                                title={`Q${r.qNum} — revised correct → wrong`}
                              >
                                {r.qNum}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {revisionSummary.wrongToCorrect.length > 0 && (
                        <div className="rounded-xl bg-emerald-500/[0.07] border border-emerald-500/20 px-4 py-3">
                          <p className="text-sm font-bold text-emerald-400 leading-snug mb-1">
                            Changed <span className="text-red-400">wrong</span> → <span className="text-emerald-400">correct</span>
                          </p>
                          <p className="text-xs text-emerald-400/50 font-semibold mb-2">
                            {revisionSummary.wrongToCorrect.length} good revision{revisionSummary.wrongToCorrect.length !== 1 ? 's' : ''} — your instinct was right
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {revisionSummary.wrongToCorrect.map(r => (
                              <button
                                key={r.qNum}
                                onClick={() => handleQuestionClick(r.qNum - 1)}
                                className="h-9 w-9 flex items-center justify-center rounded-xl font-black text-xs border transition-all hover:scale-110 active:scale-95 bg-emerald-500/10 border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20"
                                title={`Q${r.qNum} — revised wrong → correct`}
                              >
                                {r.qNum}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {nLost === 0 && revisionSummary.wrongToCorrect.length === 0 && revisionSummary.neutral.length > 0 && (
                        <p className="text-xs text-gray-700 font-medium">
                          {revisionSummary.neutral.length} neutral revision{revisionSummary.neutral.length !== 1 ? 's' : ''} — changed between wrong options
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        </div>

        {/* ═══════════════════════════════════ */}
        {/* SECTION 4 — Subject Drill-Down     */}
        {/* ═══════════════════════════════════ */}
        <div className="pt-6 border-t border-gray-100">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight italic">Subject wise performance</h2>
              <p className="text-xs text-gray-700 font-medium">Click a question number to jump into review mode</p>
            </div>
          </div>
          <div className="space-y-3">
            {[...analytics.subjectStats].sort((a: any, b: any) => (a.accuracy || 0) - (b.accuracy || 0)).map((stat: any) => {
              const subjectUUID = Object.keys(subjectMap).find(id => subjectMap[id] === stat.subject) ?? stat.subject
              return (
                <SubjectPerformanceCard
                  key={stat.subject}
                  subject={subjectUUID}
                  label={stat.subject}
                  correct={stat.correct}
                  total={stat.total}
                  accuracy={stat.accuracy}
                  questions={displayQuestions}
                  answers={mergedAnswers}
                  onQuestionClick={handleQuestionClick}
                />
              )
            })}
          </div>
        </div>

      </main>

      {pendingNavigation && (
        <FeedbackModal
          sessionId={sessionId}
          testMode={isFullLength ? 'full_length' : 'practice'}
          onDone={() => {
            const nav = pendingNavigation
            setPendingNavigation(null)
            nav()
          }}
          onSkip={() => {
            const nav = pendingNavigation
            setPendingNavigation(null)
            nav()
          }}
        />
      )}

      <FullMockNudgeModal
        sessionId={sessionId}
        sessionScore={score.percentage ?? 0}
        sessionSubject={resolveSubjectName({
          paper_label: displayPaperLabel,
          analytics: storedAnalytics,
        })}
      />
    </div>
  )
}
