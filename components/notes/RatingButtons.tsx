'use client'

import type { SRSRating } from '@/types'

interface RatingButtonsProps {
  onRate: (rating: SRSRating) => void
  disabled?: boolean
}

const RATINGS: { rating: SRSRating; label: string; sublabel: string; className: string }[] = [
  { rating: 'again', label: 'Again',  sublabel: '<1d',    className: 'bg-red-500 hover:bg-red-600 shadow-red-100' },
  { rating: 'hard',  label: 'Hard',   sublabel: '~2d',    className: 'bg-orange-500 hover:bg-orange-600 shadow-orange-100' },
  { rating: 'good',  label: 'Good',   sublabel: 'normal', className: 'bg-blue-500 hover:bg-blue-600 shadow-blue-100' },
  { rating: 'easy',  label: 'Easy',   sublabel: 'longer', className: 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-100' },
]

export function RatingButtons({ onRate, disabled }: RatingButtonsProps) {
  return (
    <div className="grid grid-cols-4 gap-3 w-full">
      {RATINGS.map(({ rating, label, sublabel, className }) => (
        <button
          key={rating}
          onClick={() => onRate(rating)}
          disabled={disabled}
          className={`flex flex-col items-center justify-center py-3 rounded-2xl text-white font-black shadow-lg transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
        >
          <span className="text-sm">{label}</span>
          <span className="text-[10px] opacity-70 font-semibold mt-0.5">{sublabel}</span>
        </button>
      ))}
    </div>
  )
}
