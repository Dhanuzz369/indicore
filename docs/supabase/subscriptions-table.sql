-- ─────────────────────────────────────────────────────────────────────────────
-- Table: subscriptions
-- Purpose: Tracks user subscription state after Razorpay payment.
--
-- Deploy: Supabase Dashboard → SQL Editor → paste this → Run
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status              text        NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'cancelled')),
  plan                text        NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'monthly', 'annual')),
  started_at          timestamptz NOT NULL DEFAULT now(),
  expires_at          timestamptz,
  razorpay_order_id   text,
  razorpay_payment_id text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can only read their own subscription
CREATE POLICY "Users can view own subscription"
  ON public.subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role (used by our API routes) handles inserts/updates
-- No INSERT/UPDATE policy for authenticated role — done server-side only

-- ── Auto-update updated_at ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
