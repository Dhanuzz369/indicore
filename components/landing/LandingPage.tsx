// components/landing/LandingPage.tsx
'use client'

import { LazyMotion, domAnimation, m, useReducedMotion } from 'framer-motion'
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

/** Fades + slides a section in as it enters the viewport */
function ScrollReveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const reduced = useReducedMotion()
  return (
    <m.div
      initial={{ opacity: 0, y: reduced ? 0 : 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
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
        {/* Hero — no wrapper, has its own entrance animation */}
        <HeroSection />
        <ScrollReveal delay={0}>
          <MarqueeBanner />
        </ScrollReveal>
        <ScrollReveal delay={0}>
          <FeaturesSection />
        </ScrollReveal>
        <ScrollReveal delay={0}>
          <ProcessSection />
        </ScrollReveal>
        <ScrollReveal delay={0}>
          <StatsSection />
        </ScrollReveal>
        <ScrollReveal delay={0}>
          <BentoSection />
        </ScrollReveal>
        <ScrollReveal delay={0}>
          <TestimonialsSection />
        </ScrollReveal>
        <ScrollReveal delay={0}>
          <CtaBanner />
        </ScrollReveal>
        <Footer />
      </div>
    </LazyMotion>
  )
}
