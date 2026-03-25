'use client'

import { useState } from 'react'
import { X, BookOpen, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createNote } from '@/lib/appwrite/queries'
import { getCurrentUser } from '@/lib/appwrite/auth'
import type { Subject } from '@/types'

interface NoteEditorProps {
  prefillFront: string
  sourceQuestionId?: string
  subjects: Subject[]
  onClose: () => void
  onSaved?: () => void
}

export function NoteEditor({ prefillFront, sourceQuestionId, subjects, onClose, onSaved }: NoteEditorProps) {
  const [front, setFront] = useState(prefillFront)
  const [back, setBack] = useState('')
  const [subject, setSubject] = useState(subjects[0]?.Name ?? '')
  const [topic, setTopic] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!front.trim() || !back.trim()) {
      toast.error('Both front and back are required.')
      return
    }
    setSaving(true)
    try {
      const user = await getCurrentUser()
      if (!user) { toast.error('Please log in.'); setSaving(false); return }
      await createNote({
        user_id: user.$id,
        front: front.trim(),
        back: back.trim(),
        subject: subject || 'General',
        topic: topic.trim(),
        source_question_id: sourceQuestionId,
      })
      toast.success('Note saved!')
      onSaved?.()
      onClose()
    } catch (err: any) {
      console.error('[NoteEditor] save failed:', err)
      const msg = err?.message || err?.response?.message || 'Unknown error'
      toast.error(`Failed to save note: ${msg}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-lg p-7 animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-orange-50 rounded-xl flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <h3 className="font-black text-gray-900 text-base">Save as Note</h3>
              <p className="text-xs text-gray-400 font-medium">Add to your revision deck</p>
            </div>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-1.5">Front (Question / Topic)</label>
            <textarea
              value={front}
              onChange={e => setFront(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/30 focus:border-[#FF6B00] resize-none"
              placeholder="What is the question or topic?"
            />
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-1.5">Back (Your Answer / Mnemonic)</label>
            <textarea
              value={back}
              onChange={e => setBack(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/30 focus:border-[#FF6B00] resize-none"
              placeholder="Your own explanation, memory hook, or key points..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-1.5">Subject</label>
              <select
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/30 focus:border-[#FF6B00]"
              >
                {subjects.map(s => <option key={s.$id} value={s.Name}>{s.Name}</option>)}
                {subjects.length === 0 && <option value="General">General</option>}
              </select>
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-1.5">Topic (optional)</label>
              <input
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="e.g. Mughal Empire"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/30 focus:border-[#FF6B00]"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 h-12 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !front.trim() || !back.trim()}
            className="flex-1 h-12 rounded-xl bg-[#FF6B00] hover:bg-[#FF8C00] text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-orange-100"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Note'}
          </button>
        </div>
      </div>
    </div>
  )
}
