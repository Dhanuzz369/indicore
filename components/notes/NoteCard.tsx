'use client'

import type { Note } from '@/types'
import { Clock, RotateCcw } from 'lucide-react'
import Link from 'next/link'

function formatDueDate(isoString: string): string {
  const due = new Date(isoString)
  const now = new Date()
  const diffMs = due.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays <= 0) return 'Due now'
  if (diffDays === 1) return 'Due tomorrow'
  return `Due in ${diffDays}d`
}

interface NoteCardProps {
  note: Note
}

export function NoteCard({ note }: NoteCardProps) {
  const isDue = new Date(note.next_review_at) <= new Date()

  return (
    <Link href={`/notes/${note.$id}`}>
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-blue-100 transition-all group cursor-pointer flex flex-col gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-blue-50 text-blue-600">
            {note.subject}
          </span>
          {note.topic && (
            <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">
              {note.topic}
            </span>
          )}
        </div>
        <p className="text-sm font-medium text-gray-900 line-clamp-3 leading-relaxed">
          {note.front}
        </p>
        <div className="flex items-center justify-between pt-1 border-t border-gray-50">
          <div className={`flex items-center gap-1 text-[11px] font-bold ${isDue ? 'text-red-500' : 'text-gray-400'}`}>
            <Clock className="h-3 w-3" />
            {formatDueDate(note.next_review_at)}
          </div>
          <div className="flex items-center gap-1 text-[11px] font-bold text-gray-400">
            <RotateCcw className="h-3 w-3" />
            {note.review_count} reviews
          </div>
        </div>
      </div>
    </Link>
  )
}
