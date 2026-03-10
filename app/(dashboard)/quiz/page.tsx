'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getQuestions } from '@/lib/appwrite/queries'
import { useQuizStore } from '@/store/quiz-store'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import type { Question } from '@/types'

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

export default function QuizSetupPage() {
  const router = useRouter()
  const { setQuestions, setTestMode, setPaperLabel } = useQuizStore()

  const [loadingCardId, setLoadingCardId] = useState<string | null>(null)

  const handleStartTest = async (paper: typeof PAPER_OPTIONS[0]) => {
    setLoadingCardId(paper.id)

    try {
      const filters = {
        examType: paper.examType,
        year: paper.year,
        limit: paper.questions,
      }

      const result = await getQuestions(filters)

      if (!result.documents || result.documents.length === 0) {
        toast.error('No questions found for this paper yet.')
        setLoadingCardId(null)
        return
      }

      setQuestions(result.documents as unknown as Question[])
      setTestMode(true)
      setPaperLabel(paper.label)

      const sessionId = crypto.randomUUID()
      router.push('/quiz/session?id=' + sessionId)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to start test')
      setLoadingCardId(null)
    }
  }

  return (
    <div className="p-6 space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Full Length Test</h1>
        <p className="text-muted-foreground">Attempt a complete previous year paper</p>
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
                  {isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Loading Paper...
                    </>
                  ) : (
                    <>
                      Start Test &rarr;
                    </>
                  )}
                </button>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
