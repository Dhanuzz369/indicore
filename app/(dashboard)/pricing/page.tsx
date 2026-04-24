'use client'
export const dynamic = 'force-dynamic'

// ─────────────────────────────────────────────────────────────────────────────
// Razorpay Standard Checkout Integration
// Flow:
//   1. User clicks "Start Your Journey"
//   2. Client calls POST /api/payment/create-order  →  gets orderId + amount
//   3. Client opens Razorpay checkout modal (checkout.js)
//   4. User pays via UPI / card / netbanking / wallet
//   5. On success: handler() fires with { payment_id, order_id, signature }
//   6. Client calls POST /api/payment/verify  →  server verifies HMAC signature
//   7. Server activates subscription in DB  →  redirect to dashboard
//   8. On failure: payment.failed event fires with error details
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/supabase/auth'
import {
  ChevronLeft, Check, X, FileText, BarChart3, Clock,
  GraduationCap, IndianRupee, CalendarCheck, Loader2, AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'

// ── Razorpay checkout.js global type ─────────────────────────────────────────
declare global {
  interface Window {
    Razorpay: new (options: RazorpayCheckoutOptions) => RazorpayInstance
  }
}

interface RazorpayCheckoutOptions {
  key: string
  amount: number
  currency: string
  name: string
  description: string
  order_id: string
  handler: (response: {
    razorpay_payment_id: string
    razorpay_order_id:   string
    razorpay_signature:  string
  }) => void
  prefill?: { name?: string; email?: string; contact?: string }
  notes?: Record<string, string>
  theme?: { color?: string }
  modal?: {
    ondismiss?:     () => void
    escape?:        boolean
    backdropclose?: boolean
    confirm_close?: boolean
  }
}

interface RazorpayInstance {
  open: () => void
  on: (event: 'payment.failed', handler: (response: { error: RazorpayError }) => void) => void
}

interface RazorpayError {
  code:        string
  description: string
  source:      string
  step:        string
  reason:      string
  metadata:    { order_id: string; payment_id?: string }
}

// ── Plan config ───────────────────────────────────────────────────────────────
const PLANS = {
  annual: {
    id:       'annual' as const,
    price:    1788,
    perMonth: 149,
    billing:  'Billed Annually',
    badge:    'Valid till UPSC Prelims 2027',
  },
  monthly: {
    id:       'monthly' as const,
    price:    199,
    perMonth: 199,
    billing:  'Billed Monthly',
    badge:    null,
  },
} as const

type PlanId = keyof typeof PLANS

// ── Comparison table data ─────────────────────────────────────────────────────
const COMPARISON_ROWS = [
  {
    feature: 'Full Length Tests',
    Icon:    FileText,
    bold:    'UNLIMITED.',
    desc:    'Unlimited FLTs & Subject Tests',
    others:  'Limited FLTs',
  },
  {
    feature: 'Performance Analysis',
    Icon:    BarChart3,
    bold:    'PERSONALISED.',
    desc:    'Personalised Real-Time Behavioural Analysis',
    others:  'No analysis provided',
  },
  {
    feature: 'Time to Analyse',
    Icon:    Clock,
    bold:    '5 MIN.',
    desc:    '5 minutes (save 60+ hours)',
    others:  '2-3 hours per test (manual)',
  },
  {
    feature: 'Learning Approach',
    Icon:    GraduationCap,
    bold:    'GUIDED.',
    desc:    'Guided focus on weak areas',
    others:  'Only test simulation',
  },
  {
    feature: 'Pricing',
    Icon:    IndianRupee,
    bold:    '₹5/DAY.',
    desc:    'Starting ₹5/day',
    others:  '₹2,000 – ₹3,000',
  },
  {
    feature: 'Validity',
    Icon:    CalendarCheck,
    bold:    'FULL CYCLE.',
    desc:    '1 Complete UPSC Cycle',
    others:  'Only 2-3 months',
  },
]

// ── Razorpay loader ───────────────────────────────────────────────────────────
function waitForRazorpay(timeoutMs = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && window.Razorpay) { resolve(); return }
    const start = Date.now()
    const interval = setInterval(() => {
      if (window.Razorpay) { clearInterval(interval); resolve() }
      else if (Date.now() - start > timeoutMs) {
        clearInterval(interval)
        reject(new Error('Razorpay checkout.js did not load. Please check your internet connection.'))
      }
    }, 100)
  })
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function PricingPage() {
  const router  = useRouter()
  const [user, setUser]       = useState<{ name: string; email: string } | null>(null)
  const [loading, setLoading] = useState<PlanId | null>(null)
  const [selected, setSelected] = useState<PlanId>('annual')

  // Load Razorpay checkout.js eagerly on mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (document.getElementById('rzp-checkout-js')) return
    const script   = document.createElement('script')
    script.id      = 'rzp-checkout-js'
    script.src     = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async   = true
    script.onerror = () => console.error('[Razorpay] checkout.js failed to load')
    document.body.appendChild(script)
  }, [])

  useEffect(() => {
    getCurrentUser()
      .then(u => { if (u) setUser({ name: u.name ?? '', email: u.email ?? '' }) })
      .catch(() => {})
  }, [])

  const handlePurchase = useCallback(async (planId: PlanId) => {
    setLoading(planId)
    try {
      const orderRes = await fetch('/api/payment/create-order', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ plan: planId }),
      })
      if (!orderRes.ok) {
        const err = await orderRes.json().catch(() => ({}))
        throw new Error(err.error || `Server error ${orderRes.status}`)
      }
      const order: {
        orderId: string; amount: number; currency: string
        keyId: string; plan: string; planName: string
      } = await orderRes.json()

      await waitForRazorpay()

      const options: RazorpayCheckoutOptions = {
        key:         order.keyId,
        amount:      order.amount,
        currency:    order.currency,
        name:        'Indicore',
        description: order.planName,
        order_id:    order.orderId,
        prefill:     { name: user?.name ?? '', email: user?.email ?? '' },
        notes:       { plan: planId },
        theme:       { color: '#4A90E2' },
        modal: {
          backdropclose: false,
          escape:        true,
          confirm_close: true,
          ondismiss:     () => setLoading(null),
        },
        handler: async (response) => {
          try {
            const verifyRes = await fetch('/api/payment/verify', {
              method:  'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id:   response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature:  response.razorpay_signature,
                plan:                planId,
              }),
            })
            if (!verifyRes.ok) {
              const err = await verifyRes.json().catch(() => ({}))
              throw new Error(err.error || 'Verification failed')
            }
            toast.success('Welcome to Indicore Pro! Your subscription is now active.')
            router.push('/dashboard')
          } catch (verifyErr: unknown) {
            const msg = verifyErr instanceof Error ? verifyErr.message : 'Verification error'
            toast.error(
              `Payment received (ID: ${response.razorpay_payment_id}) but verification failed. ` +
              `Please contact support at indicoredotai@gmail.com`,
              { duration: 10000 }
            )
            console.error('[verify]', msg, response)
          } finally {
            setLoading(null)
          }
        },
      }

      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', (response) => {
        const { code, description, reason } = response.error
        console.error('[payment.failed]', response.error)
        toast.error(`Payment failed: ${description || reason || 'Unknown error'} (${code})`, { duration: 6000 })
        setLoading(null)
      })
      rzp.open()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      toast.error(msg)
      setLoading(null)
    }
  }, [user, router])

  const isLoading = loading !== null

  return (
    <div className="min-h-screen bg-[#F5F5F7] pb-24">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-8">

        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="p-2 -ml-2 hover:bg-white rounded-full transition-colors inline-flex"
        >
          <ChevronLeft className="h-6 w-6 text-[#4A90E2]" />
        </button>

        {/* ── Hero ── */}
        <div className="text-center space-y-3">
          <h1 className="text-[2.4rem] md:text-5xl font-black text-gray-900 leading-[1.1] tracking-tight">
            Stop guessing.<br />Start improving.
          </h1>
          <p className="text-sm md:text-base text-gray-500 font-medium max-w-sm mx-auto leading-relaxed">
            Most platforms sell you tests. We sell you transformation.<br />
            See how Indicore redefines UPSC preparation.
          </p>
        </div>

        {/* ── Promo banner ── */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3.5 flex items-start gap-3">
          <span className="text-xl shrink-0 mt-0.5">🎁</span>
          <p className="text-xs font-semibold text-amber-800 leading-snug">
            We are <span className="font-black">free till 25th May 2026.</span>{' '}
            Buy before 24th May 2026 to lock in the discounted rate.
          </p>
        </div>

        {/* ── Comparison table ── */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">

          {/* Column headers */}
          <div className="grid grid-cols-[1fr_1.15fr_1fr]">
            {/* Feature header */}
            <div className="px-4 py-3.5 border-b border-gray-100">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Feature</span>
            </div>
            {/* Indicore header — blue highlight */}
            <div className="bg-[#4A90E2] px-4 py-3.5 flex items-center justify-center border-b border-[#3a7fd4]">
              <span className="text-sm font-black text-white tracking-wide">Indicore</span>
            </div>
            {/* Others header */}
            <div className="px-4 py-3.5 border-b border-gray-100 flex items-center justify-center">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center leading-tight">Other Platforms</span>
            </div>
          </div>

          {/* Rows */}
          {COMPARISON_ROWS.map((row, i) => (
            <div
              key={row.feature}
              className={`grid grid-cols-[1fr_1.15fr_1fr] ${i < COMPARISON_ROWS.length - 1 ? 'border-b border-gray-50' : ''}`}
            >
              {/* Feature label */}
              <div className="px-4 py-4 flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 mt-0.5">
                  <row.Icon className="h-3.5 w-3.5 text-gray-400" />
                </div>
                <span className="text-[11px] font-bold text-gray-700 leading-snug pt-0.5">{row.feature}</span>
              </div>

              {/* Indicore value — blue bg */}
              <div className="bg-[#EBF4FF] px-3 py-4 flex flex-col justify-center gap-0.5">
                <div className="flex items-start gap-1.5">
                  <Check className="h-3.5 w-3.5 text-[#4A90E2] shrink-0 mt-[1px]" />
                  <div>
                    <span className="text-[11px] font-black text-[#4A90E2] block leading-snug">{row.bold}</span>
                    <span className="text-[10px] font-medium text-gray-500 leading-snug">{row.desc}</span>
                  </div>
                </div>
              </div>

              {/* Other platforms value */}
              <div className="px-3 py-4 flex items-start gap-1.5 justify-center">
                <X className="h-3.5 w-3.5 text-red-400 shrink-0 mt-[1px]" />
                <span className="text-[10px] font-medium text-gray-400 leading-snug">{row.others}</span>
              </div>
            </div>
          ))}
        </div>

        {/* ── Pricing cards ── */}
        <div className="grid grid-cols-2 gap-4">
          {/* Annual */}
          <button
            onClick={() => setSelected('annual')}
            className={`relative rounded-3xl p-5 text-left transition-all border-2 ${
              selected === 'annual'
                ? 'border-[#4A90E2] bg-white shadow-lg shadow-blue-100'
                : 'border-gray-100 bg-white shadow-sm'
            }`}
          >
            <div className="mb-3">
              <span className="text-[28px] font-black text-gray-900 leading-none">₹149</span>
              <span className="text-xs font-bold text-gray-400">/month</span>
            </div>
            <div className="inline-flex items-center bg-[#EBF4FF] text-[#4A90E2] text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full mb-2">
              Billed Annually
            </div>
            <p className="text-[10px] text-gray-400 font-medium leading-snug">Valid till UPSC Prelims 2027</p>
            {selected === 'annual' && (
              <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-[#4A90E2] flex items-center justify-center">
                <Check className="h-3 w-3 text-white" />
              </div>
            )}
          </button>

          {/* Monthly */}
          <button
            onClick={() => setSelected('monthly')}
            className={`relative rounded-3xl p-5 text-left transition-all border-2 ${
              selected === 'monthly'
                ? 'border-[#4A90E2] bg-white shadow-lg shadow-blue-100'
                : 'border-gray-100 bg-white shadow-sm'
            }`}
          >
            <div className="mb-3">
              <span className="text-[28px] font-black text-gray-900 leading-none">₹199</span>
              <span className="text-xs font-bold text-gray-400">/month</span>
            </div>
            <div className="inline-flex items-center bg-gray-100 text-gray-500 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full mb-2">
              Billed Monthly
            </div>
            <p className="text-[10px] text-gray-400 font-medium leading-snug">Cancel anytime</p>
            {selected === 'monthly' && (
              <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-[#4A90E2] flex items-center justify-center">
                <Check className="h-3 w-3 text-white" />
              </div>
            )}
          </button>
        </div>

        {/* ── Main CTA ── */}
        <div className="space-y-3">
          <button
            onClick={() => handlePurchase(selected)}
            disabled={isLoading}
            className="w-full py-4 rounded-2xl bg-[#4A90E2] text-white font-black text-base tracking-wide shadow-xl shadow-blue-200 hover:bg-[#3a7fd4] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Processing…
              </>
            ) : (
              'Start Your Journey'
            )}
          </button>
          <p className="text-center text-[11px] text-gray-400 font-medium">
            No contracts · Cancel anytime · Full cycle access
          </p>
        </div>

        {/* Dev test-mode notice */}
        {process.env.NODE_ENV === 'development' && (
          <div className="flex items-start gap-2.5 bg-yellow-50 border border-yellow-200 rounded-2xl px-4 py-3">
            <AlertCircle className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-black text-yellow-800">Test Mode</p>
              <p className="text-[11px] text-yellow-700 font-medium mt-0.5">
                Use test card: 4111 1111 1111 1111 · Any future expiry · Any CVV
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
