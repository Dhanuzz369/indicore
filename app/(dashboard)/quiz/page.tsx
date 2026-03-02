'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSubjects, getQuestions } from '@/lib/appwrite/queries'
import { useQuizStore } from '@/store/quiz-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Loader2, ArrowRight } from 'lucide-react'
import type { Subject, Question } from '@/types'

const EXAM_OPTIONS = ['UPSC', 'TNPSC', 'KPSC', 'MPPSC', 'UPPSC']
const YEAR_OPTIONS = [2019, 2020, 2021, 2022, 2023, 2024]
const QUESTION_COUNT_OPTIONS = [10, 20, 30, 50]

export default function QuizPage() {
  const router = useRouter()
  const setQuestions = useQuizStore((state) => state.setQuestions)

  // ─────────────────────────────────────────────────────────────────
  // STATE
  // ─────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true)
  const [startLoading, setStartLoading] = useState(false)
  const [subjects, setSubjects] = useState<Subject[]>([])

  const [selectedExam, setSelectedExam] = useState('UPSC')
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [selectedYears, setSelectedYears] = useState<number[]>([])
  const [questionCount, setQuestionCount] = useState(20)

  // ─────────────────────────────────────────────────────────────────
  // FETCH SUBJECTS ON MOUNT
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const result = await getSubjects()
        setSubjects(result.documents as unknown as Subject[])
      } catch (error) {
        toast.error('Failed to load subjects')
      } finally {
        setLoading(false)
      }
    }

    fetchSubjects()
  }, [])

  // ─────────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────────
  const toggleSubject = (subjectId: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subjectId)
        ? prev.filter((id) => id !== subjectId)
        : [...prev, subjectId]
    )
  }

  const toggleAllSubjects = () => {
    if (selectedSubjects.length === subjects.length) {
      setSelectedSubjects([])
    } else {
      setSelectedSubjects(subjects.map((s) => s.$id))
    }
  }

  const toggleYear = (year: number) => {
    setSelectedYears((prev) =>
      prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year]
    )
  }

  const toggleAllYears = () => {
    if (selectedYears.length === YEAR_OPTIONS.length) {
      setSelectedYears([])
    } else {
      setSelectedYears(YEAR_OPTIONS)
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // START PRACTICE HANDLER
  // ─────────────────────────────────────────────────────────────────
  const handleStartPractice = async () => {
    setStartLoading(true)

    try {
      // Build filters from selected state
      const filters: {
        examType: string
        subjectId?: string
        year?: number
        limit: number
      } = {
        examType: selectedExam,
        limit: questionCount,
      }

      // Add subject filter if specific subjects selected
      if (selectedSubjects.length > 0 && selectedSubjects.length < subjects.length) {
        filters.subjectId = selectedSubjects[0] // For now, use first selected subject
      }

      // Add year filter if specific years selected
      if (selectedYears.length > 0 && selectedYears.length < YEAR_OPTIONS.length) {
        filters.year = selectedYears[0] // For now, use first selected year
      }

      // Fetch questions
      const result = await getQuestions(filters)

      if (!result.documents || result.documents.length === 0) {
        toast.error('No questions found. Try different filters.')
        setStartLoading(false)
        return
      }

      // Set questions in store
      setQuestions(result.documents as unknown as Question[])

      // Generate session ID and navigate
      const sessionId = crypto.randomUUID()
      router.push('/quiz/session?id=' + sessionId)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to start practice')
      setStartLoading(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // LOADING STATE
  // ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid lg:grid-cols-[1fr_320px] gap-6">
          <div className="space-y-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  // Calculate summary
  const subjectSummary =
    selectedSubjects.length === 0 || selectedSubjects.length === subjects.length
      ? 'All Subjects'
      : `${selectedSubjects.length} Subject${selectedSubjects.length > 1 ? 's' : ''}`

  // ─────────────────────────────────────────────────────────────────
  // PAGE CONTENT
  // ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Practice Session</h1>
        <p className="text-muted-foreground">Customise your quiz</p>
      </div>

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        {/* LEFT: FILTERS */}
        <div className="space-y-4">
          {/* CARD 1: Select Exam */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Select Exam</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {EXAM_OPTIONS.map((exam) => (
                  <button
                    key={exam}
                    onClick={() => setSelectedExam(exam)}
                    className={`px-4 py-1 rounded-full font-medium transition-colors ${selectedExam === exam
                        ? 'bg-[#FF6B00] text-white'
                        : 'border border-gray-300 hover:border-[#FF6B00] text-gray-700'
                      }`}
                  >
                    {exam}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* CARD 2: Select Subject */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Select Subject</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {/* All Subjects Toggle */}
                <button
                  onClick={toggleAllSubjects}
                  className={`px-4 py-1 rounded-full font-medium transition-colors ${selectedSubjects.length === subjects.length
                      ? 'bg-[#FFF3EC] border border-[#FF6B00] text-[#FF6B00]'
                      : 'border border-gray-300 hover:border-[#FF6B00] text-gray-700'
                    }`}
                >
                  All Subjects
                </button>

                {/* Individual Subjects */}
                {subjects.map((subject) => (
                  <button
                    key={subject.$id}
                    onClick={() => toggleSubject(subject.$id)}
                    className={`px-4 py-1 rounded-full font-medium transition-colors ${selectedSubjects.includes(subject.$id)
                        ? 'bg-[#FFF3EC] border border-[#FF6B00] text-[#FF6B00]'
                        : 'border border-gray-300 hover:border-[#FF6B00] text-gray-700'
                      }`}
                  >
                    {subject.name}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* CARD 3: Select Year */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Select Year</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {/* All Years Toggle */}
                <button
                  onClick={toggleAllYears}
                  className={`px-4 py-1 rounded-full font-medium transition-colors ${selectedYears.length === YEAR_OPTIONS.length
                      ? 'bg-[#FFF3EC] border border-[#FF6B00] text-[#FF6B00]'
                      : 'border border-gray-300 hover:border-[#FF6B00] text-gray-700'
                    }`}
                >
                  All Years
                </button>

                {/* Individual Years */}
                {YEAR_OPTIONS.map((year) => (
                  <button
                    key={year}
                    onClick={() => toggleYear(year)}
                    className={`px-4 py-1 rounded-full font-medium transition-colors ${selectedYears.includes(year)
                        ? 'bg-[#FFF3EC] border border-[#FF6B00] text-[#FF6B00]'
                        : 'border border-gray-300 hover:border-[#FF6B00] text-gray-700'
                      }`}
                  >
                    {year}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* CARD 4: Number of Questions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Number of Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {QUESTION_COUNT_OPTIONS.map((count) => (
                  <button
                    key={count}
                    onClick={() => setQuestionCount(count)}
                    className={`px-4 py-1 rounded-full font-medium transition-colors ${questionCount === count
                        ? 'bg-[#FF6B00] text-white'
                        : 'border border-gray-300 hover:border-[#FF6B00] text-gray-700'
                      }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: SUMMARY CARD */}
        <Card className="lg:sticky lg:top-6 h-fit">
          <CardHeader>
            <CardTitle className="text-lg">Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground space-y-1">
              <p>
                <span className="font-semibold text-foreground">{questionCount}</span> Questions
              </p>
              <p>
                <span className="font-semibold text-foreground">{selectedExam}</span> Exam
              </p>
              <p>
                <span className="font-semibold text-foreground">{subjectSummary}</span>
              </p>
              {selectedYears.length > 0 && selectedYears.length < YEAR_OPTIONS.length && (
                <p>
                  <span className="font-semibold text-foreground">
                    {selectedYears.length} Year{selectedYears.length > 1 ? 's' : ''}
                  </span>{' '}
                  selected
                </p>
              )}
            </div>

            <Button
              onClick={handleStartPractice}
              disabled={startLoading}
              className="w-full bg-[#FF6B00] hover:bg-[#FF8C00]"
              size="lg"
            >
              {startLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  Start Practice
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
