'use client'

import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowRight, CheckCircle } from 'lucide-react'

interface ExplanationBoxProps {
  explanation: string
  correctOption: 'A' | 'B' | 'C' | 'D'
  onNext: () => void
  isLastQuestion: boolean
}

export function ExplanationBox({
  explanation,
  correctOption,
  onNext,
  isLastQuestion,
}: ExplanationBoxProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-l-4 border-green-500 bg-green-50 border-green-200">
        <div className="p-6 space-y-4">
          {/* Header */}
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle className="h-5 w-5" />
            <h3 className="font-semibold text-lg">Correct Answer: {correctOption}</h3>
          </div>

          {/* Explanation Text */}
          <p className="text-gray-700 leading-relaxed">{explanation}</p>

          {/* Next Button */}
          <div className="flex justify-end pt-2">
            <Button
              onClick={onNext}
              className="bg-[#FF6B00] hover:bg-[#FF8C00]"
              size="lg"
            >
              {isLastQuestion ? (
                <>
                  See Results
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              ) : (
                <>
                  Next Question
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
