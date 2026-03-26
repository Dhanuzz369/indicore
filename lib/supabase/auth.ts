// lib/supabase/auth.ts
import { createClient } from './client'

// ── SIGN UP ───────────────────────────────────────────────────────
export async function signUp(email: string, password: string, name: string) {
  const supabase = createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name } },
  })
  if (error) throw error
  // Return object shaped like Appwrite user (adds $id shim)
  const user = data.user!
  return { ...user, $id: user.id, name: user.user_metadata?.full_name || name }
}

// ── SIGN IN ───────────────────────────────────────────────────────
export async function signIn(email: string, password: string) {
  const supabase = createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data.session
}

// ── GOOGLE OAUTH ──────────────────────────────────────────────────
export function signInWithGoogle() {
  const supabase = createClient()
  supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/auth/callback?next=/onboarding` },
  })
}

// ── SIGN OUT ──────────────────────────────────────────────────────
export async function signOut() {
  const supabase = createClient()
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

// ── GET CURRENT USER ──────────────────────────────────────────────
// Returns null if not authenticated.
// Adds $id shim so all pages using user.$id continue to work.
export async function getCurrentUser() {
  const supabase = createClient()
  // getSession() reads from the signed cookie — no network call, no 504 risk.
  // RLS on Supabase tables enforces real security; client-side auth is for UX only.
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return null
  const user = session.user
  return {
    ...user,
    $id: user.id,
    name: user.user_metadata?.full_name || '',
  }
}

// ── PASSWORD RECOVERY ─────────────────────────────────────────────
export async function sendPasswordRecovery(email: string) {
  const supabase = createClient()
  const redirectTo = `${window.location.origin}/reset-password`
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
  if (error) throw error
}

// Supabase reset-password flow: user clicks email link → lands on /reset-password
// with access_token in URL hash → Supabase SDK auto-sets session → call updateUser.
// userId and secret params are unused (kept for API compat with existing page).
export async function confirmPasswordRecovery(
  _userId: string,
  _secret: string,
  password: string
) {
  const supabase = createClient()
  const { error } = await supabase.auth.updateUser({ password })
  if (error) throw error
}

// ── NO-OPS (Appwrite cookie workarounds — not needed in Supabase) ──
export function setSessionCookie() {}
export function clearSessionCookie() {}
