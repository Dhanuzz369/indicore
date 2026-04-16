'use client'
export const dynamic = 'force-dynamic'

// ─────────────────────────────────────────────────────────────────────────────
// Razorpay Standard Checkout Integration
// Flow:
//   1. User clicks "Get Access"
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
  ChevronLeft, Check, Crown, Zap, BookOpen,
  BarChart3, Target, Brain, Flame, Sparkles, ShieldCheck, AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'

// ── Razorpay checkout.js global type ─────────────────────────────────────────
// Loaded via <script src="https://checkout.razorpay.com/v1/checkout.js">
declare global {
  interface Window {
    Razorpay: new (options: RazorpayCheckoutOptions) => RazorpayInstance
  }
}

interface RazorpayCheckoutOptions {
  /** Your Razorpay Key ID (rzp_test_xxx or rzp_live_xxx) */
  key: string
  /** Amount in paise — must match the server order amount */
  amount: number
  /** ISO currency code — must be 'INR' */
  currency: string
  /** Your company / product name shown in the checkout modal */
  name: string
  /** Short description shown under the name */
  description: string
  /** Razorpay order ID from Step 1 (order_Jxxxxxx) */
  order_id: string
  /**
   * Called after a successful payment.
   * NEVER trust this alone — always verify server-side using the signature.
   */
  handler: (response: {
    razorpay_payment_id: string  // e.g. "pay_Jxxxxxx"
    razorpay_order_id:   string  // echoes order_id
    razorpay_signature:  string  // HMAC-SHA256 for verification
  }) => void
  prefill?: {
    name?:    string
    email?:   string
    contact?: string
  }
  notes?: Record<string, string>
  theme?: {
    color?: string  // hex — tints the checkout modal
  }
  modal?: {
    ondismiss?:      () => void   // user closed without paying
    escape?:         boolean      // allow ESC to close (default true)
    backdropclose?:  boolean      // allow backdrop click to close (default false)
    confirm_close?:  boolean      // ask "Are you sure?" before closing
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

// ── Feature list ─────────────────────────────────────────────────────────────
const FEATURES = [
  { icon: BookOpen,    text: 'Practice 1000+ curated PYQ questions' },
  { icon: BarChart3,   text: 'Deep analytics after every test' },
  { icon: Target,      text: 'Identify weak concepts instantly' },
  { icon: Zap,         text: 'Clear action plan after every test' },
  { icon: Brain,       text: 'AI-powered intelligence engine' },
  { icon: Flame,       text: 'Streak tracking & consistency tools' },
  { icon: Sparkles,    text: 'Flashcards for rapid revision' },
  { icon: ShieldCheck, text: 'Unlimited full-length mock tests' },
]

// ── Plan config ───────────────────────────────────────────────────────────────
// Amount here is for display only — server is the source of truth for paise value.
const PLANS = {
  annual: {
    id:        'annual' as const,
    label:     'Annual Plan',
    price:     1788,    // ₹1,788/yr  (₹149 × 12)
    perMonth:  149,
    savings:   'Save ₹600 vs monthly',
    featured:  false,
    ctaLabel:  'Get Annual Access',
  },
  monthly: {
    id:        'monthly' as const,
    label:     'Monthly Plan',
    price:     199,
    perMonth:  199,
    savings:   'Full flexibility, cancel anytime',
    featured:  true,
    ctaLabel:  'Get Monthly Access',
  },
} as const

type PlanId = keyof typeof PLANS

// ── Page component ────────────────────────────────────────────────────────────
export default function PricingPage() {
  const router = useRouter()
  const [user, setUser]           = useState<{ name: string; email: string } | null>(null)
  const [loading, setLoading]     = useState<PlanId | null>(null)
  const [scriptReady, setScriptReady] = useState(false)

  // ── Load Razorpay checkout.js once ─────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return
    if ((window as Window & typeof globalThis & { Razorpay?: unknown }).Razorpay) {
      setScriptReady(true)
      return
    }
    const existing = document.getElementById('rzp-checkout-js')
    if (existing) {
      existing.addEventListener('load', () => setScriptReady(true))
      return
    }
    const script       = document.createElement('script')
    script.id          = 'rzp-checkout-js'
    script.src         = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async       = true
    script.onload      = () => setScriptReady(true)
    script.onerror     = () => console.error('[Razorpay] checkout.js failed to load')
    document.body.appendChild(script)
  }, [])

  // ── Fetch user info for checkout prefill ───────────────────────────────────
  useEffect(() => {
    getCurrentUser()
      .then(u => { if (u) setUser({ name: u.name ?? '', email: u.email ?? '' }) })
      .catch(() => {})
  }, [])

  // ── Main purchase handler ─────────────────────────────────────────────────
  const handlePurchase = useCallback(async (planId: PlanId) => {
    if (!scriptReady) {
      toast.error('Payment gateway is still loading — please try again in a moment.')
      return
    }
    if (!window.Razorpay) {
      toast.error('Razorpay checkout could not be loaded. Check your internet connection.')
      return
    }

    setLoading(planId)

    try {
      // ── Step 1: Create order server-side ──────────────────────────────────
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
        orderId:  string
        amount:   number
        currency: string
        keyId:    string
        plan:     string
        planName: string
      } = await orderRes.json()

      // ── Step 2: Open Razorpay checkout modal ──────────────────────────────
      const options: RazorpayCheckoutOptions = {
        key:         order.keyId,        // rzp_test_xxx or rzp_live_xxx
        amount:      order.amount,       // paise from server — don't use client value
        currency:    order.currency,     // 'INR'
        name:        'Indicore',
        description: order.planName,
        order_id:    order.orderId,      // "order_Jxxxxxx"
        prefill: {
          name:  user?.name  ?? '',
          email: user?.email ?? '',
        },
        notes: {
          plan: planId,
        },
        theme: {
          color: '#4A90E2',
        },
        modal: {
          backdropclose:  false,    // prevent accidental close by clicking backdrop
          escape:         true,
          confirm_close:  true,     // ask "Are you sure?" before closing mid-payment
          ondismiss: () => {
            setLoading(null)
          },
        },

        // ── Step 3: Handle successful payment ──────────────────────────────
        // These three fields must be sent to your server for signature verification.
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

            toast.success('Welcome to Indicore Plus! Your subscription is now active.')
            router.push('/dashboard')
          } catch (verifyErr: unknown) {
            const msg = verifyErr instanceof Error ? verifyErr.message : 'Verification error'
            // Payment was received by Razorpay but our verification failed.
            // The user should contact support with their payment ID.
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

      // ── Handle payment failure (card declined, UPI timeout etc.) ──────────
      rzp.on('payment.failed', (response) => {
        const { code, description, reason } = response.error
        console.error('[payment.failed]', response.error)
        toast.error(
          `Payment failed: ${description || reason || 'Unknown error'} (${code})`,
          { duration: 6000 }
        )
        setLoading(null)
      })

      rzp.open()

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      toast.error(msg)
      setLoading(null)
    }
  }, [scriptReady, user, router])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#FDFDFD] pb-32">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
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

          {/* Promo banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3.5 flex items-start gap-3">
            <span className="text-xl shrink-0 mt-0.5">🎁</span>
            <p className="text-xs font-semibold text-amber-800 leading-snug">
              We are <span className="font-black">free till 25th May 2026.</span> Buy before 24th May 2026 to lock in the discounted rate.
            </p>
          </div>

          {/* Hero */}
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

          {/* Plan cards */}
          <div className="space-y-4">
            {(Object.values(PLANS) as typeof PLANS[PlanId][]).map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                loading={loading === plan.id}
                disabled={loading !== null && loading !== plan.id}
                onSelect={() => handlePurchase(plan.id)}
              />
            ))}
          </div>

          {/* Features */}
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6">
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

          {/* Test mode notice (visible in dev / when using test keys) */}
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

          {/* Trust footer */}
          <div className="text-center space-y-2 pt-2 pb-4">
            <div className="flex items-center justify-center gap-5 flex-wrap">
              {['Secure Payment', '100% Safe', 'Cancel Anytime'].map(t => (
                <div key={t} className="flex items-center gap-1.5">
                  <Check className="h-3 w-3 text-emerald-500" />
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{t}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-gray-300 font-medium">
              Powered by Razorpay · UPI, Debit/Credit Cards, Net Banking & Wallets accepted
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}

// ── PlanCard ──────────────────────────────────────────────────────────────────
function PlanCard({
  plan, loading, disabled, onSelect,
}: {
  plan: typeof PLANS[PlanId]
  loading:  boolean
  disabled: boolean
  onSelect: () => void
}) {
  const { featured, label, price, perMonth, savings, ctaLabel, id } = plan

  return (
    <div
      className={`relative rounded-[2rem] border transition-all ${
        featured
          ? 'bg-gray-900 border-gray-800 shadow-2xl shadow-gray-900/20'
          : 'bg-white border-gray-100 shadow-sm'
      }`}
    >
      {featured && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
          <span className="bg-gradient-to-r from-amber-400 to-amber-500 text-gray-900 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg whitespace-nowrap">
            Most Popular
          </span>
        </div>
      )}

      <div className="p-6 pt-8">
        {/* Label row */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
            {label}
          </span>
          {!featured && (
            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full uppercase tracking-wide">
              Best Value
            </span>
          )}
        </div>

        {/* Price */}
        <div className="mb-1 flex items-end gap-1">
          <span className={`text-2xl font-black leading-none ${featured ? 'text-amber-400' : 'text-[#4A90E2]'}`}>₹</span>
          <span className={`text-5xl font-black leading-none ${featured ? 'text-white' : 'text-gray-900'}`}>
            {perMonth}
          </span>
          <span className={`text-sm font-bold mb-1 ${featured ? 'text-gray-400' : 'text-gray-400'}`}>/mo</span>
        </div>

        {id === 'annual' && (
          <p className="text-xs font-semibold text-gray-400 mt-1">
            ₹{price.toLocaleString('en-IN')} billed annually
          </p>
        )}

        <p className={`text-[11px] font-bold mt-2 mb-5 ${featured ? 'text-amber-400/80' : 'text-emerald-600'}`}>
          {savings}
        </p>

        {/* CTA */}
        <button
          onClick={onSelect}
          disabled={loading || disabled}
          className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${
            featured
              ? 'bg-gradient-to-r from-[#4A90E2] to-[#3a7fd4] text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40'
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
