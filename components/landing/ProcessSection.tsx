// components/landing/ProcessSection.tsx
'use client'

import { useRef } from 'react'
import { m, useInView, useReducedMotion } from 'framer-motion'

function IconTarget() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
    </svg>
  )
}
function IconBarChart() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  )
}
function IconZap() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  )
}

const steps = [
  {
    num: '01',
    label: 'Step One',
    title: 'Practice',
    body: 'Engage with 25,000+ curated MCQs designed by former examiners to mirror the actual exam rigor.',
    icon: <IconTarget />,
    dark: false,
  },
  {
    num: '02',
    label: 'Step Two',
    title: 'Analyse',
    body: 'Get granular feedback on subject-wise accuracy, time management, and guess-work patterns.',
    icon: <IconBarChart />,
    dark: false,
  },
  {
    num: '03',
    label: 'Step Three',
    title: 'Improve',
    body: 'Target weak areas with custom-generated drill sets that evolve based on your daily performance.',
    icon: <IconZap />,
    dark: true,
  },
]

export default function ProcessSection() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const reduced = useReducedMotion()

  return (
    <section
      id="process"
      ref={ref}
      className="relative py-16 sm:py-20 md:py-32 overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #eef2ff 0%, #f8faff 45%, #f0f4ff 100%)' }}
    >
      {/* Background blobs */}
      <div className="absolute top-0 right-0 w-[480px] h-[480px] rounded-full bg-blue-100/30 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[360px] h-[360px] rounded-full bg-indigo-100/25 blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6 md:px-8">

        {/* Section header */}
        <m.div
          initial={{ opacity: 0, y: reduced ? 0 : 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-14 md:mb-20"
        >
          <span className="inline-block text-[10px] font-black text-[#4A90E2] uppercase tracking-[0.22em] bg-[#4A90E2]/8 px-3 py-1.5 rounded-full mb-4">
            How It Works
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-5xl font-black text-[#1A1C1C] tracking-tight mb-4 leading-tight">
            The Path to Excellence
          </h2>
          <p className="text-[#43494D] max-w-lg text-base md:text-lg leading-relaxed">
            Three focused steps engineered to maximize your score, minimize guesswork, and build lasting confidence.
          </p>
        </m.div>

        {/* Steps grid */}
        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">

          {/* Connector line — desktop only */}
          <div
            className="hidden md:block absolute"
            style={{
              top: '3.5rem',
              left: 'calc(33.33% - 2px)',
              right: 'calc(33.33% - 2px)',
              height: '1px',
              background: 'linear-gradient(90deg, transparent 0%, rgba(74,144,226,0.25) 20%, rgba(74,144,226,0.25) 80%, transparent 100%)',
              backgroundImage: 'repeating-linear-gradient(90deg, rgba(74,144,226,0.3) 0, rgba(74,144,226,0.3) 6px, transparent 6px, transparent 14px)',
            }}
          />

          {steps.map((step, i) => (
            <m.div
              key={i}
              initial={{ opacity: 0, y: reduced ? 0 : 40 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: i * 0.14, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -6, transition: { duration: 0.2 } }}
              className="relative rounded-[1.75rem] overflow-hidden"
              style={
                step.dark
                  ? {
                      background: 'linear-gradient(145deg, #0f172a 0%, #1e1b4b 60%, #0d1f3c 100%)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      boxShadow: '0 20px 60px rgba(74,144,226,0.12)',
                    }
                  : {
                      background: 'rgba(255,255,255,0.85)',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid rgba(99,102,241,0.08)',
                      boxShadow: '0 4px 24px rgba(74,144,226,0.06)',
                    }
              }
            >
              {/* Dark card glow blob */}
              {step.dark && (
                <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />
              )}

              <div className="relative p-8 md:p-10 flex flex-col h-full min-h-[280px]">
                {/* Step number + icon row */}
                <div className="flex items-start justify-between mb-8">
                  {/* Number badge */}
                  <div
                    className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                    style={
                      step.dark
                        ? { background: 'rgba(74,144,226,0.15)' }
                        : { background: 'rgba(74,144,226,0.08)' }
                    }
                  >
                    <span
                      className="text-xs font-black tracking-widest"
                      style={{ color: step.dark ? '#93c5fd' : '#4A90E2' }}
                    >
                      {step.num}
                    </span>
                  </div>

                  {/* Icon */}
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center"
                    style={
                      step.dark
                        ? { background: 'rgba(255,255,255,0.06)', color: '#a5b4fc' }
                        : { background: 'rgba(74,144,226,0.07)', color: '#4A90E2' }
                    }
                  >
                    {step.icon}
                  </div>
                </div>

                {/* Ghost number — decorative */}
                <span
                  className="absolute right-6 top-4 text-8xl font-black leading-none select-none pointer-events-none"
                  style={{ color: step.dark ? 'rgba(255,255,255,0.03)' : 'rgba(74,144,226,0.06)' }}
                >
                  {step.num}
                </span>

                {/* Text content */}
                <div className="mt-auto">
                  <p
                    className="text-[10px] font-black uppercase tracking-[0.18em] mb-2"
                    style={{ color: step.dark ? 'rgba(165,180,252,0.6)' : 'rgba(74,144,226,0.6)' }}
                  >
                    {step.label}
                  </p>
                  <h3
                    className="text-2xl md:text-3xl font-black mb-3 tracking-tight"
                    style={{ color: step.dark ? '#ffffff' : '#1A1C1C' }}
                  >
                    {step.title}
                  </h3>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: step.dark ? 'rgba(255,255,255,0.45)' : '#43494D' }}
                  >
                    {step.body}
                  </p>
                </div>

                {/* Bottom accent line */}
                {!step.dark && (
                  <div className="absolute bottom-0 left-8 right-8 h-[2px] rounded-full bg-gradient-to-r from-transparent via-[#4A90E2]/20 to-transparent" />
                )}
                {step.dark && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-400/40 to-transparent" />
                )}
              </div>
            </m.div>
          ))}
        </div>
      </div>
    </section>
  )
}
