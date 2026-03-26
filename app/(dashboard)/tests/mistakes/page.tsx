'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, AlertCircle, Loader2, BookOpen } from 'lucide-react'
import { toast } from 'sonner'
import { getCurrentUser } from '@/lib/supabase/auth'
import { listTestSessions, listAttemptsBySession, getSubjects } from '@/lib/supabase/queries'
import { QuestionReviewCard } from '@/components/tests/QuestionReviewCard'
import type { Question, Subject } from '@/types'

interface MistakeEntry {
  question: Question
  subjectId: string
  subjectName: string
  wrongCount: number
  lastAttemptedAt: string
}

const SESSIONS_TO_SCAN = 20
const BATCH_SIZE = 5

function extractQuestionsFromSnapshot(snapRaw: string): Question[] {
  try {
    const snap = JSON.parse(snapRaw)
    if (Array.isArray(snap.questions)) return snap.questions as Question[]
  } catch {}
  return []
}

export default function MistakesPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [mistakes, setMistakes] = useState<MistakeEntry[]>([])
  const [loadingMsg, setLoadingMsg] = useState('Loading sessions…')
  const [done, setDone] = useState(false)

  const [subjectFilter, setSubjectFilter] = useState('all')
  const [sort, setSort] = useState<'most_wrong' | 'most_recent'>('most_wrong')

  // Auth
  useEffect(() => {
    getCurrentUser().then(user => {
      if (!user) { router.push('/login'); return }
      setUserId(user.$id)
    })
  }, [router])

  // Load mistakes
  useEffect(() => {
    if (!userId) return

    const load = async () => {
      try {
        const [sessResult, subsResult] = await Promise.all([
          listTestSessions({ userId, sort: 'newest', limit: SESSIONS_TO_SCAN }),
          getSubjects(),
        ])
        const sessions = sessResult.documents
        const subs = subsResult.documents as unknown as Subject[]
        setSubjects(subs)
        const subjectNameMap = new Map(subs.map(s => [s.$id, s.Name]))

        // Accumulate wrong answers: question_id → { question, wrongCount, lastAt }
        const wrongMap = new Map<string, { question: Question; wrongCount: number; lastAt: string; subjectId: string }>()

        const total = sessions.length
        let processed = 0

        for (let b = 0; b < total; b += BATCH_SIZE) {
          const batch = sessions.slice(b, b + BATCH_SIZE)
          await Promise.all(
            batch.map(async sess => {
              // Try snapshot first
              let questions: Question[] = []
              let wrongIds: Set<string> = new Set()

              if (sess.snapshot) {
                questions = extractQuestionsFromSnapshot(sess.snapshot)
              }

              // Always fetch attempts for is_correct data
              try {
                const attemptsRes = await listAttemptsBySession(sess.$id)
                const attempts = attemptsRes.documents as any[]

                for (const att of attempts) {
                  if (!att.is_correct) {
                    wrongIds.add(att.question_id)
                  }
                }

                // If no snapshot questions, build minimal question objects from attempts
                if (questions.length === 0) {
                  for (const att of attempts) {
                    if (!att.is_correct && att.question_id && att.question_text) {
                      questions.push({
                        $id: att.question_id,
                        question_text: att.question_text || att.question_id,
                        correct_option: att.correct_option || '',
                        option_a: att.option_a || '',
                        option_b: att.option_b || '',
                        option_c: att.option_c || '',
                        option_d: att.option_d || '',
                        subject_id: att.subject_id || '',
                        subtopic: att.subtopic || '',
                        explanation: att.explanation || '',
                      } as Question)
                    }
                  }
                }
              } catch {}

              const sessionDate = sess.submitted_at || sess.$createdAt || ''

              for (const q of questions) {
                if (!wrongIds.has(q.$id)) continue
                if (wrongMap.has(q.$id)) {
                  const entry = wrongMap.get(q.$id)!
                  entry.wrongCount++
                  if (sessionDate > entry.lastAt) entry.lastAt = sessionDate
                } else {
                  wrongMap.set(q.$id, {
                    question: q,
                    subjectId: q.subject_id,
                    wrongCount: 1,
                    lastAt: sessionDate,
                  })
                }
              }
            })
          )
          processed += batch.length
          setLoadingMsg(`Loading mistakes from ${Math.min(processed, total)}/${total} sessions…`)
        }

        const entries: MistakeEntry[] = Array.from(wrongMap.values()).map(e => ({
          question: e.question,
          subjectId: e.subjectId,
          subjectName: subjectNameMap.get(e.subjectId) || e.subjectId,
          wrongCount: e.wrongCount,
          lastAttemptedAt: e.lastAt,
        }))
        setMistakes(entries)
      } catch (e: any) {
        console.error('[Mistakes] load failed:', e)
        toast.error('Failed to load mistakes')
      } finally {
        setDone(true)
      }
    }

    load()
  }, [userId])

  // Filter + sort
  const displayed = mistakes
    .filter(m => subjectFilter === 'all' || m.subjectId === subjectFilter)
    .sort((a, b) => {
      if (sort === 'most_wrong') return b.wrongCount - a.wrongCount
      return b.lastAttemptedAt.localeCompare(a.lastAttemptedAt)
    })

  // Unique subjects present in mistakes
  const mistakeSubjects = Array.from(new Set(mistakes.map(m => m.subjectId)))
    .map(id => ({ id, name: subjects.find(s => s.$id === id)?.Name || id }))

  return (
    <div className="min-h-screen bg-[#F8F9FC]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-4 flex items-center gap-3">
          <Link
            href="/tests"
            className="flex items-center gap-1.5 text-sm font-bold text-gray-400 hover:text-gray-900 transition-colors shrink-0"
          >
            <ArrowLeft className="h-4 w-4" /> Tests
          </Link>
          <div>
            <p className="text-sm font-black text-gray-900">All Mistakes</p>
            <p className="text-xs text-gray-400">
              Questions you&apos;ve got wrong across all your tests
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 space-y-5">
        {/* Loading state */}
        {!done && (
          <div className="flex items-center gap-3 text-sm text-gray-500 bg-white rounded-2xl border border-gray-100 p-4">
            <Loader2 className="h-4 w-4 text-[#FF6B00] animate-spin shrink-0" />
            {loadingMsg}
          </div>
        )}

        {/* Filters — shown once data starts coming in */}
        {(done || mistakes.length > 0) && (
          <div className="flex flex-wrap gap-3">
            <select
              value={subjectFilter}
              onChange={e => setSubjectFilter(e.target.value)}
              className="text-xs font-bold bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/30"
            >
              <option value="all">All Subjects</option>
              {mistakeSubjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <select
              value={sort}
              onChange={e => setSort(e.target.value as 'most_wrong' | 'most_recent')}
              className="text-xs font-bold bg-white border border-gray-200 rounded-xl px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/30"
            >
              <option value="most_wrong">Most Wrong First</option>
              <option value="most_recent">Most Recent First</option>
            </select>
          </div>
        )}

        {/* Empty state */}
        {done && displayed.length === 0 && (
          <div className="text-center py-20 space-y-4">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto">
              <BookOpen className="h-10 w-10 text-green-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">
              {mistakes.length === 0 ? 'No mistakes yet — keep it up!' : 'No mistakes match this filter.'}
            </h3>
            {mistakes.length === 0 && (
              <p className="text-sm text-gray-500">Complete some tests to see your mistake history here.</p>
            )}
          </div>
        )}

        {/* Mistake cards */}
        {displayed.map(entry => (
          <div key={entry.question.$id} className="relative">
            {entry.wrongCount >= 2 && (
              <div className="absolute -top-2 -right-2 z-10 flex items-center gap-1 bg-red-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-sm">
                <AlertCircle className="h-3 w-3" />
                Wrong {entry.wrongCount}×
              </div>
            )}
            <QuestionReviewCard
              question={entry.question}
              userAnswer={null}
              isCorrect={false}
              wasSkipped={false}
              subjectName={entry.subjectName}
              subjects={subjects}
              showSaveNote
            />
          </div>
        ))}

        {/* Count */}
        {done && displayed.length > 0 && (
          <p className="text-center text-xs text-gray-400 py-2">
            {displayed.length} mistake{displayed.length !== 1 ? 's' : ''} found across your last {SESSIONS_TO_SCAN} tests
          </p>
        )}
      </div>
    </div>
  )
}
