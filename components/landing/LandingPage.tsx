// components/landing/LandingPage.tsx
'use client'

import { LazyMotion, domAnimation } from 'framer-motion'
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

export default function LandingPage() {
  return (
    <LazyMotion features={domAnimation}>
      <div className="bg-[#FAFAFA] text-[#1A1C1C] font-sans overflow-x-hidden">
        <NavBar />
        <HeroSection />
        <MarqueeBanner />
        <FeaturesSection />
        <ProcessSection />
        <StatsSection />
        <BentoSection />
        <TestimonialsSection />
        <CtaBanner />
        <Footer />
      </div>
    </LazyMotion>
  )
}
