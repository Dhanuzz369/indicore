'use client'
export const dynamic = 'force-dynamic'

import { Suspense, useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  getTestSession,
  listAttemptsBySession,
  getQuestionsByIds,
  getSubjects,
} from '@/lib/supabase/queries'
import { OverviewTab } from '@/components/tests/tabs/OverviewTab'
import { WrongAnswersTab } from '@/components/tests/tabs/WrongAnswersTab'
import type { WrongItem } from '@/components/tests/tabs/WrongAnswersTab'
import { ReviewAllTab } from '@/components/tests/tabs/ReviewAllTab'
import type { ReviewItem } from '@/components/tests/tabs/ReviewAllTab'
import { SubtopicDrillTab } from '@/components/tests/tabs/SubtopicDrillTab'
import type { TestSession, Question, QuizAttempt, Subject, TestAnalyticsV1 } from '@/types'

type TabName = 'overview' | 'wrong-answers' | 'review-all' | 'subtopic-drill'

const TABS: { key: TabName; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'wrong-answers', label: 'Wrong Answers' },
  { key: 'review-all', label: 'Review All' },
  { key: 'subtopic-drill', label: 'Subtopic Drill' },
]

function parseAnalytics(raw: string | undefined): TestAnalyticsV1 | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed.subjectBreakdown)) return parsed as TestAnalyticsV1
    return null
  } catch {
    return null
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function SessionDetailContent() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = params.sessionId as string
  const activeTab = (searchParams.get('tab') || 'overview') as TabName

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [session, setSession] = useState<TestSession | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [attemptMap, setAttemptMap] = useState<Record<string, QuizAttempt>>({})
  const [analytics, setAnalytics] = useState<TestAnalyticsV1 | null>(null)
  const [subjects, setSubjects] = useState<Subject[]>([])

  useEffect(() => {
    const load = async () => {
      try {
        const [sess, attemptsRes, subsRes] = await Promise.all([
          getTestSession(sessionId),
          listAttemptsBySession(sessionId),
          getSubjects(),
        ])
        setSession(sess)
        setSubjects(subsRes.documents as unknown as Subject[])

        // ── Parse snapshot once — used for both questions and attempt fallback ──
        let snapParsed: { questions?: Question[]; answers?: Record<string, any> } | null = null
        if (sess.snapshot) {
          try { snapParsed = JSON.parse(sess.snapshot) } catch {}
        }

        // ── Build attempt map ──
        // Priority 1: attempts saved with session_id (most accurate, has time_taken etc.)
        const aMap: Record<string, QuizAttempt> = {}
        for (const a of attemptsRes.documents as unknown as QuizAttempt[]) {
          aMap[a.question_id] = a
        }

        // Priority 2: if session_id wasn't stored on attempts, reconstruct from snapshot.answers
        if (Object.keys(aMap).length === 0 && snapParsed?.answers) {
          for (const [qId, ans] of Object.entries(snapParsed.answers)) {
            aMap[qId] = {
              $id: qId,
              question_id: qId,
              user_id: '',
              selected_option: ans.selectedOption ?? '',
              is_correct: ans.isCorrect ?? false,
              confidence_tag: ans.confidenceTag ?? null,
              time_taken_seconds: ans.timeTaken ?? null,
            } as unknown as QuizAttempt
          }
        }
        setAttemptMap(aMap)

        // ── Load questions ──
        // Priority 1: snapshot.questions (full objects, no extra fetch needed)
        let qs: Question[] = []
        if (Array.isArray(snapParsed?.questions) && snapParsed!.questions!.length > 0) {
          qs = snapParsed!.questions!
        }

        // Priority 2: session.question_ids JSON array → fetch from DB
        if (qs.length === 0 && sess.question_ids) {
          try {
            const ids: string[] = JSON.parse(sess.question_ids)
            if (ids.length > 0) {
              const qRes = await getQuestionsByIds(ids)
              qs = qRes.documents as unknown as Question[]
            }
          } catch {}
        }

        // Priority 3: question IDs from attempts → fetch from DB
        if (qs.length === 0) {
          const qIds = Object.keys(aMap).filter(Boolean)
          if (qIds.length > 0) {
            const qRes = await getQuestionsByIds(qIds)
            qs = qRes.documents as unknown as Question[]
          }
        }

        setQuestions(qs)

        // Parse analytics (prefer session.analytics, fallback session.results_history)
        const analyticsRaw = sess.analytics || sess.results_history
        setAnalytics(parseAnalytics(analyticsRaw))
      } catch (e: any) {
        console.error('[SessionDetail] load failed:', e)
        setError(e?.message || 'Failed to load session')
        toast.error('Failed to load session details')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [sessionId])

  const setTab = (tab: TabName) => {
    router.replace(`/tests/${sessionId}?tab=${tab}`, { scroll: false })
  }

  // Build subject name lookup
  const subjectNameMap = new Map(subjects.map(s => [s.$id, s.Name]))
  const subjectName = (id: string) => subjectNameMap.get(id) || id

  // Build derived data for tabs
  const wrongItems: WrongItem[] = questions
    .filter(q => attemptMap[q.$id] && !attemptMap[q.$id].is_correct)
    .map(q => ({
      question: q,
      attempt: attemptMap[q.$id],
      subjectName: subjectName(q.subject_id),
    }))

  const reviewItems: ReviewItem[] = questions.map(q => {
    const attempt = attemptMap[q.$id]
    const wasSkipped = !attempt
    return {
      question: q,
      userAnswer: attempt?.selected_option || null,
      isCorrect: attempt?.is_correct ?? false,
      wasSkipped,
      confidenceTag: attempt?.confidence_tag,
      timeTaken: attempt?.time_taken_seconds,
      subjectName: subjectName(q.subject_id),
    }
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 text-[#4A90E2] animate-spin" />
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-[#F8F9FC] flex items-center justify-center">
        <div className="text-center space-y-4 p-6">
          <p className="text-lg font-bold text-gray-900">Failed to load session</p>
          <p className="text-sm text-gray-500">{error}</p>
          <Link
            href="/tests"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#4A90E2] text-white text-sm font-bold hover:bg-[#3a7fd4] transition-colors"
          >
            Back to Tests
          </Link>
        </div>
      </div>
    )
  }

  const sessionDate = session.submitted_at || session.date || session.$createdAt || ''

  return (
    <div className="min-h-screen bg-[#F8F9FC]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/tests"
              className="flex items-center gap-1.5 text-sm font-bold text-gray-400 hover:text-gray-900 transition-colors shrink-0"
            >
              <ArrowLeft className="h-4 w-4" /> Tests
            </Link>
            <div className="min-w-0">
              <p className="text-sm font-black text-gray-900 truncate">{session.paper_label}</p>
              <p className="text-xs text-gray-400">
                {session.exam_type} · {sessionDate ? formatDate(sessionDate) : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="max-w-4xl mx-auto px-4 md:px-6">
          <div className="flex gap-1 overflow-x-auto pb-px scrollbar-none">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setTab(tab.key)}
                className={`shrink-0 px-4 py-2.5 text-xs font-black uppercase tracking-wide border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-[#4A90E2] text-[#4A90E2]'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-6">
        {activeTab === 'overview' && (
          <OverviewTab session={session} analytics={analytics} />
        )}
        {activeTab === 'wrong-answers' && (
          <WrongAnswersTab wrongItems={wrongItems} subjects={subjects} />
        )}
        {activeTab === 'review-all' && (
          <ReviewAllTab items={reviewItems} subjects={subjects} />
        )}
        {activeTab === 'subtopic-drill' && (
          <SubtopicDrillTab
            analytics={analytics}
            questions={questions}
            attemptMap={attemptMap}
          />
        )}
      </div>
    </div>
  )
}

export default function SessionDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 text-[#4A90E2] animate-spin" />
        </div>
      }
    >
      <SessionDetailContent />
    </Suspense>
  )
}
