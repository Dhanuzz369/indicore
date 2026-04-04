// components/landing/HeroSection.tsx
'use client'

import { m, useReducedMotion } from 'framer-motion'
import Link from 'next/link'

import HeroCanvas from './HeroCanvas'

const HEADLINE = 'The Smartest Way to Crack UPSC Prelims'
const WORDS = HEADLINE.split(' ')

export default function HeroSection() {
  const reduced = useReducedMotion()

  const wordVariant = {
    hidden: { opacity: 0, y: reduced ? 0 : 60 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
    }),
  }

  const fadeUp = (delay: number) => ({
    hidden: { opacity: 0, y: reduced ? 0 : 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, delay, ease: 'easeOut' as const } },
  })

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Three.js canvas — behind everything */}
      <HeroCanvas />

      {/* Readability vignette over aurora */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 70% 55% at 50% 45%, rgba(250,252,255,0.50) 0%, rgba(248,248,252,0.80) 100%)' }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        {/* Badge */}
        <m.span
          variants={fadeUp(0)}
          initial="hidden"
          animate="visible"
          className="inline-block mb-6 px-4 py-1.5 rounded-full bg-[#D6E4F8] text-[#2a4b57] font-black text-[10px] uppercase tracking-[0.2em]"
        >
          Prep Reimagined
        </m.span>

        {/* Headline — word stagger */}
        <h1 className="text-4xl sm:text-6xl md:text-8xl lg:text-9xl font-black leading-[1.0] tracking-tighter mb-8 flex flex-wrap justify-center gap-x-[0.25em]">
          {WORDS.map((word, i) => (
            <m.span
              key={i}
              custom={i}
              variants={wordVariant}
              initial="hidden"
              animate="visible"
              className={
                i >= WORDS.indexOf('Crack')
                  ? 'bg-gradient-to-r from-[#4A90E2] to-[#A2C2E8] bg-clip-text text-transparent'
                  : 'text-[#1A1C1C]'
              }
            >
              {word}
            </m.span>
          ))}
        </h1>

        {/* Subtext */}
        <m.p
          variants={fadeUp(WORDS.length * 0.08 + 0.2)}
          initial="hidden"
          animate="visible"
          className="text-base sm:text-lg md:text-xl text-[#43494D] max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          Experience an editorial-first approach to competitive exams. Advanced analytics
          meets distraction-free studying for the modern scholar.
        </m.p>

        {/* CTAs */}
        <m.div
          variants={fadeUp(WORDS.length * 0.08 + 0.45)}
          initial="hidden"
          animate="visible"
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link
            href="/signup"
            className="w-full sm:w-auto px-10 py-4 bg-[#4A90E2] text-white rounded-full font-black text-base uppercase tracking-wider hover:bg-[#3a7fd4] hover:shadow-xl hover:shadow-[#4A90E2]/30 transition-all active:scale-95"
          >
            Start Your Trial
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto px-10 py-4 bg-white/80 backdrop-blur text-[#1A1C1C] rounded-full font-black text-base uppercase tracking-wider border border-black/10 hover:bg-white transition-all active:scale-95"
          >
            View the App
          </Link>
        </m.div>
      </div>

      {/* Scroll indicator */}
      <m.div
        variants={fadeUp(WORDS.length * 0.08 + 0.8)}
        initial="hidden"
        animate="visible"
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <span className="text-[10px] font-black text-[#43494D] uppercase tracking-widest">Scroll</span>
        <div className="w-0.5 h-10 bg-gradient-to-b from-[#4A90E2] to-transparent" />
      </m.div>
    </section>
  )
}
