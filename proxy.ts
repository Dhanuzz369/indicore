// proxy.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getSession() reads from the signed cookie — no network call, no latency.
  // (getUser() hits the Supabase auth server on every request and causes timeouts.)
  const { data: { session } } = await supabase.auth.getSession()
  const { pathname } = request.nextUrl

  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/signup')
  const isProtectedRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/quiz') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/results') ||
    pathname.startsWith('/tests') ||
    pathname.startsWith('/notes') ||
    pathname.startsWith('/intelligence')

  if (isProtectedRoute && !session) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (isAuthRoute && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  // Only run middleware on routes that need auth — skip static assets and API routes
  matcher: [
    '/dashboard(.*)',
    '/quiz(.*)',
    '/profile(.*)',
    '/results(.*)',
    '/tests(.*)',
    '/notes(.*)',
    '/intelligence(.*)',
    '/onboarding(.*)',
    '/login',
    '/signup',
  ],
}
