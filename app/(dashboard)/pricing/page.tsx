'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/supabase/auth'
import {
  ChevronLeft, Check, Crown, Zap, BookOpen,
  BarChart3, Target, Brain, Flame, Sparkles, ShieldCheck
} from 'lucide-react'
import { toast } from 'sonner'

// ── Razorpay types ──────────────────────────────────────────────────────────
declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => { open: () => void }
  }
}
interface RazorpayOptions {
  key: string
  amount: number
  currency: string
  name: string
  description: string
  order_id: string
  handler: (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => void
  prefill?: { name?: string; email?: string }
  theme?: { color?: string }
  modal?: { ondismiss?: () => void }
}

// ── Plan config ─────────────────────────────────────────────────────────────
const FEATURES = [
  { icon: BookOpen,  text: 'Practice 1000+ curated questions' },
  { icon: BarChart3, text: 'Deep analytics after every test' },
  { icon: Target,    text: 'Identify weak concepts instantly' },
  { icon: Zap,       text: 'Clear action plan after every test' },
  { icon: Brain,     text: 'AI-powered intelligence engine' },
  { icon: Flame,     text: 'Streak tracking & consistency tools' },
  { icon: Sparkles,  text: 'Flashcards for rapid revision' },
  { icon: ShieldCheck, text: 'Unlimited full-length mock tests' },
]

const PLANS = {
  annual: {
    id: 'annual',
    label: 'Annual Plan',
    name: 'Annual',
    price: 1788,          // ₹149 × 12
    perMonth: 149,
    billing: 'Billed once a year',
    savings: 'Save ₹600 vs monthly',
    featured: false,
    ctaLabel: 'Get Annual Access',
  },
  monthly: {
    id: 'monthly',
    label: 'Monthly Plan',
    name: 'Monthly',
    price: 199,
    perMonth: 199,
    billing: 'Billed every month',
    savings: 'Full flexibility, cancel anytime',
    featured: true,
    ctaLabel: 'Get Monthly Access',
  },
} as const

type PlanId = keyof typeof PLANS

// ── Component ───────────────────────────────────────────────────────────────
export default function PricingPage() {
  const router = useRouter()
  const [userInfo, setUserInfo] = useState<{ name: string; email: string } | null>(null)
  const [loading, setLoading] = useState<PlanId | null>(null)
  const [scriptLoaded, setScriptLoaded] = useState(false)

  // Load Razorpay checkout script
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (document.getElementById('razorpay-script')) { setScriptLoaded(true); return }
    const script = document.createElement('script')
    script.id   = 'razorpay-script'
    script.src  = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => setScriptLoaded(true)
    document.body.appendChild(script)
  }, [])

  // Fetch user info for Razorpay prefill
  useEffect(() => {
    getCurrentUser().then(u => {
      if (u) setUserInfo({ name: u.name ?? '', email: u.email ?? '' })
    }).catch(() => {})
  }, [])

  const handlePurchase = async (planId: PlanId) => {
    if (!scriptLoaded) {
      toast.error('Payment gateway loading, please try again in a moment.')
      return
    }
    setLoading(planId)
    try {
      // 1. Create order server-side
      const res = await fetch('/api/payment/create-order', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ plan: planId }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to initiate payment')
      }
      const order = await res.json()

      // 2. Open Razorpay checkout
      const rzp = new window.Razorpay({
        key:         order.keyId,
        amount:      order.amount,
        currency:    order.currency,
        name:        'Indicore',
        description: PLANS[planId].label,
        order_id:    order.orderId,
        prefill: {
          name:  userInfo?.name,
          email: userInfo?.email,
        },
        theme: { color: '#4A90E2' },
        handler: async (response) => {
          // 3. Verify payment server-side
          try {
            const vRes = await fetch('/api/payment/verify', {
              method:  'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id:   response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature:  response.razorpay_signature,
                plan: planId,
              }),
            })
            if (!vRes.ok) throw new Error('Verification failed')
            toast.success('🎉 Welcome to Indicore Plus! Your subscription is active.')
            router.push('/dashboard')
          } catch {
            toast.error('Payment received but verification failed. Contact support.')
          } finally {
            setLoading(null)
          }
        },
        modal: {
          ondismiss: () => setLoading(null),
        },
      })
      rzp.open()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      toast.error(msg)
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#FDFDFD] pb-32">
      <div className="max-w-2xl mx-auto">

        {/* ── Header ────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 pt-8 pb-4">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronLeft className="h-6 w-6 text-[#4A90E2]" />
          </button>
          <h1 className="text-sm font-black tracking-[0.2em] text-gray-900 uppercase">Premium Plans</h1>
          <div className="w-10" />
        </div>

        <div className="px-5 space-y-5">

          {/* ── Promo banner ──────────────────────────────────────── */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3.5 flex items-center gap-3">
            <span className="text-xl shrink-0">🎁</span>
            <p className="text-xs font-semibold text-amber-800 leading-snug">
              We are <span className="font-black">free till 25th May 2026.</span> Get premium access at a discount — buy before 24th May 2026.
            </p>
          </div>

          {/* ── Hero copy ─────────────────────────────────────────── */}
          <div className="text-center py-4">
            <div className="inline-flex items-center gap-2 bg-[#EBF2FC] text-[#4A90E2] px-4 py-2 rounded-full mb-4">
              <Crown className="h-4 w-4" />
              <span className="text-xs font-black uppercase tracking-widest">Indicore Plus</span>
            </div>
            <h2 className="text-3xl font-black text-gray-900 leading-tight mb-2">
              Unlock Your Full<br />
              <span className="text-[#4A90E2]">UPSC Potential</span>
            </h2>
            <p className="text-sm text-gray-400 font-medium">
              Every feature, unlimited access — built for serious aspirants
            </p>
          </div>

          {/* ── Plan cards ────────────────────────────────────────── */}
          <div className="space-y-4">
            {(Object.values(PLANS) as typeof PLANS[PlanId][]).map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                loading={loading === plan.id}
                onSelect={() => handlePurchase(plan.id as PlanId)}
              />
            ))}
          </div>

          {/* ── What's included ───────────────────────────────────── */}
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 mt-2">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">
              Everything Included
            </p>
            <div className="grid grid-cols-1 gap-3">
              {FEATURES.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#EBF2FC] flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-[#4A90E2]" />
                  </div>
                  <span className="text-sm font-semibold text-gray-700">{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Trust footer ──────────────────────────────────────── */}
          <div className="text-center space-y-2 pt-2 pb-4">
            <div className="flex items-center justify-center gap-6">
              {['Secure Payment', '100% Safe', 'Cancel Anytime'].map(t => (
                <div key={t} className="flex items-center gap-1.5">
                  <Check className="h-3 w-3 text-emerald-500" />
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{t}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-gray-300 font-medium">
              Powered by Razorpay · All major UPI, cards & wallets accepted
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}

// ── PlanCard sub-component ──────────────────────────────────────────────────
function PlanCard({
  plan,
  loading,
  onSelect,
}: {
  plan: typeof PLANS[PlanId]
  loading: boolean
  onSelect: () => void
}) {
  const { featured, label, name, price, perMonth, billing, savings, ctaLabel } = plan

  return (
    <div
      className={`relative rounded-[2rem] border transition-all ${
        featured
          ? 'bg-gray-900 border-gray-800 shadow-2xl shadow-gray-900/20'
          : 'bg-white border-gray-100 shadow-sm'
      }`}
    >
      {/* Popular badge */}
      {featured && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-gradient-to-r from-amber-400 to-amber-500 text-gray-900 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg">
            Most Popular
          </span>
        </div>
      )}

      <div className="p-6 pt-8">
        {/* Label */}
        <div className="flex items-center justify-between mb-4">
          <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${featured ? 'text-gray-400' : 'text-gray-400'}`}>
            {label}
          </span>
          {!featured && (
            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full uppercase tracking-wide">
              Best Value
            </span>
          )}
        </div>

        {/* Price */}
        <div className="mb-1">
          <div className="flex items-end gap-1">
            <span className={`text-[28px] font-black leading-none ${featured ? 'text-amber-400' : 'text-[#4A90E2]'}`}>
              ₹
            </span>
            <span className={`text-5xl font-black leading-none ${featured ? 'text-white' : 'text-gray-900'}`}>
              {price.toLocaleString('en-IN')}
            </span>
            <span className={`text-sm font-bold mb-1 ${featured ? 'text-gray-400' : 'text-gray-400'}`}>
              /{plan.id === 'annual' ? 'year' : 'mo'}
            </span>
          </div>
          {plan.id === 'annual' && (
            <p className={`text-xs font-semibold mt-1 ${featured ? 'text-gray-400' : 'text-gray-400'}`}>
              ₹{perMonth}/month · billed annually
            </p>
          )}
        </div>

        {/* Billing & savings */}
        <p className={`text-[11px] font-bold mt-3 mb-5 ${featured ? 'text-amber-400/80' : 'text-emerald-600'}`}>
          {savings}
        </p>

        {/* CTA button */}
        <button
          onClick={onSelect}
          disabled={loading}
          className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed ${
            featured
              ? 'bg-gradient-to-r from-[#4A90E2] to-[#3a7fd4] text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50'
              : 'bg-gray-900 text-white hover:bg-gray-800'
          }`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Processing…
            </span>
          ) : ctaLabel}
        </button>
      </div>
    </div>
  )
}
