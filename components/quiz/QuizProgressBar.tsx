import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { CheckCircle } from 'lucide-react'

interface QuizProgressBarProps {
  current: number
  total: number
  correctCount: number
}

export function QuizProgressBar({ current, total, correctCount }: QuizProgressBarProps) {
  const percentage = (current / total) * 100

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          Question {current} of {total}
        </span>
        <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          {correctCount} correct
        </Badge>
      </div>
      <Progress value={percentage} className="h-2" />
    </div>
  )
}
