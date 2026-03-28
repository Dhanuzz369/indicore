// components/landing/CtaBanner.tsx
'use client'

import { useRef } from 'react'
import { m, useInView, useReducedMotion } from 'framer-motion'
import Link from 'next/link'

const HEADLINE = 'Ready to Transform Your Prep Journey?'
const WORDS = HEADLINE.split(' ')

export default function CtaBanner() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const reduced = useReducedMotion()

  const wordVariant = {
    hidden: { opacity: 0, y: reduced ? 0 : 40 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
    }),
  }

  return (
    <section className="px-6 md:px-8 max-w-7xl mx-auto mb-32 mt-16">
      <div
        ref={ref}
        className="relative rounded-[3rem] overflow-hidden p-8 sm:p-12 md:p-24 text-center text-white"
        style={{ background: 'linear-gradient(135deg, #4A90E2 0%, #A2C2E8 100%)' }}
      >
        {/* Animated blobs */}
        <m.div
          className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl pointer-events-none"
          style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}
          animate={reduced ? {} : {
            x: [0, 40, 0],
            y: [0, -30, 0],
          }}
          transition={{ duration: 8, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
        />
        <m.div
          className="absolute bottom-0 left-0 w-72 h-72 rounded-full blur-3xl pointer-events-none"
          style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
          animate={reduced ? {} : {
            x: [0, -30, 0],
            y: [0, 30, 0],
          }}
          transition={{ duration: 10, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut', delay: 2 }}
        />

        {/* Content */}
        <div className="relative z-10">
          <h2 className="text-2xl sm:text-3xl md:text-6xl font-black mb-8 leading-tight max-w-4xl mx-auto flex flex-wrap justify-center gap-x-[0.25em]">
            {WORDS.map((word, i) => (
              <m.span
                key={i}
                custom={i}
                variants={wordVariant}
                initial="hidden"
                animate={inView ? 'visible' : 'hidden'}
              >
                {word}
              </m.span>
            ))}
          </h2>

          <m.p
            initial={{ opacity: 0, y: reduced ? 0 : 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: WORDS.length * 0.07 + 0.2 }}
            className="text-lg opacity-90 mb-12 max-w-2xl mx-auto"
          >
            Join the new generation of scholars using data to conquer the most challenging exam in the world.
          </m.p>

          <m.div
            initial={{ opacity: 0, y: reduced ? 0 : 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: WORDS.length * 0.07 + 0.45 }}
          >
            <Link
              href="/signup"
              className="inline-block bg-white text-[#4A90E2] px-8 py-4 sm:px-12 sm:py-5 rounded-full font-black text-base sm:text-lg hover:scale-105 active:scale-95 transition-all shadow-2xl hover:shadow-white/30"
            >
              Start Practising Now
            </Link>
          </m.div>
        </div>
      </div>
    </section>
  )
}
