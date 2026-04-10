// components/landing/Footer.tsx
'use client'

import Link from 'next/link'

function IconX() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
    </svg>
  )
}
function IconLinkedIn() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}
function IconInstagram() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
    </svg>
  )
}
function IconYouTube() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  )
}
function IconTelegram() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
    </svg>
  )
}

const socials = [
  { label: 'Telegram', icon: <IconTelegram />, href: 'https://t.me/IndicoreUpsc', highlight: true },
  { label: 'X / Twitter', icon: <IconX />, href: '#' },
  { label: 'LinkedIn', icon: <IconLinkedIn />, href: '#' },
  { label: 'Instagram', icon: <IconInstagram />, href: '#' },
  { label: 'YouTube', icon: <IconYouTube />, href: '#' },
]

const cols = [
  {
    heading: 'Product',
    links: [
      { label: 'Mock Tests', href: '#' },
      { label: 'Analytics Dashboard', href: '#' },
      { label: 'Flashcards', href: '#' },
      { label: 'Adaptive Practice', href: '#' },
    ],
  },
  {
    heading: 'Resources',
    links: [
      { label: 'Study Planner', href: '#' },
      { label: 'UPSC Guide', href: '#' },
      { label: 'Success Stories', href: '#' },
      { label: 'Knowledge Base', href: '#' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About', href: '#' },
      { label: 'Blog', href: '#' },
      { label: 'Careers', href: '#' },
      { label: 'Contact', href: '#' },
    ],
  },
]

export default function Footer() {
  return (
    <footer
      className="relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #0b1120 0%, #0f172a 45%, #0d1433 100%)' }}
    >
      {/* Subtle top glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-px bg-gradient-to-r from-transparent via-[#4A90E2]/25 to-transparent" />

      {/* Ghost wordmark */}
      <div
        className="absolute bottom-0 right-0 text-[clamp(5rem,18vw,14rem)] font-black leading-none select-none pointer-events-none pr-4 pb-2 translate-y-[20%]"
        style={{ color: 'rgba(255,255,255,0.025)', letterSpacing: '-0.04em' }}
        aria-hidden="true"
      >
        Indicore
      </div>

      {/* Top section: Brand + Social */}
      <div className="relative max-w-7xl mx-auto px-6 md:px-8 pt-16 md:pt-20 pb-10 md:pb-12">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-8">
          {/* Brand */}
          <div className="max-w-xs">
            <div className="text-2xl font-black text-white mb-3 tracking-tight">Indicore</div>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.38)' }}>
              Crafting premium learning experiences for the modern UPSC scholar.
              Precise. Focused. Authoritative.
            </p>
            {/* Status pill */}
            <div className="mt-5 inline-flex items-center gap-2 bg-emerald-400/8 border border-emerald-400/15 rounded-full px-3 py-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Live &amp; Updating</span>
            </div>
          </div>

          {/* Social icons */}
          <div className="flex items-center gap-2.5">
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target={s.href.startsWith('http') ? '_blank' : undefined}
                rel={s.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                aria-label={s.label}
                className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer"
                style={s.highlight ? {
                  background: 'rgba(34,158,217,0.15)',
                  border: '1px solid rgba(34,158,217,0.35)',
                  color: '#4fc3f7',
                } : {
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.45)',
                }}
                onMouseEnter={(e) => {
                  const t = e.currentTarget
                  if (s.highlight) {
                    t.style.background = 'rgba(34,158,217,0.28)'
                    t.style.borderColor = 'rgba(34,158,217,0.6)'
                    t.style.color = '#fff'
                    t.style.boxShadow = '0 0 16px rgba(34,158,217,0.35)'
                  } else {
                    t.style.background = 'rgba(74,144,226,0.15)'
                    t.style.borderColor = 'rgba(74,144,226,0.35)'
                    t.style.color = '#93c5fd'
                  }
                }}
                onMouseLeave={(e) => {
                  const t = e.currentTarget
                  if (s.highlight) {
                    t.style.background = 'rgba(34,158,217,0.15)'
                    t.style.borderColor = 'rgba(34,158,217,0.35)'
                    t.style.color = '#4fc3f7'
                    t.style.boxShadow = ''
                  } else {
                    t.style.background = 'rgba(255,255,255,0.05)'
                    t.style.borderColor = 'rgba(255,255,255,0.08)'
                    t.style.color = 'rgba(255,255,255,0.45)'
                  }
                }}
              >
                {s.icon}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="max-w-7xl mx-auto px-6 md:px-8">
        <div className="h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
      </div>

      {/* Links grid */}
      <div className="relative max-w-7xl mx-auto px-6 md:px-8 py-12 md:py-14">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-8 md:gap-12">
          {cols.map((col) => (
            <div key={col.heading}>
              <h4
                className="text-[10px] font-black uppercase tracking-[0.22em] mb-5"
                style={{ color: 'rgba(255,255,255,0.3)' }}
              >
                {col.heading}
              </h4>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm font-medium transition-colors duration-150"
                      style={{ color: 'rgba(255,255,255,0.45)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#93c5fd' }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.45)' }}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="max-w-7xl mx-auto px-6 md:px-8">
        <div className="h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
      </div>
      <div className="relative max-w-7xl mx-auto px-6 md:px-8 py-7 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p
          className="text-[11px] font-bold uppercase tracking-widest"
          style={{ color: 'rgba(255,255,255,0.22)' }}
        >
          © 2025 Indicore. Made for UPSC aspirants.
        </p>
        <div className="flex items-center gap-6">
          {['Privacy', 'Terms', 'Cookies'].map((l) => (
            <a
              key={l}
              href="#"
              className="text-[11px] font-bold uppercase tracking-widest transition-colors duration-150"
              style={{ color: 'rgba(255,255,255,0.22)' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.55)' }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.22)' }}
            >
              {l}
            </a>
          ))}
        </div>
      </div>
    </footer>
  )
}
