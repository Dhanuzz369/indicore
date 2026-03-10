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
  {
    examType: "UPSC_PRE",
    year: 2024,
    label: "UPSC Prelims GS-I 2024",
    questions: 100,
    time: "2 Hours",
    subject: "GS Paper I",
    badgeLabel: "UPSC Prelims",
    id: "p1"
  },
  {
    examType: "UPSC_PRE",
    year: 2023,
    label: "UPSC Prelims GS-I 2023",
    questions: 100,
    time: "2 Hours",
    subject: "GS Paper I",
    badgeLabel: "UPSC Prelims",
    id: "p2"
  },
  {
    examType: "UPSC_PRE",
    year: 2022,
    label: "UPSC Prelims GS-I 2022",
    questions: 100,
    time: "2 Hours",
    subject: "GS Paper I",
    badgeLabel: "UPSC Prelims",
    id: "p3"
  },
  {
    examType: "TNPSC",
    year: 2024,
    label: "TNPSC Group I 2024",
    questions: 100,
    time: "2 Hours",
    subject: "GS Paper I",
    badgeLabel: "TNPSC Group I",
    id: "p4"
  }
]

const EXAM_OPTIONS = ['UPSC_PRE', 'TNPSC', 'KPSC', 'MPPSC', 'UPPSC']
const YEAR_OPTIONS = ['All', 2024, 2023, 2022, 2021, 2020, 2019]
const DIFFICULTY_OPTIONS = ['all', 'easy', 'medium', 'hard']
const QUESTION_COUNT_OPTIONS = [10, 20, 30, 50]

function QuizSetupContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const subjectParam = searchParams.get('subject')

  const { setQuestions, setTestMode, setPaperLabel } = useQuizStore()

  // Full test state
  const [loadingCardId, setLoadingCardId] = useState<string | null>(null)

  // Subject practice states
  const [subjects, setSubjects] = useState<(Subject & { count: number })[]>([])
  const [loadingSubjects, setLoadingSubjects] = useState(true)

  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)
  const [selectedExam, setSelectedExam] = useState('UPSC_PRE')
  const [selectedYears, setSelectedYears] = useState<number[]>([])
  const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'medium' | 'hard' | 'all'>('all')
  const [questionCount, setQuestionCount] = useState(20)

  const [startLoading, setStartLoading] = useState(false)

  // Fetch subjects for practice mode
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const result = await getSubjects()
        const subjectsData = result.documents as unknown as Subject[]

        // Fetch counts
        const withCounts = await Promise.all(
          subjectsData.map(async (subj) => {
            const count = await getQuestionCountBySubject(subj.$id)
            return { ...subj, count }
          })
        )
        setSubjects(withCounts)

        // Pre-select if param exists
        if (subjectParam) {
          const matched = withCounts.find(s => s.slug === subjectParam || s.$id === subjectParam)
          if (matched) setSelectedSubject(matched)
        }
      } catch (error) {
        toast.error('Failed to load subjects')
      } finally {
        setLoadingSubjects(false)
      }
    }
    fetchSubjects()
  }, [subjectParam])

  // Helpers
  const handleStartTest = async (paper: typeof PAPER_OPTIONS[0]) => {
    setLoadingCardId(paper.id)
    try {
      const filters = { limit: paper.questions, examType: paper.examType, year: paper.year }
      const result = await getQuestions(filters)
      if (!result.documents || result.documents.length === 0) {
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
      const filters: any = {
        examType: selectedExam,
        subjectId: selectedSubject.$id,
        limit: questionCount,
      }
      if (selectedYears.length > 0) filters.years = selectedYears
      if (selectedDifficulty !== 'all') filters.difficulty = selectedDifficulty

      const result = await getQuestions(filters)
      if (!result.documents || result.documents.length === 0) {
        toast.error('No questions found. Try different filters.')
        setStartLoading(false)
        return
      }

      setQuestions(result.documents as unknown as Question[])
      setTestMode(false)
      const examDisplay = EXAM_OPTIONS.find(e => e === selectedExam) || selectedExam
      setPaperLabel(`${selectedSubject.name} · ${examDisplay === 'UPSC_PRE' ? 'UPSC' : examDisplay} PYQ`)
      router.push('/quiz/session?id=' + crypto.randomUUID())
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to start practice')
      setStartLoading(false)
    }
  }

  const toggleYear = (yr: Extract<typeof YEAR_OPTIONS[0], number>) => {
    if (selectedYears.includes(yr)) {
      setSelectedYears(selectedYears.filter(y => y !== yr))
    } else {
      setSelectedYears([...selectedYears, yr])
    }
  }

  const getEmoji = (name: string) => {
    const l = name.toLowerCase()
    if (l.includes('geo')) return '🌍'
    if (l.includes('polity')) return '⚖️'
    if (l.includes('history')) return '🏛️'
    if (l.includes('economy')) return '📈'
    if (l.includes('environ')) return '🌿'
    if (l.includes('science')) return '🔬'
    if (l.includes('art')) return '🎨'
    if (l.includes('internation')) return '🌐'
    return '📚'
  }

  return (
    <div className="p-6 space-y-8 max-w-5xl mx-auto">
      <Tabs defaultValue={tabParam === 'subject' ? 'subject' : 'full'}>
        <TabsList className="w-full h-12 grid grid-cols-2 bg-gray-100 p-1 rounded-lg">
          <TabsTrigger value="full" className="rounded-md data-[state=active]:bg-[#FF6B00] data-[state=active]:text-white">
            Full Length Test
          </TabsTrigger>
          <TabsTrigger value="subject" className="rounded-md data-[state=active]:bg-[#FF6B00] data-[state=active]:text-white">
            Subject-wise Practice
          </TabsTrigger>
        </TabsList>

        {/* ──────── FULL LENGTH TEST ──────── */}
        <TabsContent value="full" className="mt-8">
          <div>
            <h1 className="text-2xl font-bold">Full Length Test</h1>
            <p className="text-muted-foreground">Attempt a complete previous year paper</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
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
                      <div className="text-3xl font-bold text-[#FF6B00] mt-1">
                        {paper.year}
                      </div>
                    </div>
                    <div className="flex items-center text-sm font-medium text-gray-500">
                      <span>{paper.questions} Questions</span>
                      <span className="mx-2">•</span>
                      <span>{paper.time}</span>
                      <span className="mx-2">•</span>
                      <span>{paper.subject}</span>
                    </div>
                  </div>
                  <div className="mt-6">
                    <button
                      disabled={loadingCardId !== null}
                      className="w-full bg-[#FF6B00] hover:bg-[#FF8C00] text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-75"
                    >
                      {isLoading ? <><Loader2 className="h-5 w-5 animate-spin" />Loading Paper...</> : <>Start Test &rarr;</>}
                    </button>
                  </div>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* ──────── SUBJECT PRACTICE ──────── */}
        <TabsContent value="subject" className="mt-8 space-y-8">
          <div>
            <h1 className="text-2xl font-bold">Subject-wise Practice</h1>
            <p className="text-muted-foreground">Focus on specific subjects and topics</p>
          </div>

          {/* Subject Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {loadingSubjects ? (
              Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)
            ) : (
              subjects.map(subj => {
                const isSelected = selectedSubject?.$id === subj.$id
                return (
                  <Card
                    key={subj.$id}
                    onClick={() => setSelectedSubject(isSelected ? null : subj)}
                    className={`cursor-pointer overflow-hidden transition-all duration-300 relative border-l-[4px] bg-white ${isSelected
                      ? 'ring-2 ring-[#FF6B00] bg-[#FFF3EC] shadow-md border-l-[#FF6B00]'
                      : 'hover:shadow-md hover:border-[#FF6B00] border-l-gray-300'}`}
                    style={{ borderLeftColor: isSelected ? '#FF6B00' : (subj.color || '#FF6B00') }}
                  >
                    <div className="p-4 md:p-5 flex flex-col gap-3">
                      <div className="text-3xl">{getEmoji(subj.name)}</div>
                      <div>
                        <h3 className="font-semibold text-lg line-clamp-1 text-gray-900">{subj.name}</h3>
                        <p className="text-sm text-muted-foreground font-medium mt-1">
                          {subj.count} Questions available
                        </p>
                      </div>
                    </div>
                  </Card>
                )
              })
            )}
          </div>

          {/* Filters Row - Slide down when subject selected */}
          {selectedSubject && (
            <div className="grid lg:grid-cols-[1fr_320px] gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="space-y-4">
                <Card>
                  <CardHeader><CardTitle className="text-lg">Customise Your Practice</CardTitle></CardHeader>
                  <div className="p-6 pt-0 space-y-6">

                    {/* Exam Filter */}
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-gray-700">Exam</label>
                      <div className="flex flex-wrap gap-2">
                        {EXAM_OPTIONS.map(exam => (
                          <button
                            key={exam}
                            onClick={() => setSelectedExam(exam)}
                            className={`px-4 py-1.5 text-sm rounded-full transition-colors ${selectedExam === exam ? 'bg-[#FF6B00] text-white' : 'border border-gray-300 text-gray-700 hover:border-[#FF6B00]'}`}
                          >
                            {exam === 'UPSC_PRE' ? 'UPSC' : exam}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Year Filter */}
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-gray-700">Year</label>
                      <div className="flex flex-wrap gap-2">
                        {YEAR_OPTIONS.map(yr => {
                          const isAll = yr === 'All';
                          const isSelected = isAll ? selectedYears.length === 0 : selectedYears.includes(yr as number);
                          return (
                            <button
                              key={yr}
                              onClick={() => isAll ? setSelectedYears([]) : toggleYear(yr as number)}
                              className={`px-3 py-1 text-sm rounded-full transition-colors ${isSelected ? 'bg-[#FFF3EC] border border-[#FF6B00] text-[#FF6B00]' : 'border border-gray-300 text-gray-700 hover:border-[#FF6B00]'}`}
                            >
                              {yr}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Difficulty Filter */}
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-gray-700">Difficulty</label>
                      <div className="flex flex-wrap gap-2">
                        {DIFFICULTY_OPTIONS.map(diff => {
                          const isSelected = selectedDifficulty === diff;
                          const getStyle = () => {
                            if (!isSelected) return 'border border-gray-300 text-gray-700 hover:border-[#FF6B00]'
                            if (diff === 'easy') return 'bg-green-100 border border-green-500 text-green-700'
                            if (diff === 'medium') return 'bg-yellow-100 border border-yellow-500 text-yellow-700'
                            if (diff === 'hard') return 'bg-red-100 border border-red-500 text-red-700'
                            return 'bg-gray-100 border border-gray-400 text-gray-700'
                          }
                          return (
                            <button
                              key={diff}
                              onClick={() => setSelectedDifficulty(diff as any)}
                              className={`px-4 py-1.5 text-sm rounded-full transition-colors capitalize ${getStyle()}`}
                            >
                              {diff}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Question Count Filter */}
                    <div className="space-y-3">
                      <label className="text-sm font-semibold text-gray-700">Questions</label>
                      <div className="flex flex-wrap gap-2">
                        {QUESTION_COUNT_OPTIONS.map(cnt => (
                          <button
                            key={cnt}
                            onClick={() => setQuestionCount(cnt)}
                            className={`px-4 py-1.5 text-sm rounded-full transition-colors ${questionCount === cnt ? 'bg-[#FF6B00] text-white' : 'border border-gray-300 text-gray-700 hover:border-[#FF6B00]'}`}
                          >
                            {cnt}
                          </button>
                        ))}
                      </div>
                    </div>

                  </div>
                </Card>
              </div>

              {/* Right Summary */}
              <div>
                <Card className="sticky top-6">
                  <div className="p-6 flex flex-col items-center text-center space-y-6">
                    <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center text-3xl">
                      {getEmoji(selectedSubject.name)}
                    </div>
                    <div>
                      <h4 className="font-bold text-xl">{selectedSubject.name}</h4>
                      <div className="text-sm text-muted-foreground mt-2 space-y-1">
                        <p>{questionCount} Questions · {selectedExam === 'UPSC_PRE' ? 'UPSC' : selectedExam}</p>
                        <p>{selectedYears.length === 0 ? 'All Years' : selectedYears.join(', ')}</p>
                        <p className="capitalize">{selectedDifficulty === 'all' ? 'All Difficulties' : selectedDifficulty}</p>
                      </div>
                    </div>
                    <div className="w-full border-t border-gray-100" />
                    <button
                      disabled={startLoading}
                      onClick={handleStartPractice}
                      className="w-full bg-[#FF6B00] hover:bg-[#FF8C00] text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
                    >
                      {startLoading ? <><Loader2 className="h-5 w-5 animate-spin" /> Loading...</> : <>Start Practice &rarr;</>}
                    </button>
                  </div>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function QuizSetupPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading setup...</div>}>
      <QuizSetupContent />
    </Suspense>
  )
}
