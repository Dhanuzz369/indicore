'use client'
export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { ArrowRight, Zap, CheckCircle2, Star, Clock, Users, BookOpen, BarChart3 } from 'lucide-react'

const FEATURES = [
  { icon: BookOpen, label: 'All Subjects Unlocked', desc: 'Full access to every subject in the question bank' },
  { icon: BarChart3, label: 'Deep Analytics', desc: 'Subject-wise performance breakdowns & insights' },
  { icon: Users, label: 'Full-Length Mock Tests', desc: 'Unlimited UPSC-pattern full-length mocks' },
  { icon: Star, label: 'Smart Notes & Revision', desc: 'AI-curated notes and spaced-repetition flashcards' },
  { icon: Zap, label: 'Priority Support', desc: 'Dedicated doubt-solving and exam guidance' },
  { icon: CheckCircle2, label: 'Detailed Solutions', desc: 'Every question answered with in-depth explanations' },
]

export default function SubscriptionPlusPage() {
  return (
    <div className="min-h-screen bg-[#F0F1FF]">
      {/* Hero Banner */}
      <div
        className="relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #1a1a4e 0%, #2d2d8f 50%, #3b3bbf 100%)',
        }}
      >
        {/* Decorative blobs */}
        <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl mx-auto px-6 pt-14 pb-16 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-[#FFD600] text-[#1a1a4e] text-[11px] font-black tracking-[0.18em] uppercase px-4 py-2 rounded-full mb-6 shadow-lg">
            <Zap className="h-3.5 w-3.5 fill-current" />
            Limited Time Exclusive
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-6xl font-black text-white leading-tight mb-4">
            We are free till{' '}
            <span className="text-[#4D79FF] italic">25th</span>
            <br />
            <span className="text-[#4D79FF] italic">May</span>
          </h1>

          <p className="text-white/70 text-base md:text-lg font-medium max-w-md mx-auto mb-10">
            Secure your spot and pay before 24th May to unlock your full experience.
          </p>

          {/* Offer Row */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {/* Price Badge */}
            <div className="rounded-2xl px-8 py-5 text-center" style={{ background: 'rgba(77,121,255,0.25)', border: '1.5px solid rgba(77,121,255,0.4)' }}>
              <p className="text-white font-black text-3xl">20% off</p>
              <p className="text-white/60 text-[11px] font-bold tracking-widest uppercase mt-0.5">Early Bird Special</p>
            </div>

            {/* CTA */}
            <div className="flex flex-col items-center gap-1.5">
              <button
                className="inline-flex items-center gap-2.5 bg-[#3350E8] hover:bg-[#2a42d0] text-white font-black text-base px-9 py-4 rounded-2xl shadow-xl transition-all hover:-translate-y-0.5 active:translate-y-0"
                onClick={() => alert('Payment coming soon! 🎉')}
              >
                Get the Offer
                <ArrowRight className="h-5 w-5" />
              </button>
              <p className="text-white/40 text-[11px] font-medium">Promotion ends May 24th, 11:59 PM</p>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-3xl mx-auto px-6 py-14">
        <h2 className="text-3xl font-black text-[#1a1a4e] text-center mb-2">Everything Included</h2>
        <p className="text-gray-500 text-center mb-10 text-sm font-medium">
          One plan. Full access. Zero limits.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FEATURES.map(({ icon: Icon, label, desc }) => (
            <div
              key={label}
              className="bg-white rounded-2xl p-5 border border-blue-50 shadow-sm hover:shadow-md transition-shadow flex gap-4 items-start"
            >
              <div className="w-11 h-11 rounded-xl bg-[#4D79FF]/10 flex items-center justify-center shrink-0">
                <Icon className="h-5 w-5 text-[#3350E8]" />
              </div>
              <div>
                <p className="font-black text-gray-900 text-sm">{label}</p>
                <p className="text-gray-400 text-xs mt-0.5 font-medium">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Countdown timer section */}
        <div className="mt-10 bg-white rounded-[2rem] border border-blue-100 shadow-sm p-8 text-center">
          <div className="inline-flex items-center gap-2 text-red-500 bg-red-50 border border-red-100 px-4 py-1.5 rounded-full text-xs font-black tracking-wide uppercase mb-5">
            <Clock className="h-3.5 w-3.5" />
            Offer Ends Soon
          </div>
          <p className="text-[#1a1a4e] font-black text-2xl mb-1">Don't miss the Early Bird deal</p>
          <p className="text-gray-400 text-sm mb-8 font-medium">Lock in 20% off before May 24th, 11:59 PM.</p>
          <button
            className="inline-flex items-center gap-2.5 bg-[#3350E8] hover:bg-[#2a42d0] text-white font-black text-base px-10 py-4 rounded-2xl shadow-xl transition-all hover:-translate-y-0.5 active:translate-y-0"
            onClick={() => alert('Payment coming soon! 🎉')}
          >
            Get the Offer
            <ArrowRight className="h-5 w-5" />
          </button>
          <p className="text-gray-300 text-xs mt-3 font-medium">No credit card required to explore. Cancel anytime.</p>
        </div>

        {/* Back link */}
        <div className="text-center mt-8">
          <Link href="/dashboard" className="text-[#3350E8] text-sm font-bold hover:underline">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
