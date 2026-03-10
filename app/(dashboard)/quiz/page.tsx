'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSubjects, getQuestions, getQuestionCountBySubject } from '@/lib/appwrite/queries'
import { useQuizStore } from '@/store/quiz-store'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Loader2, ChevronRight } from 'lucide-react'
import type { Question, Subject } from '@/types'
import { Skeleton } from '@/components/ui/skeleton'

const PAPER_OPTIONS = [
  { examType: "UPSC_PRE", year: 2024, label: "UPSC Prelims GS-I 2024", questions: 100, time: "2 Hours", subject: "GS Paper I", badgeLabel: "UPSC Prelims", id: "p1" },
  { examType: "UPSC_PRE", year: 2023, label: "UPSC Prelims GS-I 2023", questions: 100, time: "2 Hours", subject: "GS Paper I", badgeLabel: "UPSC Prelims", id: "p2" },
  { examType: "UPSC_PRE", year: 2022, label: "UPSC Prelims GS-I 2022", questions: 100, time: "2 Hours", subject: "GS Paper I", badgeLabel: "UPSC Prelims", id: "p3" },
  { examType: "TNPSC", year: 2024, label: "TNPSC Group I 2024", questions: 100, time: "2 Hours", subject: "GS Paper I", badgeLabel: "TNPSC Group I", id: "p4" }
]

const DIFFICULTY_OPTIONS = ['All', 'Easy', 'Medium', 'Hard'] as const
const QUESTION_COUNT_OPTIONS = [10, 20, 30, 50]

function getEmoji(name?: string) {
  if (!name) return '📚'
  const l = name.toLowerCase()
  if (l.includes('geo')) return '🌍'
  if (l.includes('polity') || l.includes('governance')) return '⚖️'
  if (l.includes('hist')) return '🏛️'
  if (l.includes('econ')) return '📈'
  if (l.includes('environ')) return '🌿'
  if (l.includes('science') || l.includes('tech')) return '🔬'
  if (l.includes('art') || l.includes('cult')) return '🎨'
  if (l.includes('intern') || l.includes('relation')) return '🌐'
  return '📚'
}

function QuizSetupContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const subjectParam = searchParams.get('subject')
  const { setQuestions, setTestMode, setPaperLabel } = useQuizStore()

  const [loadingCardId, setLoadingCardId] = useState<string | null>(null)
  type SubjectWithCount = Subject & { count: number }
  const [subjects, setSubjects] = useState<SubjectWithCount[]>([])
  const [loadingSubjects, setLoadingSubjects] = useState(true)
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)
  const [selectedDifficulty, setSelectedDifficulty] = useState<'All' | 'Easy' | 'Medium' | 'Hard'>('All')
  const [questionCount, setQuestionCount] = useState(20)
  const [startLoading, setStartLoading] = useState(false)

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const result = await getSubjects()
        const subjectsData = result.documents as unknown as Subject[]
        const withCounts = await Promise.all(
          subjectsData.map(async (subj) => ({
            ...subj,
            count: await getQuestionCountBySubject(subj.$id)
          }))
        )
        setSubjects(withCounts)
        if (subjectParam) {
          const matched = withCounts.find(s => s.slug === subjectParam || s.$id === subjectParam)
          if (matched) setSelectedSubject(matched)
        }
      } catch {
        toast.error('Failed to load subjects')
      } finally {
        setLoadingSubjects(false)
      }
    }
    fetchSubjects()
  }, [subjectParam])

  const handleStartTest = async (paper: typeof PAPER_OPTIONS[0]) => {
    setLoadingCardId(paper.id)
    try {
      const result = await getQuestions({ limit: paper.questions, examType: paper.examType, year: paper.year })
      if (!result.documents?.length) { toast.error('No questions found for this paper yet.'); setLoadingCardId(null); return }
      setQuestions(result.documents as unknown as Question[])
      setTestMode(true)
      setPaperLabel(paper.label)
      router.push('/quiz/session?id=' + crypto.randomUUID())
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to start test')
      setLoadingCardId(null)
    }
  }

  const handleStartPractice = async () => {
    if (!selectedSubject) return
    setStartLoading(true)
    try {
      const filters: Parameters<typeof getQuestions>[0] = { subjectId: selectedSubject.$id, limit: questionCount }
      if (selectedDifficulty !== 'All') filters.difficulty = selectedDifficulty.toLowerCase()
      const result = await getQuestions(filters)
      if (!result.documents?.length) { toast.error('No questions found. Try different filters.'); setStartLoading(false); return }
      setQuestions(result.documents as unknown as Question[])
      setTestMode(false)
      setPaperLabel(`${selectedSubject.Name} · UPSC PYQ`)
      router.push('/quiz/session?id=' + crypto.randomUUID())
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to start practice')
      setStartLoading(false)
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <Tabs defaultValue={tabParam === 'subject' ? 'subject' : 'full'}>
        <TabsList className="w-full h-12 grid grid-cols-2 bg-gray-100 p-1 rounded-xl">
          <TabsTrigger value="full" className="rounded-lg data-[state=active]:bg-[#FF6B00] data-[state=active]:text-white font-medium">
            Full Length Test
          </TabsTrigger>
          <TabsTrigger value="subject" className="rounded-lg data-[state=active]:bg-[#FF6B00] data-[state=active]:text-white font-medium">
            Subject Practice
          </TabsTrigger>
        </TabsList>

        {/* ── FULL LENGTH TEST ── */}
        <TabsContent value="full" className="mt-6">
          <div className="mb-5">
            <h1 className="text-xl font-bold text-gray-900">Full Length Test</h1>
            <p className="text-sm text-gray-500 mt-0.5">Complete previous year paper under timed conditions</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PAPER_OPTIONS.map((paper) => {
              const isLoading = loadingCardId === paper.id
              return (
                <div
                  key={paper.id}
                  onClick={() => !loadingCardId && handleStartTest(paper)}
                  className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-[#FF6B00]/30 transition-all cursor-pointer p-5 flex flex-col gap-4"
                >
                  <div>
                    <span className="inline-block px-2.5 py-1 bg-orange-50 text-[#FF6B00] font-semibold text-xs rounded-full">
                      {paper.badgeLabel}
                    </span>
                    <div className="mt-2">
                      <h3 className="font-bold text-gray-900 group-hover:text-[#FF6B00] transition-colors">
                        {paper.label.replace(` ${paper.year}`, '')}
                      </h3>
                      <div className="text-3xl font-black text-[#FF6B00] mt-1">{paper.year}</div>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-medium text-gray-400 mt-2">
                      <span>{paper.questions} Questions</span><span>·</span>
                      <span>{paper.time}</span><span>·</span>
                      <span>{paper.subject}</span>
                    </div>
                  </div>
                  <button
                    disabled={loadingCardId !== null}
                    className="w-full bg-[#FF6B00] hover:bg-[#FF8C00] text-white py-2.5 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {isLoading ? <><Loader2 className="h-4 w-4 animate-spin" />Loading...</> : <>Start Test <ChevronRight className="h-4 w-4" /></>}
                  </button>
                </div>
              )
            })}
          </div>
        </TabsContent>

        {/* ── SUBJECT PRACTICE — two-column when subject selected ── */}
        <TabsContent value="subject" className="mt-6">
          <div className="mb-5">
            <h1 className="text-xl font-bold text-gray-900">Subject-wise Practice</h1>
            <p className="text-sm text-gray-500 mt-0.5">Pick a subject and start practicing targeted PYQs</p>
          </div>

          {/* Two-column layout: subjects left (or full width), config right when active */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">

            {/* Left: Subject Grid */}
            <div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                {loadingSubjects
                  ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
                  : subjects.map(subj => {
                    const isSelected = selectedSubject?.$id === subj.$id
                    return (
                      <button
                        key={subj.$id}
                        onClick={() => setSelectedSubject(isSelected ? null : subj)}
                        className={`relative text-left w-full rounded-2xl p-4 border-2 transition-all duration-200 overflow-hidden ${isSelected
                            ? 'border-[#FF6B00] bg-[#FFF8F4] shadow-md scale-[1.02]'
                            : 'border-gray-100 bg-white hover:border-[#FF6B00]/40 hover:shadow-sm'
                          }`}
                      >
                        {/* Colored top accent bar */}
                        <div
                          className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
                          style={{ backgroundColor: subj.color || '#FF6B00' }}
                        />
                        <div className="mt-1">
                          <div className="text-2xl mb-1.5">{getEmoji(subj.Name)}</div>
                          <h3 className={`font-semibold text-sm leading-tight ${isSelected ? 'text-[#FF6B00]' : 'text-gray-800'}`}>
                            {subj.Name}
                          </h3>
                          <p className="text-[11px] text-gray-400 mt-0.5">{subj.count} questions</p>
                        </div>
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#FF6B00] flex items-center justify-center">
                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </button>
                    )
                  })
                }
              </div>

              {/* Mobile: show config inline below grid when selected */}
              {selectedSubject && (
                <div className="lg:hidden mt-4 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <PracticeConfig
                    subject={selectedSubject}
                    difficulty={selectedDifficulty}
                    setDifficulty={setSelectedDifficulty}
                    count={questionCount}
                    setCount={setQuestionCount}
                    loading={startLoading}
                    onStart={handleStartPractice}
                  />
                </div>
              )}
            </div>

            {/* Right: sticky config panel — desktop only */}
            <div className="hidden lg:block">
              {selectedSubject ? (
                <div className="sticky top-4 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <PracticeConfig
                    subject={selectedSubject}
                    difficulty={selectedDifficulty}
                    setDifficulty={setSelectedDifficulty}
                    count={questionCount}
                    setCount={setQuestionCount}
                    loading={startLoading}
                    onStart={handleStartPractice}
                  />
                </div>
              ) : (
                <div className="sticky top-4 rounded-2xl border-2 border-dashed border-gray-200 p-8 flex flex-col items-center justify-center text-center gap-3 h-64">
                  <div className="text-4xl">👈</div>
                  <p className="text-gray-500 text-sm font-medium">Select a subject to configure your practice session</p>
                </div>
              )}
            </div>

          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// Reusable practice configuration panel
// ──────────────────────────────────────────────────────────────
interface PracticeConfigProps {
  subject: Subject
  difficulty: 'All' | 'Easy' | 'Medium' | 'Hard'
  setDifficulty: (d: 'All' | 'Easy' | 'Medium' | 'Hard') => void
  count: number
  setCount: (n: number) => void
  loading: boolean
  onStart: () => void
}

function PracticeConfig({ subject, difficulty, setDifficulty, count, setCount, loading, onStart }: PracticeConfigProps) {
  const difficultyStyles: Record<string, string> = {
    All: 'bg-gray-100 text-gray-700',
    Easy: 'bg-green-100 text-green-700 border-green-400',
    Medium: 'bg-yellow-100 text-yellow-700 border-yellow-400',
    Hard: 'bg-red-100 text-red-700 border-red-400',
  }

  return (
    <>
      {/* Header */}
      <div className="bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] p-5 text-white">
        <div className="text-3xl mb-1">{getEmoji(subject.Name)}</div>
        <h3 className="font-bold text-lg">{subject.Name}</h3>
        <p className="text-orange-100 text-xs mt-0.5">Configure your practice session</p>
      </div>

      <div className="p-5 space-y-5">
        {/* Difficulty */}
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Difficulty</label>
          <div className="grid grid-cols-4 gap-1.5 mt-2">
            {DIFFICULTY_OPTIONS.map(diff => (
              <button
                key={diff}
                onClick={() => setDifficulty(diff)}
                className={`py-1.5 text-xs font-semibold rounded-lg border transition-all ${difficulty === diff
                    ? difficultyStyles[diff] + ' border-current'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                  }`}
              >
                {diff}
              </button>
            ))}
          </div>
        </div>

        {/* Question Count */}
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Questions</label>
          <div className="grid grid-cols-4 gap-1.5 mt-2">
            {QUESTION_COUNT_OPTIONS.map(n => (
              <button
                key={n}
                onClick={() => setCount(n)}
                className={`py-1.5 text-sm font-semibold rounded-lg border transition-all ${count === n
                    ? 'bg-[#FF6B00] text-white border-[#FF6B00]'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-[#FF6B00]/50'
                  }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600 space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-400">Subject</span>
            <span className="font-semibold text-gray-800">{subject.Name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Questions</span>
            <span className="font-semibold text-gray-800">{count}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Difficulty</span>
            <span className="font-semibold text-gray-800">{difficulty === 'All' ? 'All Levels' : difficulty}</span>
          </div>
        </div>

        {/* Start Button */}
        <button
          onClick={onStart}
          disabled={loading}
          className="w-full bg-[#FF6B00] hover:bg-[#FF8C00] text-white py-3 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
        >
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Loading...</> : <>Start Practice <ChevronRight className="h-4 w-4" /></>}
        </button>
      </div>
    </>
  )
}

export default function QuizSetupPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-400 text-sm">Loading...</div>}>
      <QuizSetupContent />
    </Suspense>
  )
}
