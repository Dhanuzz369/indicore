// app/api/payment/create-order/route.ts
//
// Step 1 of Razorpay Standard Checkout:
//   Server creates an order → returns order_id + amount + currency + key_id to client.
//   Client never touches key_secret.
//
// Razorpay docs: https://razorpay.com/docs/api/orders/#create-an-order

import { NextRequest, NextResponse } from 'next/server'
import Razorpay from 'razorpay'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// ── Plan definitions ─────────────────────────────────────────────────────────
// Amount must be in the smallest currency unit (paise for INR).
// ₹199 = 19900 paise | ₹1788 = 178800 paise (₹149 × 12)
const PLANS = {
  monthly: {
    amount: 19900,            // ₹199
    currency: 'INR' as const,
    name: 'Indicore Plus — Monthly',
  },
  annual: {
    amount: 178800,           // ₹149 × 12 = ₹1,788
    currency: 'INR' as const,
    name: 'Indicore Plus — Annual',
  },
} as const

type PlanKey = keyof typeof PLANS

export async function POST(req: NextRequest) {
  // ── 1. Auth guard ─────────────────────────────────────────────────────────
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  )
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── 2. Validate plan ──────────────────────────────────────────────────────
  let plan: PlanKey
  try {
    const body = await req.json()
    if (!body.plan || !(body.plan in PLANS)) {
      return NextResponse.json({ error: 'Invalid plan. Must be "monthly" or "annual".' }, { status: 400 })
    }
    plan = body.plan as PlanKey
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const selected = PLANS[plan]

  // ── 3. Create Razorpay order ──────────────────────────────────────────────
  // Razorpay requires RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in env.
  // Get them from: https://dashboard.razorpay.com → Settings → API Keys
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    console.error('[create-order] Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET env vars')
    return NextResponse.json({ error: 'Payment service is temporarily unavailable. Please try again later.' }, { status: 503 })
  }

  const razorpay = new Razorpay({
    key_id:     process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  })

  try {
    // receipt: max 40 chars, must be unique per transaction
    const receipt = `rcpt_${user.id.slice(0, 8)}_${Date.now()}`

    const order = await razorpay.orders.create({
      amount:   selected.amount,   // paise — required
      currency: selected.currency, // 'INR' — required
      receipt:  receipt,           // for your internal tracking
      notes: {
        user_id: user.id,
        plan,
        product: selected.name,
      },
    })

    // Return to client: order_id, amount, currency, key_id (public key only)
    return NextResponse.json({
      orderId:  order.id,        // e.g. "order_Jxxxxxxxxxxxxxx"
      amount:   order.amount,    // paise — echoed back for checkout options
      currency: order.currency,
      keyId:    process.env.RAZORPAY_KEY_ID,  // public key — safe to send
      plan,
      planName: selected.name,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[create-order] Razorpay SDK error:', message)
    return NextResponse.json({ error: 'Failed to create payment order. Please try again.' }, { status: 500 })
  }
}
