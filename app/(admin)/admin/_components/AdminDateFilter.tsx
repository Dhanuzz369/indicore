// app/(admin)/admin/_components/AdminDateFilter.tsx
'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

type Preset = 'today' | '7d' | '30d' | '90d' | 'all'

function toDateStr(d: Date) {
  return d.toISOString().split('T')[0]
}

function presetRange(preset: Preset): { from: string; to: string } | null {
  const now = new Date()
  const to = toDateStr(now)
  if (preset === 'today')  return { from: to, to }
  if (preset === '7d')     return { from: toDateStr(new Date(now.getTime() - 6  * 86400000)), to }
  if (preset === '30d')    return { from: toDateStr(new Date(now.getTime() - 29 * 86400000)), to }
  if (preset === '90d')    return { from: toDateStr(new Date(now.getTime() - 89 * 86400000)), to }
  return null // 'all'
}

export default function AdminDateFilter() {
  const router = useRouter()
  const params = useSearchParams()
  const currentFrom = params.get('from') ?? ''
  const currentTo   = params.get('to')   ?? ''

  const [customFrom, setCustomFrom] = useState(currentFrom)
  const [customTo,   setCustomTo]   = useState(currentTo)

  function activePreset(): Preset | null {
    if (!currentFrom && !currentTo) return 'all'
    const now = toDateStr(new Date())
    if (currentFrom === now && currentTo === now) return 'today'
    const ranges: Preset[] = ['7d', '30d', '90d']
    for (const p of ranges) {
      const r = presetRange(p)!
      if (r.from === currentFrom && r.to === currentTo) return p
    }
    return null // custom
  }

  function applyPreset(preset: Preset) {
    const range = presetRange(preset)
    if (!range) {
      router.push('/admin')
    } else {
      router.push(`/admin?from=${range.from}&to=${range.to}`)
    }
  }

  function applyCustom() {
    if (!customFrom || !customTo) return
    router.push(`/admin?from=${customFrom}&to=${customTo}`)
  }

  const active = activePreset()
  const presets: { key: Preset; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: '7d',    label: '7 days' },
    { key: '30d',   label: '30 days' },
    { key: '90d',   label: '90 days' },
    { key: 'all',   label: 'All time' },
  ]

  return (
    <div className="flex flex-wrap items-center gap-2">
      {presets.map(p => (
        <button
          key={p.key}
          onClick={() => applyPreset(p.key)}
          className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-colors ${
            active === p.key
              ? 'bg-[#4A90E2] text-white'
              : 'bg-white border border-gray-200 text-gray-500 hover:border-[#4A90E2] hover:text-[#4A90E2]'
          }`}
        >
          {p.label}
        </button>
      ))}
      <div className="flex items-center gap-1.5 ml-2">
        <input
          type="date"
          value={customFrom}
          onChange={e => setCustomFrom(e.target.value)}
          className="text-xs border border-gray-200 rounded-xl px-2 py-1.5 text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30"
        />
        <span className="text-gray-400 text-xs">–</span>
        <input
          type="date"
          value={customTo}
          onChange={e => setCustomTo(e.target.value)}
          className="text-xs border border-gray-200 rounded-xl px-2 py-1.5 text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30"
        />
        <button
          onClick={applyCustom}
          disabled={!customFrom || !customTo}
          className="px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider bg-[#1A1C1C] text-white hover:bg-gray-800 disabled:opacity-40 transition-colors"
        >
          Apply
        </button>
      </div>
    </div>
  )
}
