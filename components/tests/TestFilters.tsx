'use client'

import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'

export interface TestFiltersState {
  search: string
  examType: string
  mode: string
  sort: string
  from: string
  to: string
}

interface TestFiltersProps {
  filters: TestFiltersState
  onChange: (next: Partial<TestFiltersState>) => void
}

export function TestFilters({ filters, onChange }: TestFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const hasActiveFilters = filters.examType !== 'all' || filters.mode !== 'all' || filters.from || filters.to

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
      {/* Search + filter toggle row */}
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-50">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <Input
            id="session-search"
            placeholder="Search by paper name…"
            value={filters.search}
            onChange={e => onChange({ search: e.target.value })}
            className="pl-9 bg-gray-50 border-gray-100 focus:bg-white transition-colors h-9 text-sm"
          />
        </div>

        {/* Sort — always visible */}
        <Select value={filters.sort} onValueChange={v => onChange({ sort: v })}>
          <SelectTrigger className="w-36 bg-gray-50 border-gray-100 text-xs font-semibold h-9 shrink-0" id="filter-sort">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
            <SelectItem value="highest_score">Highest Score</SelectItem>
            <SelectItem value="lowest_score">Lowest Score</SelectItem>
          </SelectContent>
        </Select>

        {/* Filters toggle */}
        <button
          onClick={() => setShowAdvanced(v => !v)}
          className={`shrink-0 flex items-center gap-1.5 px-3 h-9 rounded-xl border text-xs font-bold transition-all ${
            showAdvanced || hasActiveFilters
              ? 'bg-blue-50 border-blue-200 text-[#4A90E2]'
              : 'bg-gray-50 border-gray-100 text-gray-500 hover:border-gray-300'
          }`}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Filters</span>
          {hasActiveFilters && (
            <span className="h-4 w-4 bg-[#4A90E2] text-white text-[9px] font-black rounded-full flex items-center justify-center">
              {[filters.examType !== 'all', filters.mode !== 'all', !!filters.from, !!filters.to].filter(Boolean).length}
            </span>
          )}
        </button>
      </div>

      {/* Advanced filters — collapsible */}
      {showAdvanced && (
        <div className="px-4 py-4 grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-gray-50 bg-gray-50/50">
          {/* Exam Type */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Exam</p>
            <Select value={filters.examType} onValueChange={v => onChange({ examType: v })}>
              <SelectTrigger className="bg-white border-gray-100 text-xs h-9" id="filter-exam">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Exams</SelectItem>
                <SelectItem value="UPSC">UPSC</SelectItem>
                <SelectItem value="TNPSC">TNPSC</SelectItem>
                <SelectItem value="KPSC">KPSC</SelectItem>
                <SelectItem value="MPPSC">MPPSC</SelectItem>
                <SelectItem value="UPPSC">UPPSC</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Mode */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Mode</p>
            <Select value={filters.mode} onValueChange={v => onChange({ mode: v })}>
              <SelectTrigger className="bg-white border-gray-100 text-xs h-9" id="filter-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modes</SelectItem>
                <SelectItem value="full_length">Full Length</SelectItem>
                <SelectItem value="subject_practice">Subject Practice</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date From */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">From</p>
            <input
              id="filter-from"
              type="date"
              value={filters.from}
              onChange={e => onChange({ from: e.target.value })}
              className="w-full h-9 rounded-lg border border-gray-100 bg-white px-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30 focus:border-[#4A90E2] transition-colors"
            />
          </div>

          {/* Date To */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">To</p>
            <input
              id="filter-to"
              type="date"
              value={filters.to}
              onChange={e => onChange({ to: e.target.value })}
              className="w-full h-9 rounded-lg border border-gray-100 bg-white px-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30 focus:border-[#4A90E2] transition-colors"
            />
          </div>

          {/* Clear filters */}
          {hasActiveFilters && (
            <div className="col-span-full flex justify-end">
              <button
                onClick={() => onChange({ examType: 'all', mode: 'all', from: '', to: '' })}
                className="text-xs font-bold text-gray-400 hover:text-red-500 transition-colors"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
