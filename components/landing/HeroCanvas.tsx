// components/landing/HeroCanvas.tsx
'use client'

import { m, useReducedMotion } from 'framer-motion'

export default function HeroCanvas() {
  const reduced = useReducedMotion()

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Base gradient — noticeable color */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(150deg, #dbeafe 0%, #f0f9ff 35%, #ede9fe 70%, #f0fdf4 100%)' }}
      />

      {/* Orb 1 — vivid blue, top-left */}
      <m.div
        className="absolute rounded-full"
        style={{
          width: '65vw', height: '65vw', maxWidth: 860, maxHeight: 860,
          left: '-15%', top: '-20%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.55) 0%, rgba(99,102,241,0.20) 50%, transparent 72%)',
          filter: 'blur(60px)',
        }}
        animate={reduced ? {} : { x: [0, 45, -20, 0], y: [0, -55, 28, 0], scale: [1, 1.1, 0.94, 1] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Orb 2 — vivid violet, top-right */}
      <m.div
        className="absolute rounded-full"
        style={{
          width: '55vw', height: '55vw', maxWidth: 720, maxHeight: 720,
          right: '-12%', top: '8%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.45) 0%, rgba(167,139,250,0.15) 55%, transparent 72%)',
          filter: 'blur(55px)',
        }}
        animate={reduced ? {} : { x: [0, -55, 30, 0], y: [0, 38, -55, 0], scale: [1, 0.88, 1.10, 1] }}
        transition={{ duration: 17, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />

      {/* Orb 3 — teal, bottom-center */}
      <m.div
        className="absolute rounded-full"
        style={{
          width: '48vw', height: '48vw', maxWidth: 640, maxHeight: 640,
          left: '22%', bottom: '-8%',
          background: 'radial-gradient(circle, rgba(20,184,166,0.38) 0%, rgba(6,182,212,0.12) 55%, transparent 72%)',
          filter: 'blur(55px)',
        }}
        animate={reduced ? {} : { x: [0, 58, -35, 0], y: [0, -40, 50, 0], scale: [1, 1.15, 0.90, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
      />

      {/* Orb 4 — rose accent, bottom-right */}
      <m.div
        className="absolute rounded-full"
        style={{
          width: '38vw', height: '38vw', maxWidth: 520, maxHeight: 520,
          right: '18%', bottom: '8%',
          background: 'radial-gradient(circle, rgba(244,63,94,0.18) 0%, rgba(251,113,133,0.06) 55%, transparent 72%)',
          filter: 'blur(50px)',
        }}
        animate={reduced ? {} : { x: [0, -32, 48, 0], y: [0, 48, -28, 0], scale: [1, 1.08, 0.93, 1] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut', delay: 6 }}
      />

      {/* Orb 5 — indigo, center */}
      <m.div
        className="absolute rounded-full"
        style={{
          width: '42vw', height: '42vw', maxWidth: 580, maxHeight: 580,
          left: '38%', top: '28%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.28) 0%, transparent 68%)',
          filter: 'blur(65px)',
        }}
        animate={reduced ? {} : { x: [0, 28, -42, 0], y: [0, -42, 30, 0], scale: [1, 0.93, 1.1, 1] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
      />

      {/* Dot grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(99,102,241,0.18) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at 50% 50%, black 20%, transparent 100%)',
          maskImage: 'radial-gradient(ellipse 80% 70% at 50% 50%, black 20%, transparent 100%)',
        }}
      />

      {/* Floating shapes */}
      <m.div
        className="absolute top-[18%] left-[8%] w-14 h-14 rounded-2xl"
        style={{ rotate: 12, border: '2px solid rgba(99,102,241,0.25)' }}
        animate={reduced ? {} : { rotate: [12, 27, 12, 2, 12], y: [0, -14, 0], opacity: [0.5, 0.85, 0.5] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <m.div
        className="absolute top-[38%] right-[8%] w-10 h-10 rounded-xl"
        style={{ rotate: -8, border: '2px solid rgba(139,92,246,0.28)' }}
        animate={reduced ? {} : { rotate: [-8, -22, -8, 5, -8], y: [0, 16, 0], opacity: [0.4, 0.75, 0.4] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
      />
      <m.div
        className="absolute bottom-[28%] left-[10%] w-8 h-8 rounded-lg"
        style={{ rotate: 20, border: '2px solid rgba(20,184,166,0.30)' }}
        animate={reduced ? {} : { rotate: [20, 38, 20], x: [0, 10, 0], opacity: [0.4, 0.65, 0.4] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
      />
      <m.div
        className="absolute top-[60%] right-[14%] w-6 h-6 rounded-md"
        style={{ rotate: -15, border: '2px solid rgba(59,130,246,0.30)' }}
        animate={reduced ? {} : { rotate: [-15, -32, -15], y: [0, -12, 0], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />
    </div>
  )
}
