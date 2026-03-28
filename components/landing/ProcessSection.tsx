// components/landing/ProcessSection.tsx
'use client'

import { useRef } from 'react'
import { m, useInView, useReducedMotion } from 'framer-motion'

const steps = [
  {
    num: '01',
    title: 'Practice',
    body: 'Engage with 25,000+ curated MCQs designed by former examiners to mirror the actual exam rigor.',
    accent: false,
  },
  {
    num: '02',
    title: 'Analyse',
    body: 'Get granular feedback on subject-wise accuracy, time management, and guess-work patterns.',
    accent: false,
  },
  {
    num: '03',
    title: 'Improve',
    body: 'Target weak areas with custom-generated drill sets that evolve based on your daily performance.',
    accent: true,
  },
]

export default function ProcessSection() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const reduced = useReducedMotion()

  return (
    <section className="py-16 sm:py-20 md:py-32 bg-white" ref={ref}>
      <div className="max-w-7xl mx-auto px-6 md:px-8">
        <m.h2
          initial={{ opacity: 0, y: reduced ? 0 : 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-2xl sm:text-3xl md:text-4xl font-black text-[#1A1C1C] text-center mb-12 sm:mb-16 md:mb-20 tracking-tight"
        >
          The Path to Excellence
        </m.h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 md:gap-8">
          {steps.map((step, i) => (
            <m.div
              key={i}
              initial={{ opacity: 0, y: reduced ? 0 : 40 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: i * 0.15, ease: 'easeOut' }}
              whileHover={{ y: -6 }}
              className={`bg-[#FAFAFA] p-12 rounded-3xl shadow-sm hover:shadow-lg transition-shadow ${
                step.accent ? 'border-b-4 border-[#4A90E2]' : ''
              }`}
            >
              <m.span
                whileHover={{ scale: 1.05 }}
                className="text-7xl font-black text-[#4A90E2]/10 block mb-6 leading-none select-none"
              >
                {step.num}
              </m.span>
              <h3 className="text-2xl font-black text-[#1A1C1C] mb-4">{step.title}</h3>
              <p className="text-[#43494D] leading-relaxed">{step.body}</p>
            </m.div>
          ))}
        </div>
      </div>
    </section>
  )
}
