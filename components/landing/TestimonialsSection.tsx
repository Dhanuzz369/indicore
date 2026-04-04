// components/landing/TestimonialsSection.tsx
'use client'

import { useRef } from 'react'
import { m, useInView, useReducedMotion } from 'framer-motion'

const testimonials = [
  {
    quote: 'Indicore didn\'t just give me questions; it gave me a strategy. Seeing my performance dials turn blue was the confidence boost I needed.',
    name: 'Ritika Verma',
    rank: 'IFS Rank 42',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD2a8QzSsIwfujtHfYYieuZjF6I0Q8_ZJ5Hg4L-hRMt6z3etStc_PluIYnmhGtRvTaZFfTPgbsDG3OHX71G16UhKa4Nnwco7mwaSZBjor0HxEuIQInflowWGmbMIwpuhCDVtAN79K6XnI7blDKOlAj6K5Flz0sCsTuwEkt9mODm5NZvOvo3Y5q84gd-TkXrUGNgGkXBlJ4hazoXkEJTGWaTj2RXNWIbwAqXgeJ-x8bvooOGx7ynN82gYVU47PThdihkrNqqjQVtY7Xo',
  },
  {
    quote: 'The editorial interface is so clean. I could study for 4 hours straight without feeling the digital fatigue of other platforms.',
    name: 'Sameer Khan',
    rank: 'IAS Aspirant',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDFD14guYpoPlrzV6-yPDVIenJZrEW-FoX3cJnjlGLeV-ktq0ZCWkLnrE_V80LiijxY5vITtXOUS_HJhIXu9rNINglX1RoWKz6baGPjrfIve0ZT0hD3RaMfORNjh-flPjaH980vI-9BdpgNN7ZnY18mBEE7AkgvIEqsxjpWZ_09RxO-TtilUtd9iSCxYIAFDXQ9wEJ62yNykL_J8jU0pD6qwAW-W835T6ew-UXOnClGrDADvL24XxtuhOvUf5eLhrNXMJPfqNxcqRG-',
  },
  {
    quote: 'The analytics revealed I was over-confident in Geography and weak in Environment. That pivot saved my prelims attempt.',
    name: 'Priyanka Rao',
    rank: 'IPS Rank 112',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDdTdfJpipjAHmMnZgk-9HsX9g9xZM5fi_d4M9nfBvxUcnsqWO37YXw2CEfsjasOXGVfR8ih0Y1ESM_FRB0E7KE1kRCkkEfzva-EGc5vSL7goJRGHuG6SrrnisUPb4z_33aFNZGUooJ6tufMVPI1th9D-Xw2icIHhthIAKWBH7AizzD4sZWV_XYYofOcViYMwJX3EgXBKoLhs_VOWat1Y6o8eQo6AFi-TEuWUeCVTDMYMZm0biELUNRgo91_aa7VtCagRCKAWetjC4I',
  },
]

export default function TestimonialsSection() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const reduced = useReducedMotion()

  return (
    <section id="testimonials" ref={ref} className="relative py-16 sm:py-20 md:py-32 overflow-hidden" style={{ background: 'linear-gradient(150deg, #f8f5ff 0%, #f0f5ff 50%, #f5fff8 100%)' }}>
      <div className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full bg-purple-100/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-teal-100/20 blur-3xl pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-6 md:px-8">
        <m.h2
          initial={{ opacity: 0, y: reduced ? 0 : 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-2xl sm:text-3xl md:text-4xl font-black text-[#1A1C1C] text-center mb-12 sm:mb-16 md:mb-20 tracking-tight"
        >
          Voices of Success
        </m.h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 md:gap-8">
          {testimonials.map((t, i) => (
            <m.div
              key={i}
              initial={{ opacity: 0, y: reduced ? 0 : 50 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: i * 0.15, ease: 'easeOut' }}
              whileHover={{ y: -8 }}
              className="bg-white p-10 rounded-3xl border border-[#4A90E2]/10 hover:border-[#4A90E2]/30 relative shadow-sm hover:shadow-lg transition-all"
            >
              {/* Floating quote mark */}
              <div className="absolute -top-5 left-8 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md text-[#4A90E2] text-2xl font-black">
                &ldquo;
              </div>

              <p className="text-[#43494D] italic mb-8 leading-relaxed text-sm">&ldquo;{t.quote}&rdquo;</p>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-[#F4F3F2] shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={t.avatar} alt={t.name} className="w-full h-full object-cover" />
                </div>
                <div>
                  <div className="font-black text-[#1A1C1C]">{t.name}</div>
                  <div className="text-xs text-[#4A90E2] font-bold uppercase tracking-widest">{t.rank}</div>
                </div>
              </div>
            </m.div>
          ))}
        </div>
      </div>
    </section>
  )
}
