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
          <a
            href="https://t.me/IndicoreUpsc"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Join Telegram"
            className="flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-sm uppercase tracking-wider transition-all hover:scale-105 active:scale-95"
            style={{ background: 'rgba(34,158,217,0.1)', color: '#229ED9', border: '1px solid rgba(34,158,217,0.25)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(34,158,217,0.18)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(34,158,217,0.1)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
            </svg>
            Telegram
          </a>
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
          <div className="flex gap-4 pt-4 border-t border-black/5 flex-wrap">
            <a
              href="https://t.me/IndicoreUpsc"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-sm"
              style={{ background: 'rgba(34,158,217,0.1)', color: '#229ED9', border: '1px solid rgba(34,158,217,0.25)' }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
              Telegram
            </a>
            <Link href="/login" className="text-[#43494D] font-bold text-sm">Login</Link>
            <Link href="/signup" className="bg-[#4A90E2] text-white px-5 py-2 rounded-full font-bold text-sm">Get Started</Link>
          </div>
        </div>
      )}
    </nav>
  )
}
