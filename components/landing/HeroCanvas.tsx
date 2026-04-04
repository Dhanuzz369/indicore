// components/landing/HeroCanvas.tsx
'use client'

import { m, useReducedMotion } from 'framer-motion'

/**
 * CSS-based aurora mesh background — replaces heavy Three.js.
 * 5 blurred gradient orbs + subtle dot grid + floating shapes.
 * Pure transform/opacity → GPU composited, zero CLS.
 */
export default function HeroCanvas() {
  const reduced = useReducedMotion()

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Base gradient */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(150deg, #eef5ff 0%, #fafafa 45%, #f5f0ff 100%)' }}
      />

      {/* Orb 1 — large blue, top-left */}
      <m.div
        className="absolute rounded-full"
        style={{
          width: '70vw', height: '70vw', maxWidth: 900, maxHeight: 900,
          left: '-18%', top: '-22%',
          background: 'radial-gradient(circle, rgba(74,144,226,0.30) 0%, transparent 68%)',
          filter: 'blur(80px)',
        }}
        animate={reduced ? {} : { x: [0, 40, -20, 0], y: [0, -50, 25, 0], scale: [1, 1.12, 0.95, 1] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Orb 2 — violet, top-right */}
      <m.div
        className="absolute rounded-full"
        style={{
          width: '55vw', height: '55vw', maxWidth: 750, maxHeight: 750,
          right: '-15%', top: '5%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.20) 0%, transparent 70%)',
          filter: 'blur(70px)',
        }}
        animate={reduced ? {} : { x: [0, -50, 30, 0], y: [0, 35, -55, 0], scale: [1, 0.88, 1.12, 1] }}
        transition={{ duration: 17, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />

      {/* Orb 3 — teal, bottom-center */}
      <m.div
        className="absolute rounded-full"
        style={{
          width: '45vw', height: '45vw', maxWidth: 650, maxHeight: 650,
          left: '25%', bottom: '-10%',
          background: 'radial-gradient(circle, rgba(20,184,166,0.16) 0%, transparent 70%)',
          filter: 'blur(65px)',
        }}
        animate={reduced ? {} : { x: [0, 55, -35, 0], y: [0, -35, 50, 0], scale: [1, 1.18, 0.9, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
      />

      {/* Orb 4 — amber accent, bottom-right */}
      <m.div
        className="absolute rounded-full"
        style={{
          width: '35vw', height: '35vw', maxWidth: 500, maxHeight: 500,
          right: '20%', bottom: '5%',
          background: 'radial-gradient(circle, rgba(245,158,11,0.10) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
        animate={reduced ? {} : { x: [0, -30, 45, 0], y: [0, 45, -25, 0], scale: [1, 1.08, 0.93, 1] }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut', delay: 6 }}
      />

      {/* Orb 5 — indigo, center */}
      <m.div
        className="absolute rounded-full"
        style={{
          width: '40vw', height: '40vw', maxWidth: 560, maxHeight: 560,
          left: '40%', top: '30%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
          filter: 'blur(75px)',
        }}
        animate={reduced ? {} : { x: [0, 25, -40, 0], y: [0, -40, 30, 0], scale: [1, 0.92, 1.1, 1] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
      />

      {/* Subtle dot grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(74,144,226,0.14) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
          maskImage: 'radial-gradient(ellipse 80% 70% at 50% 50%, black 20%, transparent 100%)',
        }}
      />

      {/* Floating geometric shapes */}
      <m.div
        className="absolute top-[18%] left-[8%] w-14 h-14 rounded-2xl border-2 border-[#4A90E2]/12"
        style={{ rotate: 12 }}
        animate={reduced ? {} : { rotate: [12, 27, 12, 2, 12], y: [0, -14, 0], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <m.div
        className="absolute top-[38%] right-[8%] w-10 h-10 rounded-xl border-2 border-violet-400/15"
        style={{ rotate: -8 }}
        animate={reduced ? {} : { rotate: [-8, -22, -8, 5, -8], y: [0, 16, 0], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
      />
      <m.div
        className="absolute bottom-[28%] left-[10%] w-8 h-8 rounded-lg border-2 border-teal-400/18"
        style={{ rotate: 20 }}
        animate={reduced ? {} : { rotate: [20, 38, 20], x: [0, 10, 0], opacity: [0.3, 0.55, 0.3] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
      />
      <m.div
        className="absolute top-[58%] right-[14%] w-6 h-6 rounded-md border-2 border-[#4A90E2]/18"
        style={{ rotate: -15 }}
        animate={reduced ? {} : { rotate: [-15, -32, -15], y: [0, -12, 0], opacity: [0.25, 0.5, 0.25] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />
    </div>
  )
}
