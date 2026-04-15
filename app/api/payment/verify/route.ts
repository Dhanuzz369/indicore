// app/api/payment/verify/route.ts
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
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
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = await req.json()
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !plan) {
      return NextResponse.json({ error: 'Missing payment fields' }, { status: 400 })
    }

    // ── Verify HMAC-SHA256 signature ──────────────────────────────
    const body     = `${razorpay_order_id}|${razorpay_payment_id}`
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest('hex')

    if (expected !== razorpay_signature) {
      return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 })
    }

    // ── Calculate expiry ───────────────────────────────────────────
    const now       = new Date()
    const expiresAt = plan === 'annual'
      ? new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()).toISOString()
      : new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()).toISOString()

    // ── Use service role for upsert (bypasses RLS) ────────────────
    const adminSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { getAll: () => [], setAll: () => {} }, auth: { persistSession: false } }
    )

    await adminSupabase.from('subscriptions').upsert({
      user_id:             user.id,
      status:              'active',
      plan,
      started_at:          now.toISOString(),
      expires_at:          expiresAt,
      razorpay_order_id,
      razorpay_payment_id,
    }, { onConflict: 'user_id' })

    return NextResponse.json({ success: true, plan, expiresAt })
  } catch (err) {
    console.error('[verify] Error:', err)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
