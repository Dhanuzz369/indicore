// components/providers/PostHogProvider.tsx
'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useRef, Suspense } from 'react'

function PageviewTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const entryTimeRef = useRef(Date.now())
  const prevPathRef  = useRef(pathname)

  useEffect(() => {
    // Fire session_ended for the previous page before tracking new pageview
    const duration = Math.floor((Date.now() - entryTimeRef.current) / 1000)
    if (prevPathRef.current !== pathname && duration > 2) {
      posthog.capture('session_ended', {
        page: prevPathRef.current,
        duration_seconds: duration,
      })
    }
    prevPathRef.current = pathname
    entryTimeRef.current = Date.now()
    posthog.capture('$pageview', { $current_url: window.location.href })
  }, [pathname, searchParams])

  return null
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
      capture_pageview: false,
      capture_pageleave: true,
      persistence: 'localStorage+cookie',
    })
  }, [])

  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PageviewTracker />
      </Suspense>
      {children}
    </PHProvider>
  )
}
