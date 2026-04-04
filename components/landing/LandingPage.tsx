// components/landing/LandingPage.tsx
'use client'

import { LazyMotion, domAnimation, m, useReducedMotion, useInView } from 'framer-motion'
import { useRef } from 'react'
import NavBar from './NavBar'
import HeroSection from './HeroSection'
import MarqueeBanner from './MarqueeBanner'
import FeaturesSection from './FeaturesSection'
import ProcessSection from './ProcessSection'
import StatsSection from './StatsSection'
import BentoSection from './BentoSection'
import TestimonialsSection from './TestimonialsSection'
import CtaBanner from './CtaBanner'
import Footer from './Footer'

/**
 * Wraps a section with a scroll-triggered reveal.
 * Uses spring-physics easing with stagger support.
 */
function SectionReveal({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const reduced = useReducedMotion()
  return (
    <m.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: reduced ? 0 : 56 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration: 0.75,
        ease: [0.22, 1, 0.36, 1],
        opacity: { duration: 0.55 },
      }}
    >
      {children}
    </m.div>
  )
}

export default function LandingPage() {
  return (
    <LazyMotion features={domAnimation}>
      <div className="bg-white text-[#1A1C1C] font-sans overflow-x-hidden">
        <NavBar />

        {/* Hero has its own entrance — no extra wrapper */}
        <HeroSection />

        <SectionReveal>
          <MarqueeBanner />
        </SectionReveal>

        <SectionReveal>
          <FeaturesSection />
        </SectionReveal>

        <SectionReveal>
          <ProcessSection />
        </SectionReveal>

        <SectionReveal>
          <StatsSection />
        </SectionReveal>

        <SectionReveal>
          <BentoSection />
        </SectionReveal>

        <SectionReveal>
          <TestimonialsSection />
        </SectionReveal>

        <SectionReveal>
          <CtaBanner />
        </SectionReveal>

        <Footer />
      </div>
    </LazyMotion>
  )
}
