'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/supabase/auth'
import { getSubjects, createNote } from '@/lib/supabase/queries'
import { toast } from 'sonner'
import { ArrowLeft, Loader2 } from 'lucide-react'
import type { Subject } from '@/types'

export default function NewNotePage() {
  const router = useRouter()
  const [userId, setUserId] = useState('')
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [subject, setSubject] = useState('')
  const [topic, setTopic] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getCurrentUser().then(user => {
      if (!user) { router.push('/login'); return }
      setUserId(user.$id)
    })
    getSubjects().then(res => {
      const subs = res.documents as unknown as Subject[]
      setSubjects(subs)
      if (subs.length > 0) setSubject(subs[0].Name)
    })
  }, [router])

  const handleSave = async () => {
    if (!front.trim() || !back.trim()) { toast.error('Front and back are required.'); return }
    setSaving(true)
    try {
      await createNote({ user_id: userId, front: front.trim(), back: back.trim(), subject: subject || 'General', topic: topic.trim() })
      toast.success('Note saved!')
      router.push('/notes')
    } catch (err: any) {
      console.error('[NewNote] save failed:', err)
      const msg = err?.message || err?.response?.message || 'Unknown error'
      toast.error(`Failed to save note: ${msg}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F9FC]">
      <div className="max-w-2xl mx-auto px-4 md:px-6 py-8 space-y-6">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-gray-900 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <div>
          <h1 className="text-2xl font-black text-gray-900">New Note</h1>
          <p className="text-sm text-gray-500 mt-1">Create a flashcard for revision</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Front — Question / Topic</label>
            <textarea
              value={front}
              onChange={e => setFront(e.target.value)}
              rows={4}
              placeholder="What is the question or concept?"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30 focus:border-[#4A90E2] resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Back — Your Answer / Mnemonic</label>
            <textarea
              value={back}
              onChange={e => setBack(e.target.value)}
              rows={5}
              placeholder="Your own explanation, key points, or memory hook..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30 focus:border-[#4A90E2] resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Subject</label>
              <select
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30 focus:border-[#4A90E2]"
              >
                {subjects.map(s => <option key={s.$id} value={s.Name}>{s.Name}</option>)}
                {subjects.length === 0 && <option value="General">General</option>}
              </select>
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Topic (optional)</label>
              <input
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="e.g. Mughal Empire"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4A90E2]/30 focus:border-[#4A90E2]"
              />
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving || !front.trim() || !back.trim()}
            className="w-full h-14 rounded-2xl bg-[#4A90E2] hover:bg-[#3a7fd4] text-white font-black text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-100 mt-2"
          >
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save Note'}
          </button>
        </div>
      </div>
    </div>
  )
}
