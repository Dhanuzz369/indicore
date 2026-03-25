'use client'
export const dynamic = 'force-dynamic'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

// Results are now shown at /tests/[sessionId]/results after quiz completion.
// This page redirects to My Tests for any stale links.
export default function ResultsPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/tests')
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <Loader2 className="h-8 w-8 text-[#FF6B00] animate-spin" />
    </div>
  )
}
