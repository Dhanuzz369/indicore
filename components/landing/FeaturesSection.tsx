// components/landing/FeaturesSection.tsx
'use client'

import { useState, useRef } from 'react'
import { m, AnimatePresence, useInView, useMotionValue, useTransform, useReducedMotion } from 'framer-motion'

const features = [
  {
    title: 'Deep Performance Dials',
    body: 'Visualize your readiness with pinpoint accuracy across 14 core subjects and current affairs.',
  },
  {
    title: 'Adaptive Flashcards',
    body: 'Spaced repetition algorithms tuned specifically for the UPSC syllabus complexity.',
  },
  {
    title: 'Focus-Mode Dashboards',
    body: 'Eliminate digital noise. Our interface is designed to keep you in the flow for hours.',
  },
]

// SVG score dial — animates on scroll enter
function ScoreDial({ inView }: { inView: boolean }) {
  const r = 80
  const circ = 2 * Math.PI * r  // ≈ 502.65
  const offset = circ * (1 - 0.82) // 82% filled ≈ 90.48

  return (
    <div className="flex justify-center mb-8">
      <div className="relative w-52 h-52">
        <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
          {/* Track */}
          <circle cx={100} cy={100} r={r} fill="none" stroke="#E9E8E7" strokeWidth={14} />
          {/* Fill */}
          <m.circle
            cx={100} cy={100} r={r}
            fill="none"
            stroke="#4A90E2"
            strokeWidth={14}
            strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={inView ? { strokeDashoffset: offset } : { strokeDashoffset: circ }}
            transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-black text-[#1A1C1C]">82%</span>
          <span className="text-xs font-bold text-[#43494D] uppercase tracking-widest">Accuracy</span>
        </div>
      </div>
    </div>
  )
}

// 3D tilt card
function DashboardCard({ inView }: { inView: boolean }) {
  const reduced = useReducedMotion()
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotateX = useTransform(y, [-0.5, 0.5], [10, -10])
  const rotateY = useTransform(x, [-0.5, 0.5], [-10, 10])

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduced) return
    const rect = e.currentTarget.getBoundingClientRect()
    x.set((e.clientX - rect.left) / rect.width - 0.5)
    y.set((e.clientY - rect.top) / rect.height - 0.5)
  }
  const handleLeave = () => { x.set(0); y.set(0) }

  return (
    <m.div
      initial={{ opacity: 0, x: reduced ? 0 : 60 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.7, ease: 'easeOut' }}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={reduced ? {} : { rotateX, rotateY, transformPerspective: 1200 }}
      className="relative bg-white rounded-3xl shadow-2xl shadow-[#4A90E2]/10 p-8 border border-[#4A90E2]/10"
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-6">
        <div className="w-28 h-3 bg-[#F4F3F2] rounded-full" />
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-[#4A90E2]/40" />
          <div className="w-3 h-3 rounded-full bg-[#4A90E2]/70" />
          <div className="w-3 h-3 rounded-full bg-[#4A90E2]" />
        </div>
      </div>

      <ScoreDial inView={inView} />

      {/* Subject rows */}
      <div className="space-y-3">
        {[
          { label: 'Polity', pct: '75%' },
          { label: 'History', pct: '55%' },
          { label: 'Geography', pct: '88%' },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-3">
            <span className="w-20 text-xs font-bold text-[#43494D] uppercase tracking-wide">{s.label}</span>
            <div className="flex-1 h-2 bg-[#F4F3F2] rounded-full overflow-hidden">
              <m.div
                className="h-full bg-[#4A90E2] rounded-full"
                initial={{ width: 0 }}
                animate={inView ? { width: s.pct } : {}}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
              />
            </div>
            <span className="text-xs font-black text-[#4A90E2]">{s.pct}</span>
          </div>
        ))}
      </div>
    </m.div>
  )
}

export default function FeaturesSection() {
  const [open, setOpen] = useState(0)
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })
  const reduced = useReducedMotion()

  return (
    <section id="features" ref={ref} className="py-32 px-6 md:px-8 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
        {/* Left — accordion */}
        <div>
          <m.h2
            initial={{ opacity: 0, y: reduced ? 0 : 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="text-4xl font-black text-[#1A1C1C] tracking-tight mb-10"
          >
            Precision Tools for<br />High-Stakes Exams
          </m.h2>

          <div className="space-y-3">
            {features.map((f, i) => (
              <m.div
                key={i}
                initial={{ opacity: 0, y: reduced ? 0 : 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                onClick={() => setOpen(i)}
                className={`p-7 rounded-2xl cursor-pointer transition-all duration-300 ${
                  open === i
                    ? 'bg-white shadow-lg shadow-black/5 border-l-4 border-[#4A90E2]'
                    : 'hover:bg-white/60 border-l-4 border-transparent'
                }`}
              >
                <h3 className={`text-lg font-black mb-0 transition-all ${open === i ? 'text-[#1A1C1C]' : 'text-[#1A1C1C]/50'}`}>
                  {f.title}
                </h3>
                <AnimatePresence initial={false}>
                  {open === i && (
                    <m.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      style={{ overflow: 'hidden' }}
                    >
                      <p className="text-[#43494D] leading-relaxed pt-3 text-sm">{f.body}</p>
                    </m.div>
                  )}
                </AnimatePresence>
              </m.div>
            ))}
          </div>
        </div>

        {/* Right — tilt dashboard */}
        <DashboardCard inView={inView} />
      </div>
    </section>
  )
}
