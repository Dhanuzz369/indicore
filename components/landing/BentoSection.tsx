// components/landing/BentoSection.tsx
'use client'

import { useRef } from 'react'
import { m, useInView, useReducedMotion } from 'framer-motion'

const bars = [
  { h: '40%', label: 'S1', pct: '61%', delay: 0 },
  { h: '65%', label: 'S2', pct: '74%', delay: 0.08 },
  { h: '30%', label: 'S3', pct: '52%', delay: 0.16 },
  { h: '85%', label: 'S4', pct: '88%', delay: 0.24 },
  { h: '55%', label: 'S5', pct: '70%', delay: 0.32 },
  { h: '72%', label: 'S6', pct: '79%', delay: 0.40 },
  { h: '90%', label: 'S7', pct: '91%', delay: 0.48 },
]

// Mini sparkline points
const sparkPts = [35, 52, 44, 61, 58, 70, 74, 68, 82, 88]

function Sparkline({ inView }: { inView: boolean }) {
  const w = 120, h = 40
  const min = Math.min(...sparkPts), max = Math.max(...sparkPts)
  const pts = sparkPts.map((v, i) => {
    const x = (i / (sparkPts.length - 1)) * w
    const y = h - ((v - min) / (max - min)) * h
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" className="overflow-visible">
      <m.polyline
        points={pts}
        stroke="rgba(74,144,226,0.5)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={inView ? { pathLength: 1, opacity: 1 } : {}}
        transition={{ duration: 1.4, ease: 'easeOut', delay: 0.6 }}
      />
      <m.circle
        cx={(sparkPts.length - 1) / (sparkPts.length - 1) * w}
        cy={h - ((sparkPts[sparkPts.length - 1] - min) / (max - min)) * h}
        r="3"
        fill="#4A90E2"
        initial={{ scale: 0, opacity: 0 }}
        animate={inView ? { scale: 1, opacity: 1 } : {}}
        transition={{ duration: 0.3, delay: 1.9 }}
      />
    </svg>
  )
}

const cardReveal = (i: number, reduced: boolean | null) => ({
  hidden: { opacity: 0, y: reduced ? 0 : 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] as const } },
})

export default function BentoSection() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const reduced = useReducedMotion()

  return (
    <section
      id="analytics"
      ref={ref}
      className="relative py-16 sm:py-20 md:py-32 overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #f0f4ff 0%, #f8f9ff 40%, #f5f0ff 100%)' }}
    >
      {/* Background blobs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-blue-100/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-purple-100/20 blur-3xl pointer-events-none" />

      <div className="relative px-6 md:px-8 max-w-7xl mx-auto">

        {/* Section header */}
        <m.div
          initial={{ opacity: 0, y: reduced ? 0 : 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-12 md:mb-16"
        >
          <span className="inline-block text-[10px] font-black text-[#4A90E2] uppercase tracking-[0.22em] bg-[#4A90E2]/8 px-3 py-1.5 rounded-full mb-4">
            Analytics Engine
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-5xl font-black text-[#1A1C1C] tracking-tight mb-4 leading-tight">
            Intelligent Insights
          </h2>
          <p className="text-[#43494D] max-w-lg text-base md:text-lg leading-relaxed">
            Move beyond simple scores. Our analytics engine maps your cognitive patterns across every session.
          </p>
        </m.div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-5">

          {/* ── DARK: Main chart card ── */}
          <m.div
            variants={cardReveal(0, reduced)}
            initial="hidden"
            animate={inView ? 'visible' : 'hidden'}
            className="md:col-span-8 rounded-[2rem] overflow-hidden flex flex-col"
            style={{
              background: 'linear-gradient(145deg, #0f172a 0%, #1e1b4b 55%, #0f2a2a 100%)',
              gridRow: 'span 2',
              minHeight: 380,
            }}
          >
            <div className="p-7 md:p-8 flex flex-col h-full">
              {/* Card header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <span className="text-[10px] font-black text-teal-400 uppercase tracking-[0.18em] bg-teal-400/10 px-3 py-1.5 rounded-full mb-3 inline-block">
                    Subject Mastery
                  </span>
                  <h3 className="text-xl md:text-2xl font-black text-white leading-tight">
                    Polity &amp; Governance
                  </h3>
                  <p className="text-sm text-white/40 mt-1">Performance over last 7 sessions</p>
                </div>
                <div className="flex items-center gap-2 bg-emerald-400/10 px-3 py-1.5 rounded-full shrink-0">
                  <m.div
                    className="w-2 h-2 rounded-full bg-emerald-400"
                    animate={reduced ? {} : { opacity: [1, 0.3, 1] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">Live</span>
                </div>
              </div>

              {/* Bar chart */}
              <div className="flex-1 rounded-2xl bg-white/[0.04] border border-white/[0.06] p-5 flex items-end gap-2 md:gap-3 mb-6">
                {bars.map((bar, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <span className="text-[10px] text-white/30 font-bold">{bar.pct}</span>
                    <m.div
                      className="w-full rounded-t-lg"
                      style={{
                        height: bar.h,
                        background: `linear-gradient(180deg, rgba(74,144,226,${0.5 + i * 0.07}) 0%, rgba(74,144,226,${0.25 + i * 0.04}) 100%)`,
                        boxShadow: `0 0 18px rgba(74,144,226,${0.15 + i * 0.06})`,
                        transformOrigin: 'bottom',
                      }}
                      initial={{ scaleY: 0 }}
                      animate={inView ? { scaleY: 1 } : {}}
                      transition={{ duration: 0.65, delay: 0.35 + bar.delay, ease: [0.22, 1, 0.36, 1] }}
                    />
                    <span className="text-[9px] text-white/25 font-bold">{bar.label}</span>
                  </div>
                ))}
              </div>

              {/* Bottom stats row */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { val: '82%', label: 'Avg Score', sub: '↑ 8% vs prev' },
                  { val: '7', label: 'Sessions', sub: 'this month' },
                  { val: '1.2m', label: 'Per MCQ', sub: 'avg time' },
                ].map((s) => (
                  <div key={s.label}>
                    <div className="text-xl font-black text-white">{s.val}</div>
                    <div className="text-[10px] text-white/40 font-bold uppercase tracking-wider">{s.label}</div>
                    <div className="text-[10px] text-teal-400/70 font-bold mt-0.5">{s.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          </m.div>

          {/* ── Accuracy card ── */}
          <m.div
            variants={cardReveal(1, reduced)}
            initial="hidden"
            animate={inView ? 'visible' : 'hidden'}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
            className="md:col-span-4 bg-white rounded-[1.75rem] p-6 shadow-sm border border-black/[0.04] hover:shadow-md transition-shadow flex flex-col justify-between"
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4A90E2" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" />
                  <path d="M12 6V12L16 14" />
                </svg>
              </div>
              <span className="text-emerald-500 font-black text-xs bg-emerald-50 px-2.5 py-1 rounded-full">+12% faster</span>
            </div>
            <div className="mt-4">
              <div className="text-4xl font-black text-[#1A1C1C] tracking-tighter">1.2m</div>
              <p className="text-xs text-[#43494D] font-bold uppercase tracking-wider mt-1.5">Avg. Time per MCQ</p>
              <div className="mt-3">
                <Sparkline inView={inView} />
              </div>
            </div>
          </m.div>

          {/* ── Streak card ── */}
          <m.div
            variants={cardReveal(2, reduced)}
            initial="hidden"
            animate={inView ? 'visible' : 'hidden'}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
            className="md:col-span-4 rounded-[1.75rem] p-6 flex flex-col justify-between overflow-hidden relative hover:shadow-md transition-shadow"
            style={{ background: 'linear-gradient(135deg, #fff7ed 0%, #fef3c7 100%)', border: '1px solid rgba(245,158,11,0.15)' }}
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#f59e0b" stroke="none">
                  <path d="M12 2C12 2 7 8 7 13C7 16.3 9.5 19 12 19C14.5 19 17 16.3 17 13C17 8 12 2 12 2Z" />
                  <path d="M12 19C10.3 19 9 17.5 9 15.5C9 14 10 13 11 12C11 13 11.5 13.5 12 13.5C12.5 13.5 13 13 13 12C14 13 15 14 15 15.5C15 17.5 13.7 19 12 19Z" fill="white" />
                </svg>
              </div>
              <div className="w-12 h-6 bg-amber-400 rounded-full flex items-center justify-end px-1 cursor-pointer">
                <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-black text-[#1A1C1C]">22</div>
              <div className="text-xs text-amber-700 font-bold uppercase tracking-wider mt-0.5">Day Streak</div>
              <p className="text-xs text-amber-600/70 font-medium mt-2">Consistency is your superpower.</p>
            </div>
          </m.div>

          {/* ── Guess Factor card — full width ── */}
          <m.div
            variants={cardReveal(3, reduced)}
            initial="hidden"
            animate={inView ? 'visible' : 'hidden'}
            className="md:col-span-12 rounded-[1.75rem] p-7 md:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 overflow-hidden relative"
            style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            {/* Glow blob */}
            <div className="absolute -top-10 right-20 w-40 h-40 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />
            <div className="relative max-w-lg">
              <span className="text-[10px] font-black text-violet-400 uppercase tracking-[0.18em] bg-violet-400/10 px-3 py-1.5 rounded-full mb-3 inline-block">
                Confidence Analyzer
              </span>
              <h4 className="text-xl md:text-2xl font-black text-white mb-2 leading-tight">
                The &lsquo;Guess-Factor&rsquo; Signal
              </h4>
              <p className="text-white/50 text-sm leading-relaxed">
                Maps your logical deduction patterns to minimize negative marking exposure across all 14 subjects.
              </p>
            </div>
            {/* Mini confidence bars */}
            <div className="relative flex items-end gap-1.5 shrink-0">
              {[55, 70, 45, 82, 60, 90].map((v, i) => (
                <m.div
                  key={i}
                  className="w-3 rounded-t-lg"
                  style={{
                    height: `${v * 0.6}px`,
                    background: i === 5
                      ? 'linear-gradient(180deg, #818cf8 0%, #6366f1 100%)'
                      : `rgba(255,255,255,${0.1 + i * 0.04})`,
                    transformOrigin: 'bottom',
                  }}
                  initial={{ scaleY: 0 }}
                  animate={inView ? { scaleY: 1 } : {}}
                  transition={{ duration: 0.5, delay: 0.6 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                />
              ))}
            </div>
          </m.div>

        </div>
      </div>
    </section>
  )
}
