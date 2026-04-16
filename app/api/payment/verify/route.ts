// app/api/payment/verify/route.ts
//
// Step 3 of Razorpay Standard Checkout:
//   After payment succeeds on the client, verify authenticity server-side
//   using HMAC-SHA256 signature before activating the subscription.
//
// Signature formula (from Razorpay docs):
//   HMAC_SHA256(razorpay_order_id + "|" + razorpay_payment_id, key_secret)
//
// Razorpay docs: https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/#step-3-handle-the-payment-success

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

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

  // ── 2. Parse request ──────────────────────────────────────────────────────
  let razorpay_order_id: string
  let razorpay_payment_id: string
  let razorpay_signature: string
  let plan: string

  try {
    const body = await req.json()
    razorpay_order_id   = body.razorpay_order_id
    razorpay_payment_id = body.razorpay_payment_id
    razorpay_signature  = body.razorpay_signature
    plan                = body.plan

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !plan) {
      return NextResponse.json({ error: 'Missing required payment fields' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // ── 3. Verify Razorpay signature ──────────────────────────────────────────
  // This is the ONLY way to confirm the payment is genuine.
  // Do NOT skip this step or trust client-side payment_id alone.
  const generatedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex')

  if (generatedSignature !== razorpay_signature) {
    console.error('[verify] Signature mismatch — possible tampered request', {
      order: razorpay_order_id,
      payment: razorpay_payment_id,
    })
    return NextResponse.json({ error: 'Payment verification failed — invalid signature' }, { status: 400 })
  }

  // ── 4. Activate subscription in database ─────────────────────────────────
  const now = new Date()
  const expiresAt = plan === 'annual'
    ? new Date(now.getFullYear() + 1, now.getMonth(),     now.getDate()).toISOString()
    : new Date(now.getFullYear(),     now.getMonth() + 1, now.getDate()).toISOString()

  // Use service role to bypass RLS — this write happens server-side only
  const adminSupabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: { getAll: () => [], setAll: () => {} },
      auth:    { persistSession: false },
    }
  )

  const { error: dbError } = await adminSupabase
    .from('subscriptions')
    .upsert(
      {
        user_id:             user.id,
        status:              'active',
        plan,
        started_at:          now.toISOString(),
        expires_at:          expiresAt,
        razorpay_order_id,
        razorpay_payment_id,
      },
      { onConflict: 'user_id' }
    )

  if (dbError) {
    // Payment succeeded but DB write failed — log for manual recovery.
    // Do NOT return an error to the user; payment was real.
    console.error('[verify] DB upsert failed (payment was successful):', {
      dbError,
      user_id: user.id,
      razorpay_order_id,
      razorpay_payment_id,
    })
  }

  return NextResponse.json({
    success:   true,
    plan,
    expiresAt,
    message:   'Subscription activated successfully',
  })
}
