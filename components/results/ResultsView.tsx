'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuizStore } from '@/store/quiz-store'
import { getTestSession, listAttemptsBySession, getQuestionsByIds, getSubjects } from '@/lib/supabase/queries'
import {
  CheckCircle, XCircle, ChevronDown, BookOpen, Clock, RefreshCw, Home,
  Lightbulb, Brain, Target, Zap, Loader2, ArrowLeft
} from 'lucide-react'
import type { Question, SelectionEvent } from '@/types'
import { generateTestAnalytics } from '@/lib/analytics/engine'
import { toast } from 'sonner'


// ─── Helpers ──────────────────────────────────────────────────

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

function getScoreThreshold(pct: number) {
  if (pct >= 80) return { label: 'Outstanding! 🏆' }
  if (pct >= 60) return { label: 'Great Work! 🎯' }
  if (pct >= 40) return { label: 'Good Effort! 📚' }
  if (pct >= 20) return { label: 'Keep Practising! 💪' }
  return { label: 'Needs More Work! 🔥' }
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
    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm transition-all hover:shadow-md">
      <div
        className="flex items-center justify-between p-6 md:p-8 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm ${accuracy >= 50 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
            {accuracy}%
          </div>
          <div>
            <h3 className="text-base font-black text-gray-900 uppercase tracking-tight">{(label ?? subject ?? 'Unknown').replace(/_/g, ' ')}</h3>
            <p className="text-xs text-gray-400 font-bold uppercase">{correct} / {total} Correct</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-xs text-gray-400 font-medium">
            {isExpanded ? 'Hide questions' : 'Show questions'}
          </span>
          <div className={`w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-all ${isExpanded ? 'rotate-180' : ''}`}>
            <ChevronDown className="h-5 w-5" />
          </div>
        </div>
      </div>
      {isExpanded && (
        <div className="px-6 pb-6 md:px-8 md:pb-8 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="border-t border-gray-100 pt-6">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">
              Question Numbers — click to review
            </p>
            <div className="flex flex-wrap gap-2.5">
              {subjectQuestions.map((q) => {
                const answer = answers[q.$id]
                const isCorrect = answer?.isCorrect
                const isSkipped = !answer
                const globalIndex = questions.findIndex(allQ => allQ.$id === q.$id)
                let statusColor = 'bg-gray-50 text-gray-400 border-gray-200 hover:border-gray-400'
                if (isCorrect) statusColor = 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:border-emerald-400 shadow-sm shadow-emerald-50'
                else if (!isSkipped) statusColor = 'bg-red-50 text-red-700 border-red-200 hover:border-red-400 shadow-sm shadow-red-50'
                const confTag = answer?.confidenceTag
                const confDot = confTag === 'sure' ? 'ring-2 ring-emerald-400'
                  : confTag === 'fifty_fifty' ? 'ring-2 ring-purple-400'
                  : confTag === 'guess' ? 'ring-2 ring-yellow-400'
                  : ''
                const wasRevised = (answer?.selectionHistory?.change_count ?? 0) > 0
                return (
                  <div key={q.$id} className="relative">
                    <button
                      title={`Q${globalIndex + 1} — ${isSkipped ? 'Not Answered' : isCorrect ? 'Correct' : 'Incorrect'}${confTag ? ` (${confLabel(confTag)})` : ''}${wasRevised ? ' · Revised' : ''} — Took ${formatTime(answer?.timeTaken)}`}
                      onClick={() => onQuestionClick(globalIndex)}
                      className={`h-10 w-10 flex items-center justify-center rounded-xl font-black text-xs border transition-all hover:scale-110 ${statusColor} ${confDot}`}
                    >
                      {globalIndex + 1}
                    </button>
                    {wasRevised && (
                      <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-blue-400 rounded-full border border-white" />
                    )}
                  </div>
                )
              })}
            </div>
            <div className="flex flex-wrap gap-4 mt-4 text-[10px] text-gray-500">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300" />Correct</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-100 border border-red-300" />Wrong</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-50 border border-gray-200" />Not Answered</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border-2 border-emerald-400" />Sure</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border-2 border-purple-400" />50:50</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border-2 border-yellow-400" />Guess</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block" />Revised</span>
            </div>

            {/* Areas to revisit */}
            {areasToRevisit.length > 0 && (
              <div className="mt-5 pt-4 border-t border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">
                  Areas to revisit
                </p>
                <div className="flex flex-wrap gap-2">
                  {areasToRevisit.map(area => (
                    <span
                      key={area}
                      className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold"
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
    ? 'text-emerald-700 bg-emerald-50/80 hover:bg-emerald-100 border-emerald-200'
    : tag === 'fifty_fifty'
      ? 'text-blue-700 bg-blue-50/80 hover:bg-blue-100 border-blue-200'
      : 'text-blue-700 bg-blue-50/80 hover:bg-blue-100 border-blue-200'

  return (
    <div className="mt-4 rounded-2xl overflow-hidden border border-gray-100 bg-white/50 backdrop-blur-md shadow-sm transition-all duration-300">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-5 py-3 text-xs font-black transition-all ${themeClass}`}
      >
        <div className="flex items-center gap-2">
          <BookOpen className="h-3.5 w-3.5 opacity-70" />
          <span className="uppercase tracking-widest">{title}</span>
          <span className="px-1.5 py-0.5 rounded-md bg-white/50 text-[10px] ml-1">{taggedItems.length}</span>
        </div>
        <ChevronDown className={`h-4 w-4 transition-transform duration-500 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      <div className={`transition-all duration-500 ease-in-out ${isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
        <div className="p-4 border-t border-gray-100 bg-white/80">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">Questions marked as {tag.replace('_', ':')}</p>
          <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2">
            {taggedItems.map(({ q, index, answer }) => {
              const isCorrect = answer?.isCorrect
              let statusStyle = 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100'
              if (isCorrect === true) statusStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 shadow-sm shadow-emerald-100/50'
              else if (isCorrect === false) statusStyle = 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 shadow-sm shadow-red-100/50'
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
    getScore,
    reset,
    // live rehydration setters
    setQuestions, setAnswers, setConfidenceForQuestion,
    setTestMode, setPaperLabel, setElapsed, setConfidenceMap,
  } = useQuizStore()

  // ── Local state (replay mode only — fully isolated from store) ──
  const [localData, setLocalData] = useState<LocalData | null>(null)

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
            selectionHistory: att.selection_history ? JSON.parse(att.selection_history) : { events: [], change_count: 0 },
          }
          if (att.confidence_tag) reconstructedConfMap[att.question_id] = att.confidence_tag
        })

        if (!cancelled) setLocalData({
          questions: orderedQs,
          answers: reconstructedAnswers,
          confidenceMap: reconstructedConfMap,
          elapsedSeconds: session.total_time_seconds,
          paperLabel: session.paper_label,
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
            selectionHistory: att.selection_history ? JSON.parse(att.selection_history) : { events: [], change_count: 0 },
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
          selection_history: ans.selectionHistory ? JSON.stringify({ selections: ans.selectionHistory }) : undefined,
        }
      }),
      totalTestTime: displayElapsed,
      subjects: subjectsList,
    }),
    [displayQuestions, displayAnswers, displayConfMap, displayElapsed, subjectsList]
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
    let totalRevised = 0
    let changedCorrectToWrong = 0
    let changedWrongToCorrect = 0

    for (const q of displayQuestions) {
      const answer = displayAnswers[q.$id]
      if (!answer) continue
      const changeCount: number = answer.selectionHistory?.change_count ?? 0
      if (changeCount === 0) continue

      totalRevised++

      const events: SelectionEvent[] = answer.selectionHistory?.events ?? []
      const firstSelect = events.find((e: SelectionEvent) => e.type === 'select')
      if (firstSelect?.option) {
        const firstWasCorrect = firstSelect.option === q.correct_option
        if (firstWasCorrect && !answer.isCorrect) changedCorrectToWrong++
        if (!firstWasCorrect && answer.isCorrect) changedWrongToCorrect++
      }
    }

    return totalRevised > 0
      ? { totalRevised, changedCorrectToWrong, changedWrongToCorrect }
      : null
  }, [displayQuestions, displayAnswers])

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
        <Loader2 className="h-10 w-10 text-[#4A90E2] animate-spin mb-4" />
        <p className="text-gray-400 font-black text-sm uppercase tracking-widest">Reconstructing Analysis...</p>
      </div>
    )
  }

  // ─── Empty state ─────────────────────────────────────────────
  const hasData = displayQuestions.length > 0
  if (!hasData) {
    return (
      <div className="flex items-center justify-center min-h-[80vh] p-6 bg-gray-50">
        <div className="text-center space-y-4 max-w-xs">
          <div className="w-20 h-20 rounded-full bg-gray-200/50 flex items-center justify-center mx-auto ring-8 ring-gray-100">
            <BookOpen className="h-10 w-10 text-gray-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">No Full Analysis Available</h2>
          <p className="text-gray-500 text-sm">
            {replayMode ? 'This is a legacy session. Question-level replay data was not saved for this test.' : 'Complete a practice session to unlock the Analytical Engine.'}
          </p>
          <button
            onClick={() => router.push(replayMode ? '/tests' : '/quiz')}
            className="bg-[#4A90E2] text-white px-8 py-3 rounded-2xl font-bold text-sm hover:bg-[#3a7fd4] transition-all shadow-xl shadow-blue-100"
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
    <div className="min-h-screen bg-[#F8F9FC] pb-24">
      {/* ── Header ── */}
      <div className="sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[#4A90E2] p-2 rounded-xl shadow-lg shadow-blue-200">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black text-gray-900 tracking-tight leading-none uppercase italic">
                Analytical Engine <span className="text-[#4A90E2]">PRO</span>
              </h1>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-1">
                {displayPaperLabel || 'Real-time Analysis'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {replayMode ? (
              <button
                onClick={() => router.push('/tests')}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" /> My Tests
              </button>
            ) : (
              <>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="hidden md:flex items-center gap-2 px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors"
                >
                  <Home className="h-4 w-4" /> Dashboard
                </button>
                <button
                  onClick={() => { reset(); router.push('/quiz') }}
                  className="bg-white border border-gray-200 px-5 py-2.5 rounded-2xl text-sm font-black text-gray-900 hover:bg-gray-50 transition-all flex items-center gap-2 shadow-sm"
                >
                  <RefreshCw className="h-4 w-4" /> Retake
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-3 md:px-6 mt-5 md:mt-8 space-y-6 md:space-y-8">

        {/* ── Score + Subject bar chart ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Score card */}
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            <div className="p-7 flex-1">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">
                {displayPaperLabel || 'Mock Analysis'} · {displayQuestions.length} Qs
              </p>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Marks Scored</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-black text-gray-900">
                      {score.marksScored ?? score.correct}
                    </span>
                    <span className="text-xl font-bold text-gray-400">
                      /{score.totalMarks ?? displayQuestions.length * 2}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">
                    +{score.correct * 2} − {(score.wrong * (2/3)).toFixed(2)} neg
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-4xl font-black text-[#4A90E2]">{score.percentage}%</span>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">accuracy</p>
                </div>
              </div>
              <div className="mt-5">
                <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                  <span>{Object.keys(displayAnswers).length} of {displayQuestions.length} attempted</span>
                </div>
                <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#4A90E2] rounded-full transition-all duration-1000"
                    style={{ width: `${(Object.keys(displayAnswers).length / displayQuestions.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 border-t border-gray-100">
              <div className="py-4 text-center border-r border-gray-100">
                <p className="text-xl font-black text-emerald-600">{score.correct}</p>
                <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mt-0.5">Correct</p>
              </div>
              <div className="py-4 text-center border-r border-gray-100">
                <p className="text-xl font-black text-red-600">{score.wrong}</p>
                <p className="text-[9px] font-black text-red-500 uppercase tracking-widest mt-0.5">Wrong</p>
              </div>
              <div className="py-4 text-center">
                <p className="text-xl font-black text-gray-400">{displayQuestions.length - Object.keys(displayAnswers).length}</p>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-0.5">Skipped</p>
              </div>
            </div>
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                {Math.floor(displayElapsed / 3600)}h {Math.floor((displayElapsed % 3600) / 60)}m
              </div>
              <button
                onClick={() => handleQuestionClick(0)}
                className="bg-[#4A90E2]/10 hover:bg-[#4A90E2]/20 text-[#4A90E2] px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-colors"
              >
                <Clock className="h-3 w-3" /> Review Test
              </button>
            </div>
          </div>

          {/* Subject performance bar chart */}
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-5 md:p-8 flex flex-col">
            <div className="mb-4 md:mb-6">
              <h3 className="text-[11px] font-black text-gray-500 uppercase tracking-[0.15em] mb-3 md:mb-4">
                Subject Performance — Accuracy &amp; Marks Lost
              </h3>

              {/* Legend */}
              <div className="flex items-center gap-3 md:gap-6 mb-5 md:mb-8 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-[#E54B4B]" />
                  <span className="text-[9px] md:text-[10px] font-bold text-gray-500 uppercase tracking-wider">Below 50%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-[#E59935]" />
                  <span className="text-[9px] md:text-[10px] font-bold text-gray-500 uppercase tracking-wider">50-70%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-[#6DA42A]" />
                  <span className="text-[9px] md:text-[10px] font-bold text-gray-500 uppercase tracking-wider">Above 70%</span>
                </div>
              </div>

              {/* Subject list — stacked on mobile, inline on desktop */}
              <div className="space-y-4 md:space-y-6">
                {analytics.subjectStats.map((stat: any) => {
                  const accuracy = stat.accuracy || 0
                  const color = accuracy >= 70 ? '#6DA42A' : accuracy >= 50 ? '#E59935' : '#E54B4B'
                  const subjectName = (stat.subject ?? 'Unknown').replace(/_/g, ' ')

                  return (
                    <div key={stat.subject}>
                      {/* Mobile: name + badges in one row, bar full-width below */}
                      <div className="flex items-center justify-between mb-1.5 md:hidden">
                        <span className="text-[11px] font-black text-gray-900 uppercase tracking-tight">
                          {subjectName}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                            {stat.correct}/{stat.total}
                          </span>
                          <span className="text-[9px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">
                            -{stat.marksLost.toFixed(1)}m
                          </span>
                        </div>
                      </div>
                      {/* Mobile: full-width bar */}
                      <div className="md:hidden h-8 bg-gray-100 rounded-lg overflow-hidden">
                        <div
                          className="h-full transition-all duration-1000 ease-out flex items-center px-3"
                          style={{ width: `${Math.max(12, accuracy)}%`, backgroundColor: color }}
                        >
                          <span className="text-[11px] font-black text-white whitespace-nowrap">{accuracy}%</span>
                        </div>
                      </div>

                      {/* Desktop: horizontal row */}
                      <div className="hidden md:flex items-center gap-4">
                        <div className="w-24 shrink-0 text-right">
                          <span className="text-[11px] font-black text-gray-900 uppercase tracking-tight">
                            {subjectName}
                          </span>
                        </div>
                        <div className="flex-1 h-8 bg-gray-100 rounded-lg overflow-hidden">
                          <div
                            className="h-full transition-all duration-1000 ease-out flex items-center px-3"
                            style={{ width: `${Math.max(15, accuracy)}%`, backgroundColor: color }}
                          >
                            <span className="text-[11px] font-black text-white">{accuracy}%</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 w-20 shrink-0">
                          <div className="bg-gray-100 rounded px-2 py-0.5 text-center">
                            <span className="text-[9px] font-bold text-gray-600">{stat.correct}/{stat.total} correct</span>
                          </div>
                          <div className="bg-red-50 rounded px-2 py-0.5 text-center">
                            <span className="text-[9px] font-bold text-red-600">-{stat.marksLost.toFixed(2)} marks</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── Revision banner ── */}
        {revisionSummary && (
          <div className={`rounded-2xl px-6 py-5 flex flex-col gap-2 border-l-4 bg-gray-900 text-white ${
            revisionSummary.changedCorrectToWrong > revisionSummary.changedWrongToCorrect
              ? 'border-amber-500'
              : 'border-emerald-500'
          }`}>
            <p className="text-sm font-black uppercase tracking-widest text-gray-300">
              Answer Revision
            </p>
            <p className="text-base font-bold text-white">
              You revised{' '}
              <span className="text-[#4A90E2] font-black">{revisionSummary.totalRevised}</span>{' '}
              answer{revisionSummary.totalRevised !== 1 ? 's' : ''} during this test.
            </p>
            {revisionSummary.changedCorrectToWrong > 0 && (
              <p className="text-sm font-medium text-amber-300">
                ⚠ In{' '}
                <span className="font-black">{revisionSummary.changedCorrectToWrong}</span>{' '}
                of those, you changed a correct answer to a wrong one.
              </p>
            )}
            {revisionSummary.changedWrongToCorrect > 0 && (
              <p className="text-sm font-medium text-emerald-300">
                ✓ You caught yourself and corrected{' '}
                <span className="font-black">{revisionSummary.changedWrongToCorrect}</span>{' '}
                wrong answer{revisionSummary.changedWrongToCorrect !== 1 ? 's' : ''}.
              </p>
            )}
          </div>
        )}

        {/* ── Confidence panels ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] border border-emerald-100 shadow-sm p-5 md:p-8 flex flex-col">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <div className="w-10 md:w-12 h-10 md:h-12 rounded-xl md:rounded-2xl bg-emerald-50 flex items-center justify-center">
                <CheckCircle className="h-5 md:h-6 w-5 md:w-6 text-emerald-600" />
              </div>
              <span className="text-xs font-black text-emerald-600 uppercase tracking-widest">Mastery</span>
            </div>
            <h4 className="text-lg md:text-xl font-black text-gray-900 mb-1 md:mb-2">Sure Items</h4>
            <p className="text-xs text-gray-500 font-medium mb-4 md:mb-6 leading-relaxed">Questions you answered with absolute confidence. These reflect your core strengths.</p>
            <TaggedQuestionsDropdown tag="sure" title="Review Sure Items" questions={displayQuestions} answers={displayAnswers} confidenceMap={displayConfMap} onQuestionClick={handleQuestionClick} />
          </div>
          <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] border border-blue-100 shadow-sm p-5 md:p-8 flex flex-col">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <div className="w-10 md:w-12 h-10 md:h-12 rounded-xl md:rounded-2xl bg-blue-50 flex items-center justify-center">
                <Brain className="h-5 md:h-6 w-5 md:w-6 text-blue-600" />
              </div>
              <span className="text-xs font-black text-blue-600 uppercase tracking-widest">Learning</span>
            </div>
            <h4 className="text-lg md:text-xl font-black text-gray-900 mb-1 md:mb-2">50:50 Logic</h4>
            <p className="text-xs text-gray-500 font-medium mb-4 md:mb-6 leading-relaxed">Questions where you narrowed it down but were hesitant. This is where your edge lies.</p>
            <TaggedQuestionsDropdown tag="fifty_fifty" title="Review Fifty-Fifty Items" questions={displayQuestions} answers={displayAnswers} confidenceMap={displayConfMap} onQuestionClick={handleQuestionClick} />
          </div>
          <div className="bg-white rounded-[1.5rem] md:rounded-[2rem] border border-blue-100 shadow-sm p-5 md:p-8 flex flex-col">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <div className="w-10 md:w-12 h-10 md:h-12 rounded-xl md:rounded-2xl bg-blue-50 flex items-center justify-center">
                <Zap className="h-5 md:h-6 w-5 md:w-6 text-blue-600" />
              </div>
              <span className="text-xs font-black text-blue-600 uppercase tracking-widest">Luck Factor</span>
            </div>
            <h4 className="text-lg md:text-xl font-black text-gray-900 mb-1 md:mb-2">Calculated Guesses</h4>
            <p className="text-xs text-gray-500 font-medium mb-4 md:mb-6 leading-relaxed">Pure guesses. Analyzing these helps you understand your subconscious processing.</p>
            <TaggedQuestionsDropdown tag="guess" title="Review Guess Items" questions={displayQuestions} answers={displayAnswers} confidenceMap={displayConfMap} onQuestionClick={handleQuestionClick} />
          </div>
        </div>

        {/* ── Subject drill-down ── */}
        <div className="pt-8 border-t border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight italic">Engine Drill-Down</h2>
              <p className="text-xs text-gray-500 font-medium">Subject-wise question breakdown — click a question number to review</p>
            </div>
          </div>
          <div className="space-y-4">
            {analytics.subjectStats.map((stat: any) => {
              // stat.subject is the resolved name; filter questions by UUID
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

        {/* ── Strategy suggestions ── */}
        {analytics.suggestions.length > 0 && (
          <div className="bg-gray-900 rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-10 opacity-10"><Lightbulb className="h-40 w-40" /></div>
            <div className="relative z-10">
              <h3 className="text-xl font-black uppercase tracking-widest mb-6 flex items-center gap-3">
                <Zap className="h-6 w-6 text-[#4A90E2]" /> Strategy Protocol
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                {analytics.suggestions.map((s: string, idx: number) => (
                  <div key={idx} className="flex gap-4">
                    <span className="text-[#4A90E2] font-black italic">#{idx + 1}</span>
                    <p className="text-sm font-medium text-gray-300 leading-relaxed">{s}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}
