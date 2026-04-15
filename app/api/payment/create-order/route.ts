// app/api/payment/create-order/route.ts
import { NextRequest, NextResponse } from 'next/server'
import Razorpay from 'razorpay'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const PLANS: Record<string, { amount: number; currency: string; description: string }> = {
  monthly: {
    amount: 19900,        // ₹199 in paise
    currency: 'INR',
    description: 'Indicore Plus — Monthly Plan',
  },
  annual: {
    amount: 178800,       // ₹149 × 12 = ₹1,788 in paise
    currency: 'INR',
    description: 'Indicore Plus — Annual Plan',
  },
}

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

    const { plan } = await req.json()
    if (!plan || !PLANS[plan]) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const razorpay = new Razorpay({
      key_id:     process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    })

    const order = await razorpay.orders.create({
      amount:   PLANS[plan].amount,
      currency: PLANS[plan].currency,
      notes: {
        user_id: user.id,
        plan,
        description: PLANS[plan].description,
      },
    })

    return NextResponse.json({
      orderId:  order.id,
      amount:   order.amount,
      currency: order.currency,
      keyId:    process.env.RAZORPAY_KEY_ID,
      plan,
    })
  } catch (err) {
    console.error('[create-order] Razorpay error:', err)
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }
}
