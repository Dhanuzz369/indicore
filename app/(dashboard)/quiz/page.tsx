'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSubjects, getQuestions, getQuestionCountBySubject } from '@/lib/appwrite/queries'
import { useQuizStore } from '@/store/quiz-store'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
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
  if (l.includes('secur') || l.includes('defence')) return '🛡️'
  if (l.includes('social')) return '🤝'
  return '📚'
}

function QuizSetupContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const subjectParam = searchParams.get('subject')
  const { setQuestions, setTestMode, setPaperLabel } = useQuizStore()

  // Full test state
  const [loadingCardId, setLoadingCardId] = useState<string | null>(null)

  // Subject practice states
  type SubjectWithCount = Subject & { count: number }
  const [subjects, setSubjects] = useState<SubjectWithCount[]>([])
  const [loadingSubjects, setLoadingSubjects] = useState(true)
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)
  const [selectedDifficulty, setSelectedDifficulty] = useState<'All' | 'Easy' | 'Medium' | 'Hard'>('All')
  const [questionCount, setQuestionCount] = useState(20)
  const [startLoading, setStartLoading] = useState(false)

  // Fetch subjects
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const result = await getSubjects()
        const subjectsData = result.documents as unknown as Subject[]
        const withCounts = await Promise.all(
          subjectsData.map(async (subj) => {
            const count = await getQuestionCountBySubject(subj.$id)
            return { ...subj, count }
          })
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
      if (!result.documents?.length) {
        toast.error('No questions found for this paper yet.')
        setLoadingCardId(null)
        return
      }
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
      const filters: Parameters<typeof getQuestions>[0] = {
        subjectId: selectedSubject.$id,
        limit: questionCount,
      }
      if (selectedDifficulty !== 'All') filters.difficulty = selectedDifficulty.toLowerCase()

      const result = await getQuestions(filters)
      if (!result.documents?.length) {
        toast.error('No questions found. Try different filters.')
        setStartLoading(false)
        return
      }
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
        <TabsList className="w-full h-12 grid grid-cols-2 bg-gray-100 p-1 rounded-lg">
          <TabsTrigger value="full" className="rounded-md data-[state=active]:bg-[#FF6B00] data-[state=active]:text-white font-medium">
            Full Length Test
          </TabsTrigger>
          <TabsTrigger value="subject" className="rounded-md data-[state=active]:bg-[#FF6B00] data-[state=active]:text-white font-medium">
            Subject-wise Practice
          </TabsTrigger>
        </TabsList>

        {/* ──────── FULL LENGTH TEST ──────── */}
        <TabsContent value="full" className="mt-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Full Length Test</h1>
            <p className="text-muted-foreground mt-1">Attempt a complete previous year paper under timed conditions</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PAPER_OPTIONS.map((paper) => {
              const isLoading = loadingCardId === paper.id
              return (
                <Card
                  key={paper.id}
                  className="group flex flex-col p-6 cursor-pointer hover:shadow-lg hover:ring-2 hover:ring-[#FF6B00] transition-all bg-white"
                  onClick={() => !loadingCardId && handleStartTest(paper)}
                >
                  <div className="flex-1 space-y-4">
                    <div className="inline-block px-3 py-1 bg-orange-100 text-[#FF6B00] font-semibold text-xs rounded-full">
                      {paper.badgeLabel}
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 group-hover:text-[#FF6B00] transition-colors">
                        {paper.label.replace(` ${paper.year}`, '')}
                      </h3>
                      <div className="text-3xl font-bold text-[#FF6B00] mt-1">{paper.year}</div>
                    </div>
                    <div className="flex items-center text-sm font-medium text-gray-500 gap-2">
                      <span>{paper.questions} Questions</span>
                      <span>•</span>
                      <span>{paper.time}</span>
                      <span>•</span>
                      <span>{paper.subject}</span>
                    </div>
                  </div>
                  <div className="mt-6">
                    <button
                      disabled={loadingCardId !== null}
                      className="w-full bg-[#FF6B00] hover:bg-[#FF8C00] text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-75"
                    >
                      {isLoading ? <><Loader2 className="h-5 w-5 animate-spin" />Loading Paper...</> : <>Start Test →</>}
                    </button>
                  </div>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* ──────── SUBJECT PRACTICE ──────── */}
        <TabsContent value="subject" className="mt-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Subject-wise Practice</h1>
            <p className="text-muted-foreground mt-1">Pick a subject and practice targeted PYQs</p>
          </div>

          {/* Subject Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {loadingSubjects
              ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)
              : subjects.map(subj => {
                const isSelected = selectedSubject?.$id === subj.$id
                const subjectColor = subj.color || '#FF6B00'
                return (
                  <Card
                    key={subj.$id}
                    onClick={() => setSelectedSubject(isSelected ? null : subj)}
                    className={`cursor-pointer overflow-hidden transition-all duration-300 border-l-4 ${isSelected
                        ? 'ring-2 ring-[#FF6B00] shadow-lg'
                        : 'hover:shadow-md'
                      }`}
                    style={{
                      borderLeftColor: isSelected ? '#FF6B00' : subjectColor,
                      backgroundColor: isSelected ? '#FFF8F4' : 'white',
                    }}
                  >
                    <div className="p-4 md:p-5 flex flex-col gap-2">
                      <div className="text-3xl">{getEmoji(subj.Name)}</div>
                      <div>
                        <h3 className="font-semibold text-base text-gray-900">{subj.Name}</h3>
                        <p className="text-xs text-muted-foreground mt-1">{subj.count} Questions</p>
                      </div>
                    </div>
                  </Card>
                )
              })
            }
          </div>

          {/* Config section — slides in when subject selected */}
          {selectedSubject && (
            <div className="mt-8 grid lg:grid-cols-[1fr_280px] gap-6 animate-in fade-in slide-in-from-top-2 duration-300">

              {/* Left: Settings */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold text-gray-800">
                    Customise Your Practice
                  </CardTitle>
                </CardHeader>
                <div className="px-6 pb-6 space-y-5">

                  {/* Difficulty */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Difficulty</label>
                    <div className="flex flex-wrap gap-2">
                      {DIFFICULTY_OPTIONS.map(diff => {
                        const isActive = selectedDifficulty === diff
                        const getStyle = () => {
                          if (!isActive) return 'border border-gray-200 text-gray-600 hover:border-[#FF6B00] hover:text-[#FF6B00]'
                          if (diff === 'Easy') return 'bg-green-100 border border-green-500 text-green-700'
                          if (diff === 'Medium') return 'bg-yellow-100 border border-yellow-500 text-yellow-700'
                          if (diff === 'Hard') return 'bg-red-100 border border-red-500 text-red-700'
                          return 'bg-gray-100 border border-gray-400 text-gray-700'
                        }
                        return (
                          <button
                            key={diff}
                            onClick={() => setSelectedDifficulty(diff)}
                            className={`px-4 py-1.5 text-sm rounded-full transition-colors ${getStyle()}`}
                          >
                            {diff}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Question Count */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-gray-700">Number of Questions</label>
                    <div className="flex flex-wrap gap-2">
                      {QUESTION_COUNT_OPTIONS.map(cnt => (
                        <button
                          key={cnt}
                          onClick={() => setQuestionCount(cnt)}
                          className={`px-4 py-1.5 text-sm rounded-full transition-colors ${questionCount === cnt
                              ? 'bg-[#FF6B00] text-white'
                              : 'border border-gray-200 text-gray-600 hover:border-[#FF6B00] hover:text-[#FF6B00]'
                            }`}
                        >
                          {cnt}
                        </button>
                      ))}
                    </div>
                  </div>

                </div>
              </Card>

              {/* Right: Summary + Start */}
              <Card className="sticky top-6 h-fit">
                <div className="p-6 flex flex-col items-center text-center gap-4">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                    style={{ backgroundColor: (selectedSubject.color || '#FF6B00') + '20' }}
                  >
                    {getEmoji(selectedSubject.Name)}
                  </div>
                  <div>
                    <h4 className="font-bold text-lg text-gray-900">{selectedSubject.Name}</h4>
                    <div className="text-sm text-muted-foreground mt-1 space-y-0.5">
                      <p>{questionCount} Questions</p>
                      <p className="capitalize">{selectedDifficulty === 'All' ? 'All Difficulties' : selectedDifficulty + ' only'}</p>
                    </div>
                  </div>
                  <div className="w-full border-t border-gray-100" />
                  <button
                    disabled={startLoading}
                    onClick={handleStartPractice}
                    className="w-full bg-[#FF6B00] hover:bg-[#FF8C00] text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {startLoading ? <><Loader2 className="h-5 w-5 animate-spin" />Loading...</> : <>Start Practice →</>}
                  </button>
                </div>
              </Card>

            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function QuizSetupPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Loading...</div>}>
      <QuizSetupContent />
    </Suspense>
  )
}
