import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * INDICORE PROXY
 *
 * Handles authentication and route protection for the entire application.
 * Runs before every request using Next.js 16's proxy.ts convention.
 *
 * WHY "indicore_session" COOKIE:
 * Appwrite's own session cookie (a_session_*) is set by the Appwrite Cloud server
 * (e.g., sgp.cloud.appwrite.io) and is scoped to that domain, NOT to localhost
 * or your deployed domain. This means the Edge middleware can never read it.
 *
 * Solution: After every successful login/signup, our auth.ts sets a lightweight
 * "indicore_session" cookie on the user's actual domain (localhost / your domain).
 * This proxy reads that cookie to determine auth status.
 */

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ─────────────────────────────────────────────────────────────────
  // 1. CHECK AUTHENTICATION STATUS
  // ─────────────────────────────────────────────────────────────────
  // We use our own "indicore_session" cookie which is set client-side
  // after every successful Appwrite login/signup.

  const sessionCookie = request.cookies.get('indicore_session')
  const isAuthenticated = !!sessionCookie?.value

  // ─────────────────────────────────────────────────────────────────
  // 2. DEFINE ROUTE CATEGORIES
  // ─────────────────────────────────────────────────────────────────

  // Auth routes: if already logged in → bounce to dashboard
  const isAuthRoute =
    pathname.startsWith('/login') || pathname.startsWith('/signup')

  // Protected routes: must be authenticated to access
  // NOTE: /onboarding is intentionally excluded from here.
  // After Google OAuth, Appwrite redirects to /onboarding BEFORE our
  // indicore_session cookie is set. The onboarding page itself calls
  // getCurrentUser() and redirects to /login if no valid Appwrite session
  // exists, so it is self-guarded at the component level.
  const isProtectedRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/quiz') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/results')

  // ─────────────────────────────────────────────────────────────────
  // 3. HANDLE PROTECTED ROUTES
  // ─────────────────────────────────────────────────────────────────

  if (isProtectedRoute && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // ─────────────────────────────────────────────────────────────────
  // 4. HANDLE AUTH ROUTES
  // ─────────────────────────────────────────────────────────────────

  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // ─────────────────────────────────────────────────────────────────
  // 5. ALLOW ALL OTHER ROUTES
  // ─────────────────────────────────────────────────────────────────

  return NextResponse.next()
}

/**
 * PROXY CONFIGURATION
 */
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)$).*)',
  ],
}
