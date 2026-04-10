// components/landing/StatsSection.tsx
'use client'

import { useEffect, useRef } from 'react'
import { useInView, useReducedMotion, animate } from 'framer-motion'

const stats = [
  { to: 150, suffix: '+',  label: 'Aspirants Trusted' },
  { to: 200, suffix: '+',  label: 'Tests Taken' },
  { to: 25,  suffix: 'K+', label: 'Curated Questions' },
]

function Counter({ to, suffix, label }: { to: number; suffix: string; label: string }) {
  const nodeRef = useRef<HTMLSpanElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const inView = useInView(wrapRef, { once: true })
  const reduced = useReducedMotion()

  useEffect(() => {
    if (!inView || !nodeRef.current) return
    if (reduced) {
      nodeRef.current.textContent = `${to}${suffix}`
      return
    }
    const ctrl = animate(0, to, {
      duration: 1.5,
      ease: 'easeOut',
      onUpdate(v) {
        if (nodeRef.current) nodeRef.current.textContent = `${Math.round(v)}${suffix}`
      },
    })
    return () => ctrl.stop()
  }, [inView, to, suffix, reduced])

  return (
    <div ref={wrapRef} className="text-center">
      <div className="text-5xl font-black text-[#4A90E2] mb-2">
        <span ref={nodeRef}>0{suffix}</span>
      </div>
      <div className="text-sm font-black text-[#43494D] uppercase tracking-widest">{label}</div>
    </div>
  )
}

export default function StatsSection() {
  return (
    <section className="relative py-12 sm:py-16 md:py-24 border-y border-[#4A90E2]/10 overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(74,144,226,0.06) 0%, rgba(162,194,232,0.08) 50%, rgba(74,144,226,0.05) 100%)' }}>
      <div className="absolute inset-0 bg-gradient-to-r from-blue-50/30 via-sky-50/20 to-indigo-50/30 pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-6 md:px-8 grid grid-cols-1 sm:grid-cols-3 gap-12">
        {stats.map((s) => (
          <Counter key={s.label} {...s} />
        ))}
      </div>
    </section>
  )
}
