'use client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const INTERVAL_MS = 30_000 // refresh every 30 seconds

export default function AdminAutoRefresh() {
  const router = useRouter()
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [countdown, setCountdown] = useState(INTERVAL_MS / 1000)

  useEffect(() => {
    const refreshTimer = setInterval(() => {
      router.refresh()
      setLastUpdated(new Date())
      setCountdown(INTERVAL_MS / 1000)
    }, INTERVAL_MS)

    const countdownTimer = setInterval(() => {
      setCountdown(c => (c <= 1 ? INTERVAL_MS / 1000 : c - 1))
    }, 1000)

    return () => {
      clearInterval(refreshTimer)
      clearInterval(countdownTimer)
    }
  }, [router])

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Live</span>
      </div>
      <span className="text-[10px] text-gray-500 font-medium">
        Updated {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        {' · '}next in {countdown}s
      </span>
    </div>
  )
}
