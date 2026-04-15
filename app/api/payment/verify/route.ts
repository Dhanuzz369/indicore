// app/api/payment/verify/route.ts
// Verifies Razorpay payment signature and activates subscription in Supabase.
// Uses HMAC-SHA256 on orderId + "|" + paymentId with RAZORPAY_KEY_SECRET.

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = await req.json()

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !plan) {
      return NextResponse.json({ error: 'Missing payment fields' }, { status: 400 })
    }

    // ── Verify HMAC-SHA256 signature ─────────────────────────────────────────
    const body    = `${razorpay_order_id}|${razorpay_payment_id}`
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest('hex')

    if (expected !== razorpay_signature) {
      console.error('[verify] Signature mismatch')
      return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 })
    }

    // ── Calculate subscription expiry ────────────────────────────────────────
    const now        = new Date()
    const expiresAt  = plan === 'annual'
      ? new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()).toISOString()
      : new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()).toISOString()

    // ── Upsert subscription record ──────────────────────────────────────────
    const { error: upsertError } = await supabase
      .from('subscriptions')
      .upsert({
        user_id:             user.id,
        status:              'active',
        plan,
        started_at:          now.toISOString(),
        expires_at:          expiresAt,
        razorpay_order_id,
        razorpay_payment_id,
      }, { onConflict: 'user_id' })

    if (upsertError) {
      console.error('[verify] Supabase upsert error:', upsertError)
      // Payment succeeded — don't fail the response; log and investigate manually
    }

    return NextResponse.json({ success: true, plan, expiresAt })
  } catch (err) {
    console.error('[verify] Error:', err)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
