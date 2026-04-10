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

      {/* Light readability vignette — keep aurora visible */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 70% 55% at 50% 45%, rgba(255,255,255,0.18) 0%, rgba(248,250,255,0.42) 100%)' }}
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
          Analyze your UPSC prelims mock tests with advanced performance analytics.
          Identify weak areas, fix decision-making mistakes, and improve your UPSC Prelims
          2026 score faster.
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
            Analyse Now
          </Link>
          <a
            href="https://t.me/IndicoreUpsc"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-10 py-4 rounded-full font-black text-base uppercase tracking-wider transition-all active:scale-95 hover:shadow-xl hover:shadow-[#229ED9]/25"
            style={{ background: 'linear-gradient(135deg, #229ED9 0%, #1a8bc4 100%)', color: '#fff' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
            </svg>
            Join Telegram
          </a>
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
