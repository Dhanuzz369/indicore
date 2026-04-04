// components/landing/NavBar.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function NavBar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 80)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/80 backdrop-blur-xl shadow-sm border-b border-black/5'
          : 'bg-transparent'
      }`}
    >
      <div className="flex justify-between items-center max-w-7xl mx-auto px-6 md:px-8 h-20">
        {/* Logo */}
        <div className="text-2xl font-black text-[#1A1C1C] tracking-tight">
          Indicore
        </div>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-10">
          {['Features', 'Analytics', 'Testimonials'].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              className="text-[#43494D] font-bold hover:text-[#4A90E2] transition-colors text-sm uppercase tracking-wider"
            >
              {item}
            </a>
          ))}
        </div>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-4">
          <Link
            href="/login"
            className="text-[#43494D] font-bold hover:text-[#1A1C1C] transition-colors text-sm uppercase tracking-wider"
          >
            Login
          </Link>
          <Link
            href="/signup"
            className="bg-[#4A90E2] text-white px-6 py-2.5 rounded-full font-bold text-sm uppercase tracking-wider hover:bg-[#3a7fd4] transition-colors shadow-lg shadow-[#4A90E2]/20"
          >
            Get Started
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          <div className={`w-6 h-0.5 bg-[#1A1C1C] transition-all mb-1.5 ${mobileOpen ? 'rotate-45 translate-y-2' : ''}`} />
          <div className={`w-6 h-0.5 bg-[#1A1C1C] transition-all mb-1.5 ${mobileOpen ? 'opacity-0' : ''}`} />
          <div className={`w-6 h-0.5 bg-[#1A1C1C] transition-all ${mobileOpen ? '-rotate-45 -translate-y-2' : ''}`} />
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-black/5 px-6 py-6 space-y-4">
          {['Features', 'Analytics', 'Testimonials'].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              onClick={() => setMobileOpen(false)}
              className="block text-[#43494D] font-bold text-sm uppercase tracking-wider hover:text-[#4A90E2]"
            >
              {item}
            </a>
          ))}
          <div className="flex gap-4 pt-4 border-t border-black/5">
            <Link href="/login" className="text-[#43494D] font-bold text-sm">Login</Link>
            <Link href="/signup" className="bg-[#4A90E2] text-white px-5 py-2 rounded-full font-bold text-sm">Get Started</Link>
          </div>
        </div>
      )}
    </nav>
  )
}
