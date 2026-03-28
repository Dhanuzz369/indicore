'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search } from 'lucide-react'

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
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          id="session-search"
          placeholder="Search by paper name…"
          value={filters.search}
          onChange={e => onChange({ search: e.target.value })}
          className="pl-9 bg-gray-50 border-gray-100 focus:bg-white transition-colors"
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Exam Type */}
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Exam</Label>
          <Select value={filters.examType} onValueChange={v => onChange({ examType: v })}>
            <SelectTrigger className="bg-gray-50 border-gray-100 text-sm h-9" id="filter-exam">
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
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Mode</Label>
          <Select value={filters.mode} onValueChange={v => onChange({ mode: v })}>
            <SelectTrigger className="bg-gray-50 border-gray-100 text-sm h-9" id="filter-mode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modes</SelectItem>
              <SelectItem value="full_length">Full Length</SelectItem>
              <SelectItem value="subject_practice">Subject Practice</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Sort */}
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sort</Label>
          <Select value={filters.sort} onValueChange={v => onChange({ sort: v })}>
            <SelectTrigger className="bg-gray-50 border-gray-100 text-sm h-9" id="filter-sort">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="highest_score">Highest Score</SelectItem>
              <SelectItem value="lowest_score">Lowest Score</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Date From */}
        <div className="space-y-1">
          <Label htmlFor="filter-from" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">From</Label>
          <input
            id="filter-from"
            type="date"
            value={filters.from}
            onChange={e => onChange({ from: e.target.value })}
            className="w-full h-9 rounded-md border border-gray-100 bg-gray-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30 focus:border-[#4A90E2] transition-colors"
          />
        </div>

        {/* Date To */}
        <div className="space-y-1">
          <Label htmlFor="filter-to" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">To</Label>
          <input
            id="filter-to"
            type="date"
            value={filters.to}
            onChange={e => onChange({ to: e.target.value })}
            className="w-full h-9 rounded-md border border-gray-100 bg-gray-50 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30 focus:border-[#4A90E2] transition-colors"
          />
        </div>
      </div>
    </div>
  )
}
