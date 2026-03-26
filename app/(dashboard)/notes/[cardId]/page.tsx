'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getNoteById, updateNote, deleteNote, getSubjects } from '@/lib/supabase/queries'
import { toast } from 'sonner'
import { ArrowLeft, Trash2, Pencil, Loader2, Save, X } from 'lucide-react'
import type { Note, Subject } from '@/types'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function CardDetailPage() {
  const { cardId } = useParams() as { cardId: string }
  const router = useRouter()
  const [note, setNote] = useState<Note | null>(null)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [editing, setEditing] = useState(false)
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [subject, setSubject] = useState('')
  const [topic, setTopic] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getNoteById(cardId), getSubjects()]).then(([n, subRes]) => {
      if (!n) { router.push('/notes'); return }
      setNote(n)
      setFront(n.front)
      setBack(n.back)
      setSubject(n.subject)
      setTopic(n.topic)
      setSubjects(subRes.documents as unknown as Subject[])
    }).catch(() => {
      toast.error('Failed to load note.')
      router.push('/notes')
    }).finally(() => setLoading(false))
  }, [cardId, router])

  const handleSave = async () => {
    if (!front.trim() || !back.trim()) { toast.error('Front and back are required.'); return }
    setSaving(true)
    try {
      const updated = await updateNote(cardId, { front: front.trim(), back: back.trim(), subject, topic: topic.trim() })
      setNote(updated)
      setEditing(false)
      toast.success('Note updated.')
    } catch {
      toast.error('Failed to update note.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteNote(cardId)
      toast.success('Note deleted.')
      router.push('/notes')
    } catch {
      toast.error('Failed to delete note.')
      setDeleting(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 text-[#FF6B00] animate-spin" /></div>
  if (!note) return null

  const isDue = new Date(note.next_review_at) <= new Date()

  return (
    <div className="min-h-screen bg-[#F8F9FC]">
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-8 space-y-6">

        {/* Nav */}
        <div className="flex items-center justify-between">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-gray-900 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <div className="flex items-center gap-2">
            {!editing && (
              <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 text-sm font-bold text-gray-500 hover:text-gray-900 bg-white border border-gray-200 px-3 py-1.5 rounded-xl transition-colors">
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
            )}
            <button onClick={() => setShowDeleteConfirm(true)} className="flex items-center gap-1.5 text-sm font-bold text-red-400 hover:text-red-600 bg-white border border-gray-200 px-3 py-1.5 rounded-xl transition-colors">
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          </div>
        </div>

        {/* Card content */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {editing ? (
              <>
                <select value={subject} onChange={e => setSubject(e.target.value)} className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/30">
                  {subjects.map(s => <option key={s.$id} value={s.Name}>{s.Name}</option>)}
                </select>
                <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="Topic (optional)" className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/30" />
              </>
            ) : (
              <>
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-orange-50 text-orange-600">{note.subject}</span>
                {note.topic && <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">{note.topic}</span>}
              </>
            )}
          </div>

          {/* Front */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Front</p>
            {editing ? (
              <textarea value={front} onChange={e => setFront(e.target.value)} rows={3} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/30 resize-none" />
            ) : (
              <p className="text-base font-semibold text-gray-900 leading-relaxed">{note.front}</p>
            )}
          </div>

          {/* Back */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Back</p>
            {editing ? (
              <textarea value={back} onChange={e => setBack(e.target.value)} rows={4} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/30 resize-none" />
            ) : (
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{note.back}</p>
            )}
          </div>

          {editing && (
            <div className="flex gap-3 pt-2">
              <button onClick={() => { setEditing(false); setFront(note.front); setBack(note.back); setSubject(note.subject); setTopic(note.topic) }} className="flex-1 h-11 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors">
                <X className="h-4 w-4" /> Cancel
              </button>
              <button onClick={handleSave} disabled={saving} className="flex-1 h-11 rounded-xl bg-[#FF6B00] hover:bg-[#FF8C00] text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-md shadow-orange-100">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4" /> Save</>}
              </button>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Review Stats</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="text-center">
              <p className={`text-lg font-black ${isDue ? 'text-red-500' : 'text-gray-900'}`}>{isDue ? 'Now' : formatDate(note.next_review_at)}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">Next Review</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-black text-gray-900">{note.interval_days}d</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">Interval</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-black text-gray-900">{note.ease_factor.toFixed(1)}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">Ease Factor</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-black text-gray-900">{note.review_count}</p>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">Reviews</p>
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirmation overlay */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="font-black text-gray-900 text-lg">Delete this note?</h3>
            <p className="text-sm text-gray-500">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 h-11 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 h-11 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
