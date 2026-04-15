// app/api/payment/create-order/route.ts
// Creates a Razorpay order server-side — never exposes key_secret to client.

import { NextRequest, NextResponse } from 'next/server'
import Razorpay from 'razorpay'
import { createClient } from '@/lib/supabase/server'

const PLANS: Record<string, { amount: number; currency: string; description: string }> = {
  monthly: {
    amount: 49900,        // ₹499 in paise
    currency: 'INR',
    description: 'Indicore Plus — Monthly Plan',
  },
  annual: {
    amount: 299900,       // ₹2,999 in paise
    currency: 'INR',
    description: 'Indicore Plus — Annual Plan',
  },
}

export async function POST(req: NextRequest) {
  try {
    // Auth guard — only logged-in users can initiate payment
    const supabase = createClient()
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
