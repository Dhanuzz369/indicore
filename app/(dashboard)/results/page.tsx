'use client'
export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { ResultsView } from '@/components/results/ResultsView'
import { Loader2 } from 'lucide-react'

function ResultsContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session') ?? ''
  const replayMode = searchParams.get('replay') === 'true'
  return <ResultsView sessionId={sessionId} replayMode={replayMode} />
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<div className="p-20 text-center"><Loader2 className="h-10 w-10 animate-spin mx-auto text-[#FF6B00]" /></div>}>
      <ResultsContent />
    </Suspense>
  )
}
