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

// ── Shared tilt hook ──────────────────────────────────────────────────────────
function useTilt(reduced: boolean | null) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotateX = useTransform(y, [-0.5, 0.5], [8, -8])
  const rotateY = useTransform(x, [-0.5, 0.5], [-8, 8])
  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduced) return
    const rect = e.currentTarget.getBoundingClientRect()
    x.set((e.clientX - rect.left) / rect.width - 0.5)
    y.set((e.clientY - rect.top) / rect.height - 0.5)
  }
  const handleLeave = () => { x.set(0); y.set(0) }
  return { rotateX, rotateY, handleMove, handleLeave }
}

// ── Panel 0: Performance Dials dashboard ─────────────────────────────────────
function ScoreDial({ inView }: { inView: boolean }) {
  const r = 80
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - 0.82)
  return (
    <div className="flex justify-center mb-8">
      <div className="relative w-48 h-48">
        <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
          <circle cx={100} cy={100} r={r} fill="none" stroke="#E9E8E7" strokeWidth={14} />
          <m.circle
            cx={100} cy={100} r={r} fill="none"
            stroke="#4A90E2" strokeWidth={14} strokeLinecap="round"
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

function DashboardPanel({ inView }: { inView: boolean }) {
  const reduced = useReducedMotion()
  const { rotateX, rotateY, handleMove, handleLeave } = useTilt(reduced)
  return (
    <m.div
      onMouseMove={handleMove} onMouseLeave={handleLeave}
      style={reduced ? {} : { rotateX, rotateY, transformPerspective: 1200 }}
      className="bg-white rounded-3xl shadow-2xl shadow-[#4A90E2]/10 p-8 border border-[#4A90E2]/10"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="w-28 h-3 bg-[#F4F3F2] rounded-full" />
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-[#4A90E2]/40" />
          <div className="w-3 h-3 rounded-full bg-[#4A90E2]/70" />
          <div className="w-3 h-3 rounded-full bg-[#4A90E2]" />
        </div>
      </div>
      <ScoreDial inView={inView} />
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

// ── Panel 1: Adaptive Flashcard ───────────────────────────────────────────────
function FlashCardPanel({ inView }: { inView: boolean }) {
  const reduced = useReducedMotion()
  const { rotateX, rotateY, handleMove, handleLeave } = useTilt(reduced)
  return (
    <div className="relative">
      {/* Stacked cards */}
      <div className="absolute inset-0 bg-amber-100 rounded-3xl translate-y-4 translate-x-3 rotate-3 opacity-50" />
      <div className="absolute inset-0 bg-blue-100 rounded-3xl translate-y-2 translate-x-1.5 rotate-1 opacity-70" />

      <m.div
        onMouseMove={handleMove} onMouseLeave={handleLeave}
        style={reduced ? {} : { rotateX, rotateY, transformPerspective: 1200 }}
        className="relative bg-white rounded-3xl shadow-2xl shadow-[#4A90E2]/10 p-8 border border-[#4A90E2]/10"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <span className="text-xs font-black text-[#4A90E2] uppercase tracking-widest bg-blue-50 px-3 py-1.5 rounded-full">
            Polity · Due Now
          </span>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className={`w-2 h-2 rounded-full ${i <= 4 ? 'bg-[#4A90E2]' : 'bg-gray-200'}`} />
            ))}
          </div>
        </div>

        {/* Card face */}
        <m.div
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="bg-gradient-to-br from-blue-50 to-indigo-50/60 rounded-2xl p-8 mb-6 min-h-[130px] flex items-center justify-center"
        >
          <p className="text-[#1A1C1C] font-bold text-center text-sm leading-relaxed">
            Which constitutional amendment introduced Panchayati Raj institutions as the third tier of government?
          </p>
        </m.div>

        {/* SRS rating buttons */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {[
              { label: 'Again', cls: 'bg-red-50 text-red-600 hover:bg-red-100' },
              { label: 'Hard',  cls: 'bg-orange-50 text-orange-600 hover:bg-orange-100' },
              { label: 'Good',  cls: 'bg-blue-50 text-blue-600 hover:bg-blue-100' },
              { label: 'Easy',  cls: 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' },
            ].map(({ label, cls }) => (
              <m.button
                key={label}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.95 }}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${cls}`}
              >
                {label}
              </m.button>
            ))}
          </div>
          <span className="text-xs text-[#43494D] font-bold">4 / 12 today</span>
        </div>
      </m.div>
    </div>
  )
}

// ── Panel 2: Focus Mode Dashboard ─────────────────────────────────────────────
function FocusModePanel({ inView }: { inView: boolean }) {
  const reduced = useReducedMotion()
  const { rotateX, rotateY, handleMove, handleLeave } = useTilt(reduced)
  return (
    <m.div
      onMouseMove={handleMove} onMouseLeave={handleLeave}
      style={reduced ? {} : { rotateX, rotateY, transformPerspective: 1200 }}
      className="bg-white rounded-3xl shadow-2xl shadow-[#4A90E2]/10 p-8 border border-[#4A90E2]/10"
    >
      {/* Focus session header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="text-[10px] font-black text-[#43494D] uppercase tracking-widest mb-1">Focus Session</div>
          <div className="text-lg font-black text-[#1A1C1C]">Polity &amp; Governance</div>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center">
          <div className="w-3 h-3 rounded-full bg-emerald-500" style={{ animation: 'pulse 2s infinite' }} />
        </div>
      </div>

      {/* Big timer */}
      <div className="text-center mb-8">
        <m.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={inView ? { scale: 1, opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-7xl font-black text-[#1A1C1C] tracking-tighter tabular-nums"
        >
          45:00
        </m.div>
        <div className="text-sm font-bold text-[#43494D] mt-1 uppercase tracking-widest">Remaining</div>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between text-xs font-bold text-[#43494D] mb-2 uppercase tracking-wider">
          <span>Progress</span>
          <span className="text-[#4A90E2]">18 / 25</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <m.div
            className="h-full bg-gradient-to-r from-[#4A90E2] to-indigo-400 rounded-full"
            initial={{ width: 0 }}
            animate={inView ? { width: '72%' } : {}}
            transition={{ duration: 1.2, ease: 'easeOut', delay: 0.4 }}
          />
        </div>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { val: '88%', label: 'Accuracy' },
          { val: '1.1m', label: 'Avg Time' },
          { val: '0',   label: 'Skipped' },
        ].map((s, i) => (
          <m.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.4, delay: 0.5 + i * 0.08 }}
            className="bg-[#FAFAFA] rounded-2xl p-3 text-center"
          >
            <div className="text-lg font-black text-[#1A1C1C]">{s.val}</div>
            <div className="text-[9px] font-bold text-[#43494D] uppercase tracking-wider mt-0.5">{s.label}</div>
          </m.div>
        ))}
      </div>
    </m.div>
  )
}

// ── Main section ──────────────────────────────────────────────────────────────
export default function FeaturesSection() {
  const [open, setOpen] = useState(0)
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })
  const reduced = useReducedMotion()

  const panels = [
    <DashboardPanel key="dashboard" inView={inView} />,
    <FlashCardPanel key="flashcard" inView={inView} />,
    <FocusModePanel key="focus"     inView={inView} />,
  ]

  return (
    <section id="features" ref={ref} className="relative py-16 sm:py-20 md:py-32 px-6 md:px-8 overflow-hidden">
      {/* Blended gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/70 via-white to-indigo-50/50 pointer-events-none" />
      <div className="absolute -top-32 right-0 w-[600px] h-[600px] rounded-full bg-blue-100/25 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-indigo-100/20 blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-24 items-center">

          {/* Left — accordion */}
          <div>
            <m.h2
              initial={{ opacity: 0, y: reduced ? 0 : 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6 }}
              className="text-2xl sm:text-3xl md:text-4xl font-black text-[#1A1C1C] tracking-tight mb-10"
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
                  className={`p-5 sm:p-7 rounded-2xl cursor-pointer transition-all duration-300 ${
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

          {/* Right — adaptive panel */}
          <AnimatePresence mode="wait">
            <m.div
              key={open}
              initial={{ opacity: 0, x: reduced ? 0 : 30, scale: reduced ? 1 : 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: reduced ? 0 : -20, scale: reduced ? 1 : 0.98 }}
              transition={{ duration: 0.35, ease: 'easeInOut' }}
            >
              {panels[open]}
            </m.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}
