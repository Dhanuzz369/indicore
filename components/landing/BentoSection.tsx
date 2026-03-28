// components/landing/BentoSection.tsx
'use client'

import { useRef } from 'react'
import { m, useInView, useReducedMotion } from 'framer-motion'

const bars = [
  { h: '40%', delay: 0 },
  { h: '65%', delay: 0.1 },
  { h: '30%', delay: 0.2 },
  { h: '85%', delay: 0.3 },
  { h: '55%', delay: 0.4 },
]

const cardVariant = (i: number, reduced: boolean | null) => ({
  hidden: { opacity: 0, y: reduced ? 0 : 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, delay: i * 0.1, ease: 'easeOut' as const } },
})

export default function BentoSection() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const reduced = useReducedMotion()

  return (
    <section id="analytics" ref={ref} className="py-32 px-6 md:px-8 max-w-7xl mx-auto">
      <m.div
        initial={{ opacity: 0, y: reduced ? 0 : 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6 }}
        className="mb-14"
      >
        <h2 className="text-4xl font-black text-[#1A1C1C] tracking-tight mb-3">Intelligent Insights</h2>
        <p className="text-[#43494D] max-w-xl">
          Move beyond simple scores. Our analytics engine understands your cognitive patterns during testing.
        </p>
      </m.div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5" style={{ gridAutoRows: '240px' }}>
        {/* Large bar chart card */}
        <m.div
          variants={cardVariant(0, reduced)}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          className="md:col-span-8 row-span-2 bg-white rounded-3xl p-8 shadow-sm border border-[#4A90E2]/[0.08] hover:border-[#4A90E2]/20 transition-all flex flex-col"
          style={{ gridRow: 'span 2' }}
        >
          <div>
            <span className="inline-block px-3 py-1 rounded-lg bg-[#D6E4F8] text-[#2a4b57] text-xs font-black uppercase tracking-wider mb-4">
              Subject Mastery
            </span>
            <h3 className="text-2xl font-black text-[#1A1C1C] mb-1">Polity &amp; Governance</h3>
            <p className="text-sm text-[#43494D] mb-6">Performance over last 8 sessions</p>
          </div>
          <div className="flex-1 bg-[#FAFAFA] rounded-2xl p-6 flex items-end gap-3">
            {bars.map((bar, i) => (
              <m.div
                key={i}
                className="flex-1 rounded-t"
                style={{
                  backgroundColor: `rgba(74,144,226,${0.2 + i * 0.18})`,
                  transformOrigin: 'bottom',
                  height: bar.h,
                }}
                initial={{ scaleY: 0 }}
                animate={inView ? { scaleY: 1 } : {}}
                transition={{ duration: 0.7, delay: 0.4 + bar.delay, ease: [0.22, 1, 0.36, 1] }}
              />
            ))}
          </div>
        </m.div>

        {/* Timer card */}
        <m.div
          variants={cardVariant(1, reduced)}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          whileHover={{ y: -4 }}
          className="md:col-span-4 bg-white rounded-3xl p-6 shadow-sm border border-transparent hover:border-[#4A90E2]/20 transition-all flex flex-col justify-between"
        >
          <div className="flex justify-between items-start">
            <span className="text-3xl">⏱</span>
            <span className="text-[#4A90E2] font-bold text-sm">+12% faster</span>
          </div>
          <div>
            <div className="text-3xl font-black text-[#1A1C1C]">1.2m</div>
            <p className="text-xs text-[#43494D] font-bold uppercase tracking-wider mt-1">Avg. Time per MCQ</p>
          </div>
        </m.div>

        {/* Streak card */}
        <m.div
          variants={cardVariant(2, reduced)}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          whileHover={{ y: -4 }}
          className="md:col-span-4 bg-[#F4F3F2] rounded-3xl p-6 flex flex-col justify-between hover:bg-white transition-all"
        >
          <div className="flex justify-between items-start">
            <span className="text-3xl">📈</span>
            <div className="w-12 h-6 bg-[#4A90E2] rounded-full flex items-center justify-end px-1">
              <div className="w-4 h-4 rounded-full bg-white" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-[#1A1C1C]">Consistency</div>
            <p className="text-xs text-[#43494D] font-bold uppercase tracking-wider mt-1">22 Day Streak</p>
          </div>
        </m.div>

        {/* Guess factor card */}
        <m.div
          variants={cardVariant(3, reduced)}
          initial="hidden"
          animate={inView ? 'visible' : 'hidden'}
          className="md:col-span-12 bg-[#F4F3F2] rounded-3xl p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border border-[#4A90E2]/[0.08] hover:border-[#4A90E2]/20 transition-all"
        >
          <div className="max-w-md">
            <h4 className="text-xl font-black text-[#1A1C1C] mb-2">The &lsquo;Guess-Factor&rsquo; Analyzer</h4>
            <p className="text-[#43494D] text-sm leading-relaxed">
              Identifying patterns in your logical deduction to minimize negative marking risks.
            </p>
          </div>
          <button className="shrink-0 bg-white text-[#4A90E2] font-black px-6 py-3 rounded-full hover:bg-[#4A90E2] hover:text-white transition-all shadow-sm">
            Unlock Premium Insights
          </button>
        </m.div>
      </div>
    </section>
  )
}
