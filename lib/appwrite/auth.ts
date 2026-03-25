import { account } from './config'
import { ID, OAuthProvider } from 'appwrite'
import Cookies from 'js-cookie'

// ─────────────────────────────────────────────────────────────────
// SESSION COOKIE HELPER
// ─────────────────────────────────────────────────────────────────
// Appwrite's session cookie is set on the Appwrite Cloud domain (sgp.cloud.appwrite.io),
// NOT on localhost/your domain. This means Next.js proxy.ts (Edge middleware) can't
// see Appwrite's cookie. We solve this by setting our own lightweight
// "indicore_session" cookie after every successful login that proxy.ts can detect.

const SESSION_COOKIE = 'indicore_session'

export function setSessionCookie() {
  Cookies.set(SESSION_COOKIE, '1', {
    expires: 20,      // 20 days
    sameSite: 'Lax',
    secure: false,    // false for localhost; set to true in production over HTTPS
  })
}

export function clearSessionCookie() {
  Cookies.remove(SESSION_COOKIE)
}

// ─────────────────────────────────────────────────────────────────
// SIGN UP with email + password
// account.create() creates the account but NOT a session in latest Appwrite SDK
// We must call createEmailPasswordSession() explicitly to authenticate
// ─────────────────────────────────────────────────────────────────
export async function signUp(email: string, password: string, name: string) {
  // Step 1: Create the account
  const user = await account.create(ID.unique(), email, password, name)

  // Step 2: Create a session so the user is logged in
  await account.createEmailPasswordSession(email, password)

  // Step 3: Set our detectable session cookie for the middleware
  setSessionCookie()

  return user
}

// ─────────────────────────────────────────────────────────────────
// SIGN IN with email + password
// ─────────────────────────────────────────────────────────────────
export async function signIn(email: string, password: string) {
  try {
    // Check if there's already an active session and delete it first
    const currentUser = await account.get()
    if (currentUser) {
      await account.deleteSession('current')
    }
  } catch {
    // No active session, that's fine
  }

  // Create a new session
  const session = await account.createEmailPasswordSession(email, password)

  // Set our detectable session cookie for the middleware
  setSessionCookie()

  return session
}

// ─────────────────────────────────────────────────────────────────
// GOOGLE OAUTH
// Redirects the browser to Google's login page via Appwrite.
// On success, Appwrite creates a session and redirects to successUrl.
// We handle profile creation and setting the session cookie in /onboarding.
// ─────────────────────────────────────────────────────────────────
export function signInWithGoogle() {
  const successUrl = `${window.location.origin}/onboarding`
  const failureUrl = `${window.location.origin}/login`

  account.createOAuth2Session(
    OAuthProvider.Google,
    successUrl,
    failureUrl
  )
}

// ─────────────────────────────────────────────────────────────────
// SIGN OUT
// ─────────────────────────────────────────────────────────────────
export async function signOut() {
  clearSessionCookie()
  return await account.deleteSession('current')
}

// ─────────────────────────────────────────────────────────────────
// GET CURRENT USER (returns null if not authenticated)
// ─────────────────────────────────────────────────────────────────
export async function getCurrentUser() {
  try {
    return await account.get()
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────────────────────────
// FORGOT PASSWORD — sends recovery email via Appwrite
// ─────────────────────────────────────────────────────────────────
export async function sendPasswordRecovery(email: string) {
  const redirectUrl = `${window.location.origin}/reset-password`
  return await account.createRecovery(email, redirectUrl)
}

// ─────────────────────────────────────────────────────────────────
// RESET PASSWORD — confirms recovery with userId + secret from URL
// ─────────────────────────────────────────────────────────────────
export async function confirmPasswordRecovery(
  userId: string,
  secret: string,
  password: string
) {
  return await account.updateRecovery(userId, secret, password)
}