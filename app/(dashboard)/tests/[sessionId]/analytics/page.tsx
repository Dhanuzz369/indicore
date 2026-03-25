'use client'
export const dynamic = 'force-dynamic'

import { useParams } from 'next/navigation'
import { ResultsView } from '@/components/results/ResultsView'

export default function SessionAnalyticsPage() {
  const { sessionId } = useParams() as { sessionId: string }
  return <ResultsView sessionId={sessionId} replayMode={true} />
}
