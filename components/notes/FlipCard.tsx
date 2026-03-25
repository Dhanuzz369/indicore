'use client'

import { useState } from 'react'

interface FlipCardProps {
  front: string
  back: string
  onFlipped?: () => void
}

export function FlipCard({ front, back, onFlipped }: FlipCardProps) {
  const [flipped, setFlipped] = useState(false)

  const handleFlip = () => {
    if (!flipped) {
      setFlipped(true)
      onFlipped?.()
    }
  }

  return (
    <div className="w-full" style={{ perspective: '1000px' }}>
      <div
        className="relative w-full transition-transform duration-500 cursor-pointer"
        style={{
          transformStyle: 'preserve-3d',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          minHeight: '280px',
        }}
        onClick={handleFlip}
      >
        <div
          className="absolute inset-0 bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8 flex flex-col items-center justify-center text-center"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <p className="text-[10px] font-black uppercase tracking-widest text-orange-500 mb-4">Question / Topic</p>
          <p className="text-lg font-semibold text-gray-900 leading-relaxed">{front}</p>
          {!flipped && (
            <p className="absolute bottom-6 text-xs text-gray-400 font-medium">Tap to reveal answer</p>
          )}
        </div>
        <div
          className="absolute inset-0 bg-gray-900 rounded-[2rem] p-8 flex flex-col items-center justify-center text-center"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <p className="text-[10px] font-black uppercase tracking-widest text-orange-400 mb-4">Your Answer</p>
          <p className="text-lg font-semibold text-white leading-relaxed">{back}</p>
        </div>
      </div>
    </div>
  )
}
