'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/supabase/auth'
import { getNotesByUser, getDueNotes, getSubjects } from '@/lib/supabase/queries'
import { NoteCard } from '@/components/notes/NoteCard'
import { Skeleton } from '@/components/ui/skeleton'
import { BookOpen, Plus, RotateCcw, Search } from 'lucide-react'
import { toast } from 'sonner'
import type { Note, Subject } from '@/types'

export default function NotesPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [dueCount, setDueCount] = useState(0)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterSubject, setFilterSubject] = useState('all')

  useEffect(() => {
    getCurrentUser().then(user => {
      if (!user) { router.push('/login'); return }
      setUserId(user.$id)
    })
    getSubjects().then(res => setSubjects(res.documents as unknown as Subject[]))
  }, [router])

  const fetchNotes = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const [notesRes, due] = await Promise.all([
        getNotesByUser({ userId, subjectFilter: filterSubject === 'all' ? undefined : filterSubject, limit: 100 }),
        getDueNotes(userId),
      ])
      setNotes(notesRes.documents)
      setDueCount(due.documents.length)
    } catch {
      toast.error('Failed to load notes.')
    } finally {
      setLoading(false)
    }
  }, [userId, filterSubject])

  useEffect(() => { fetchNotes() }, [fetchNotes])

  const filtered = search
    ? notes.filter(n => n.front.toLowerCase().includes(search.toLowerCase()) || n.back.toLowerCase().includes(search.toLowerCase()) || n.topic.toLowerCase().includes(search.toLowerCase()))
    : notes

  return (
    <div className="min-h-screen bg-[#F8F9FC]">
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#4A90E2] rounded-xl flex items-center justify-center shadow-md shadow-blue-100">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">My Notes</h1>
              <p className="text-sm text-gray-500 font-medium">Flashcards for spaced repetition revision</p>
            </div>
          </div>
          <button
            onClick={() => router.push('/notes/new')}
            className="flex items-center gap-2 bg-[#4A90E2] hover:bg-[#3a7fd4] text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-blue-100 transition-colors"
          >
            <Plus className="h-4 w-4" /> New Note
          </button>
        </div>

        {/* Due for review banner */}
        {dueCount > 0 && (
          <div className="bg-gradient-to-r from-[#4A90E2] to-blue-400 rounded-2xl p-5 flex items-center justify-between shadow-lg shadow-blue-100">
            <div>
              <p className="text-white font-black text-lg">{dueCount} card{dueCount !== 1 ? 's' : ''} due for review</p>
              <p className="text-white/80 text-sm font-medium mt-0.5">Keep your streak going — revise now</p>
            </div>
            <button
              onClick={() => router.push('/notes/review')}
              className="flex items-center gap-2 bg-white text-[#4A90E2] px-5 py-2.5 rounded-xl font-black text-sm hover:bg-blue-50 transition-colors shadow-sm"
            >
              <RotateCcw className="h-4 w-4" /> Start Review
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search notes..."
              className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30 focus:border-[#4A90E2]"
            />
          </div>
          <select
            value={filterSubject}
            onChange={e => setFilterSubject(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30 focus:border-[#4A90E2]"
          >
            <option value="all">All Subjects</option>
            {subjects.map(s => <option key={s.$id} value={s.Name}>{s.Name}</option>)}
          </select>
        </div>

        {/* Notes grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-44 rounded-2xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
              <BookOpen className="h-10 w-10 text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">No notes yet</h3>
            <p className="text-sm text-gray-500 max-w-xs mx-auto">
              {search || filterSubject !== 'all' ? 'Try adjusting your filters.' : 'Save notes from quiz questions or create one manually.'}
            </p>
            <button onClick={() => router.push('/notes/new')} className="bg-[#4A90E2] hover:bg-[#3a7fd4] text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-blue-100 transition-colors">
              Create First Note
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(note => <NoteCard key={note.$id} note={note} />)}
          </div>
        )}
      </div>
    </div>
  )
}
