import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Question } from '@/types'

interface QuestionCardProps {
  question: Question
  questionNumber: number
  totalQuestions: number
}

export function QuestionCard({ question, questionNumber, totalQuestions }: QuestionCardProps) {
  // Get difficulty dot color
  const getDifficultyColor = () => {
    switch (question.difficulty) {
      case 'easy':
        return 'bg-green-500'
      case 'medium':
        return 'bg-yellow-500'
      case 'hard':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  return (
    <Card className="border-gray-200">
      <div className="p-6 space-y-4">
        {/* Top row: Subject, Year, Difficulty */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs">
            {question.exam_type}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {question.year}
          </Badge>
          <div className="flex items-center gap-1.5">
            <div className={`h-2 w-2 rounded-full ${getDifficultyColor()}`} />
            <span className="text-xs text-muted-foreground capitalize">
              {question.difficulty}
            </span>
          </div>
        </div>

        {/* Question Text */}
        <p className="text-lg font-medium leading-relaxed text-gray-900">
          {question.question_text}
        </p>
      </div>
    </Card>
  )
}
