# Notes & Flashcards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an Anki-style spaced repetition flashcard system so UPSC aspirants can save notes by subject/topic and be prompted to revise them on an adaptive schedule.

**Architecture:** Simplified SM-2 algorithm as a pure client-side function in `lib/srs/engine.ts`. Cards stored in a new Appwrite `notes` collection. Four new Next.js routes under `/notes`. A `NoteEditor` modal added to the quiz session lets aspirants create cards contextually with the question text pre-filled.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, Appwrite (client SDK), shadcn/ui, Lucide icons, Sonner toasts.

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| CREATE | `lib/srs/engine.ts` | Pure SM-2 `computeNextReview()` function |
| MODIFY | `types/index.ts` | Add `Note` interface |
| MODIFY | `lib/appwrite/config.ts` | Add `NOTES` to `COLLECTIONS` |
| MODIFY | `.env.local` | Add `NEXT_PUBLIC_COLLECTION_NOTES` |
| MODIFY | `lib/appwrite/queries.ts` | Add 6 note CRUD + query functions |
| MODIFY | `app/(dashboard)/layout.tsx` | Add Notes nav item with due-count badge |
| CREATE | `components/notes/NoteCard.tsx` | Card tile for the grid on /notes |
| CREATE | `components/notes/NoteEditor.tsx` | Slide-up modal for in-quiz note creation |
| CREATE | `components/notes/FlipCard.tsx` | CSS flip card for revision session |
| CREATE | `components/notes/RatingButtons.tsx` | Again / Hard / Good / Easy buttons |
| CREATE | `app/(dashboard)/notes/page.tsx` | Main hub — due banner + card grid |
| CREATE | `app/(dashboard)/notes/new/page.tsx` | Standalone create-card form |
| CREATE | `app/(dashboard)/notes/review/page.tsx` | Revision session (flip + rate) |
| CREATE | `app/(dashboard)/notes/[cardId]/page.tsx` | View / edit / delete a single card |
| MODIFY | `app/(dashboard)/quiz/session/page.tsx` | Add "+ Note" button + NoteEditor modal |

---

## Task 1: SM-2 Engine + Types + Config

**Files:**
- Create: `lib/srs/engine.ts`
- Modify: `types/index.ts`
- Modify: `lib/appwrite/config.ts`
- Modify: `.env.local`

- [ ] **Step 1: Add `Note` interface to `types/index.ts`**

Append after the existing `QuizFilters` interface:

```typescript
export interface Note {
  $id: string
  $createdAt?: string
  user_id: string
  front: string
  back: string
  subject: string
  topic: string
  source_question_id?: string
  next_review_at: string        // ISO datetime string
  interval_days: number         // starts at 1
  ease_factor: number           // starts at 2.5, floor 1.3
  review_count: number          // starts at 0
  created_at: string
}

export type SRSRating = 'again' | 'hard' | 'good' | 'easy'
```

- [ ] **Step 2: Add `NOTES` collection to `lib/appwrite/config.ts`**

In the `COLLECTIONS` object, add the last line:

```typescript
export const COLLECTIONS = {
  PROFILES:          process.env.NEXT_PUBLIC_COLLECTION_PROFILES!,
  QUESTIONS:         process.env.NEXT_PUBLIC_COLLECTION_QUESTIONS!,
  SUBJECTS:          process.env.NEXT_PUBLIC_COLLECTION_SUBJECTS!,
  ATTEMPTS:          process.env.NEXT_PUBLIC_COLLECTION_ATTEMPTS!,
  STATS:             process.env.NEXT_PUBLIC_COLLECTION_STATS!,
  USER_TEST_SUMMARY: process.env.NEXT_PUBLIC_COLLECTION_USER_TEST_SUMMARY!,
  TEST_SESSIONS:     process.env.NEXT_PUBLIC_COLLECTION_TEST_SESSIONS!,
  REPORTED_ISSUES:   process.env.NEXT_PUBLIC_COLLECTION_REPORTED_ISSUES!,
  NOTES:             process.env.NEXT_PUBLIC_COLLECTION_NOTES!,
}
```

- [ ] **Step 3: Add env var to `.env.local`**

Append to `.env.local`:

```
NEXT_PUBLIC_COLLECTION_NOTES="notes"
```

- [ ] **Step 4: Create `lib/srs/engine.ts`**

```typescript
import type { Note, SRSRating } from '@/types'

export interface SRSResult {
  interval_days: number
  ease_factor: number
  next_review_at: string   // ISO string
}

export function computeNextReview(note: Pick<Note, 'interval_days' | 'ease_factor'>, rating: SRSRating): SRSResult {
  let { interval_days, ease_factor } = note

  switch (rating) {
    case 'again':
      interval_days = 1
      ease_factor = Math.max(1.3, ease_factor - 0.20)
      break
    case 'hard':
      interval_days = Math.max(1, Math.round(interval_days * 1.2))
      ease_factor = Math.max(1.3, ease_factor - 0.15)
      break
    case 'good':
      interval_days = Math.max(1, Math.round(interval_days * ease_factor))
      break
    case 'easy':
      interval_days = Math.max(1, Math.round(interval_days * ease_factor * 1.3))
      ease_factor = ease_factor + 0.15
      break
  }

  const next = new Date()
  next.setDate(next.getDate() + interval_days)

  return {
    interval_days,
    ease_factor: parseFloat(ease_factor.toFixed(2)),
    next_review_at: next.toISOString(),
  }
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no output (clean).

- [ ] **Step 6: Commit**

```bash
git add lib/srs/engine.ts types/index.ts lib/appwrite/config.ts .env.local
git commit -m "feat: add Note type, SRS engine, and notes collection config"
```

---

## Task 2: Appwrite Query Functions

**Files:**
- Modify: `lib/appwrite/queries.ts`

- [ ] **Step 1: Add note query functions to the end of `lib/appwrite/queries.ts`**

```typescript
// ─── NOTES (Flashcards) ─────────────────────────────

export async function createNote(data: {
  user_id: string
  front: string
  back: string
  subject: string
  topic: string
  source_question_id?: string
}): Promise<Note> {
  const now = new Date().toISOString()
  const doc = await databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.NOTES,
    ID.unique(),
    {
      user_id: data.user_id,
      front: data.front,
      back: data.back,
      subject: data.subject,
      topic: data.topic || '',
      source_question_id: data.source_question_id || '',
      next_review_at: now,
      interval_days: 1,
      ease_factor: 2.5,
      review_count: 0,
      created_at: now,
    }
  )
  return doc as unknown as Note
}

export async function getNotesByUser(params: {
  userId: string
  subject?: string
  search?: string
  limit?: number
  offset?: number
}): Promise<{ documents: Note[]; total: number }> {
  const { userId, subject, limit = 50, offset = 0 } = params
  const q: string[] = [Query.equal('user_id', userId), Query.orderDesc('created_at'), Query.limit(limit), Query.offset(offset)]
  if (subject && subject !== 'all') q.push(Query.equal('subject', subject))
  const result = await databases.listDocuments(DATABASE_ID, COLLECTIONS.NOTES, q)
  return result as unknown as { documents: Note[]; total: number }
}

export async function getDueNotes(userId: string): Promise<Note[]> {
  const now = new Date().toISOString()
  const result = await databases.listDocuments(DATABASE_ID, COLLECTIONS.NOTES, [
    Query.equal('user_id', userId),
    Query.lessThanEqual('next_review_at', now),
    Query.orderAsc('next_review_at'),
    Query.limit(200),
  ])
  return result.documents as unknown as Note[]
}

export async function getDueNotesCount(userId: string): Promise<number> {
  const due = await getDueNotes(userId)
  return due.length
}

export async function updateNote(noteId: string, data: Partial<Note>): Promise<Note> {
  const { $id, $createdAt, user_id, created_at, ...rest } = data as any
  const doc = await databases.updateDocument(DATABASE_ID, COLLECTIONS.NOTES, noteId, rest)
  return doc as unknown as Note
}

export async function deleteNote(noteId: string): Promise<void> {
  await databases.deleteDocument(DATABASE_ID, COLLECTIONS.NOTES, noteId)
}

export async function getNoteById(noteId: string): Promise<Note> {
  const doc = await databases.getDocument(DATABASE_ID, COLLECTIONS.NOTES, noteId)
  return doc as unknown as Note
}
```

- [ ] **Step 2: Add `Note` to the import at the top of `lib/appwrite/queries.ts`**

Change:
```typescript
import type { TestSession } from '@/types'
```
To:
```typescript
import type { TestSession, Note } from '@/types'
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no output (clean).

- [ ] **Step 4: Commit**

```bash
git add lib/appwrite/queries.ts
git commit -m "feat: add Appwrite CRUD query functions for notes collection"
```

---

## Task 3: Sidebar Navigation Update

**Files:**
- Modify: `app/(dashboard)/layout.tsx`

- [ ] **Step 1: Add `BookOpen` and `useState`/`useEffect` for due count to the layout**

In `app/(dashboard)/layout.tsx`, make these changes:

**Add `BookOpen` to the lucide import:**
```typescript
import {
  LayoutDashboard,
  Brain,
  BarChart3,
  User,
  LogOut,
  Trophy,
  ChevronRight,
  ClipboardList,
  BookOpen,
} from 'lucide-react'
```

**Add `getCurrentUser` import** (already imported) and add `getDueNotesCount` import:
```typescript
import { getProfile, getDueNotesCount } from '@/lib/appwrite/queries'
```

**Add Notes to the `navigation` array** (insert between My Tests and Results):
```typescript
const navigation = [
  { name: 'Home',     href: '/dashboard', icon: LayoutDashboard },
  { name: 'Practice', href: '/quiz',      icon: Brain },
  { name: 'My Tests', href: '/tests',     icon: ClipboardList },
  { name: 'Notes',    href: '/notes',     icon: BookOpen },
  { name: 'Results',  href: '/results',   icon: BarChart3 },
  { name: 'Profile',  href: '/profile',   icon: User },
]
```

**Add due count state** inside the `DashboardLayout` component, after the existing `loading` state:
```typescript
const [dueCount, setDueCount] = useState(0)
```

**Fetch due count** inside the existing `fetchUserData` function, after `setProfile(...)`:
```typescript
try {
  const count = await getDueNotesCount(user.$id)
  setDueCount(count)
} catch { /* non-critical */ }
```

- [ ] **Step 2: Show badge in desktop sidebar nav**

Replace the desktop `<nav>` link rendering (the `navigation.map` inside `<aside>`) with:

```tsx
{navigation.map(item => {
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
  return (
    <Link
      key={item.name}
      href={item.href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive
          ? 'bg-[#FF6B00] text-white shadow-sm'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }`}
    >
      <item.icon className="h-5 w-5 shrink-0" />
      {item.name}
      {item.name === 'Notes' && dueCount > 0 && (
        <span className={`ml-auto text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${isActive ? 'bg-white/30 text-white' : 'bg-[#FF6B00] text-white'}`}>
          {dueCount > 99 ? '99+' : dueCount}
        </span>
      )}
      {isActive && item.name !== 'Notes' && <ChevronRight className="h-4 w-4 ml-auto opacity-70" />}
      {isActive && item.name === 'Notes' && dueCount === 0 && <ChevronRight className="h-4 w-4 ml-auto opacity-70" />}
    </Link>
  )
})}
```

- [ ] **Step 3: Show badge in mobile bottom nav**

Replace the mobile `<nav>` link rendering with:

```tsx
{navigation.map(item => {
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
  return (
    <Link
      key={item.name}
      href={item.href}
      className="flex flex-col items-center justify-center gap-1 transition-colors relative"
    >
      <div className="relative">
        <item.icon className={`h-5 w-5 ${isActive ? 'text-[#FF6B00]' : 'text-gray-400'}`} />
        {item.name === 'Notes' && dueCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 bg-[#FF6B00] rounded-full text-white text-[8px] font-black flex items-center justify-center">
            {dueCount > 9 ? '9+' : dueCount}
          </span>
        )}
      </div>
      <span className={`text-[10px] font-medium ${isActive ? 'text-[#FF6B00]' : 'text-gray-400'}`}>
        {item.name}
      </span>
      {isActive && (
        <div className="absolute bottom-0 w-8 h-0.5 bg-[#FF6B00] rounded-full" />
      )}
    </Link>
  )
})}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no output (clean).

- [ ] **Step 5: Commit**

```bash
git add "app/(dashboard)/layout.tsx"
git commit -m "feat: add Notes to sidebar navigation with due-count badge"
```

---

## Task 4: NoteCard + NoteEditor Components

**Files:**
- Create: `components/notes/NoteCard.tsx`
- Create: `components/notes/NoteEditor.tsx`

- [ ] **Step 1: Create `components/notes/NoteCard.tsx`**

```tsx
'use client'

import type { Note } from '@/types'
import { BookOpen, Clock, RotateCcw } from 'lucide-react'
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
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-orange-100 transition-all group cursor-pointer flex flex-col gap-3">
        {/* Subject + topic badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-orange-50 text-orange-600">
            {note.subject}
          </span>
          {note.topic && (
            <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">
              {note.topic}
            </span>
          )}
        </div>

        {/* Front text */}
        <p className="text-sm font-medium text-gray-900 line-clamp-3 leading-relaxed">
          {note.front}
        </p>

        {/* Stats row */}
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
```

- [ ] **Step 2: Create `components/notes/NoteEditor.tsx`**

```tsx
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
    } catch {
      toast.error('Failed to save note.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-lg p-7 animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">

        {/* Header */}
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
          {/* Front */}
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

          {/* Back */}
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

          {/* Subject + Topic row */}
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

        {/* Actions */}
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
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no output (clean).

- [ ] **Step 4: Commit**

```bash
git add components/notes/NoteCard.tsx components/notes/NoteEditor.tsx
git commit -m "feat: add NoteCard tile and NoteEditor modal components"
```

---

## Task 5: FlipCard + RatingButtons Components

**Files:**
- Create: `components/notes/FlipCard.tsx`
- Create: `components/notes/RatingButtons.tsx`

- [ ] **Step 1: Create `components/notes/FlipCard.tsx`**

```tsx
'use client'

import { useState } from 'react'

interface FlipCardProps {
  front: string
  back: string
  onFlipped?: () => void
}

export function FlipCard({ front, back, onFlipped }: FlipCardProps) {
  const [flipped, setFlipped] = useState(false)

  const handleFlip = () => {
    if (!flipped) {
      setFlipped(true)
      onFlipped?.()
    }
  }

  return (
    <div className="w-full perspective-1000" style={{ perspective: '1000px' }}>
      <div
        className="relative w-full transition-transform duration-500 cursor-pointer"
        style={{
          transformStyle: 'preserve-3d',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          minHeight: '280px',
        }}
        onClick={handleFlip}
      >
        {/* Front face */}
        <div
          className="absolute inset-0 bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8 flex flex-col items-center justify-center text-center"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <p className="text-[10px] font-black uppercase tracking-widest text-orange-500 mb-4">Question / Topic</p>
          <p className="text-lg font-semibold text-gray-900 leading-relaxed">{front}</p>
          {!flipped && (
            <p className="absolute bottom-6 text-xs text-gray-400 font-medium">Tap to reveal answer</p>
          )}
        </div>

        {/* Back face */}
        <div
          className="absolute inset-0 bg-gray-900 rounded-[2rem] p-8 flex flex-col items-center justify-center text-center"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <p className="text-[10px] font-black uppercase tracking-widest text-orange-400 mb-4">Your Answer</p>
          <p className="text-lg font-semibold text-white leading-relaxed">{back}</p>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `components/notes/RatingButtons.tsx`**

```tsx
'use client'

import type { SRSRating } from '@/types'

interface RatingButtonsProps {
  onRate: (rating: SRSRating) => void
  disabled?: boolean
}

const RATINGS: { rating: SRSRating; label: string; sublabel: string; className: string }[] = [
  { rating: 'again', label: 'Again',  sublabel: '<1d',   className: 'bg-red-500 hover:bg-red-600 shadow-red-100' },
  { rating: 'hard',  label: 'Hard',   sublabel: '~2d',   className: 'bg-orange-500 hover:bg-orange-600 shadow-orange-100' },
  { rating: 'good',  label: 'Good',   sublabel: 'normal', className: 'bg-blue-500 hover:bg-blue-600 shadow-blue-100' },
  { rating: 'easy',  label: 'Easy',   sublabel: 'longer', className: 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-100' },
]

export function RatingButtons({ onRate, disabled }: RatingButtonsProps) {
  return (
    <div className="grid grid-cols-4 gap-3 w-full">
      {RATINGS.map(({ rating, label, sublabel, className }) => (
        <button
          key={rating}
          onClick={() => onRate(rating)}
          disabled={disabled}
          className={`flex flex-col items-center justify-center py-3 rounded-2xl text-white font-black shadow-lg transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
        >
          <span className="text-sm">{label}</span>
          <span className="text-[10px] opacity-70 font-semibold mt-0.5">{sublabel}</span>
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no output (clean).

- [ ] **Step 4: Commit**

```bash
git add components/notes/FlipCard.tsx components/notes/RatingButtons.tsx
git commit -m "feat: add FlipCard and RatingButtons components for revision session"
```

---

## Task 6: `/notes/new` — Create Card Page

**Files:**
- Create: `app/(dashboard)/notes/new/page.tsx`

- [ ] **Step 1: Create `app/(dashboard)/notes/new/page.tsx`**

```tsx
'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/appwrite/auth'
import { getSubjects, createNote } from '@/lib/appwrite/queries'
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
    } catch {
      toast.error('Failed to save note.')
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
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/30 focus:border-[#FF6B00] resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Back — Your Answer / Mnemonic</label>
            <textarea
              value={back}
              onChange={e => setBack(e.target.value)}
              rows={5}
              placeholder="Your own explanation, key points, or memory hook..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/30 focus:border-[#FF6B00] resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Subject</label>
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
              <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Topic (optional)</label>
              <input
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="e.g. Mughal Empire"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/30 focus:border-[#FF6B00]"
              />
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving || !front.trim() || !back.trim()}
            className="w-full h-14 rounded-2xl bg-[#FF6B00] hover:bg-[#FF8C00] text-white font-black text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-100 mt-2"
          >
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save Note'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no output (clean).

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/notes/new/page.tsx"
git commit -m "feat: add /notes/new create card page"
```

---

## Task 7: `/notes` — Main Hub Page

**Files:**
- Create: `app/(dashboard)/notes/page.tsx`

- [ ] **Step 1: Create `app/(dashboard)/notes/page.tsx`**

```tsx
'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/appwrite/auth'
import { getNotesByUser, getDueNotes, getSubjects } from '@/lib/appwrite/queries'
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
        getNotesByUser({ userId, subject: filterSubject, limit: 100 }),
        getDueNotes(userId),
      ])
      setNotes(notesRes.documents)
      setDueCount(due.length)
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
            <div className="w-10 h-10 bg-[#FF6B00] rounded-xl flex items-center justify-center shadow-md shadow-orange-100">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">My Notes</h1>
              <p className="text-sm text-gray-500 font-medium">Flashcards for spaced repetition revision</p>
            </div>
          </div>
          <button
            onClick={() => router.push('/notes/new')}
            className="flex items-center gap-2 bg-[#FF6B00] hover:bg-[#FF8C00] text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-orange-100 transition-colors"
          >
            <Plus className="h-4 w-4" /> New Note
          </button>
        </div>

        {/* Due for review banner */}
        {dueCount > 0 && (
          <div className="bg-gradient-to-r from-[#FF6B00] to-orange-400 rounded-2xl p-5 flex items-center justify-between shadow-lg shadow-orange-100">
            <div>
              <p className="text-white font-black text-lg">{dueCount} card{dueCount !== 1 ? 's' : ''} due for review</p>
              <p className="text-white/80 text-sm font-medium mt-0.5">Keep your streak going — revise now</p>
            </div>
            <button
              onClick={() => router.push('/notes/review')}
              className="flex items-center gap-2 bg-white text-[#FF6B00] px-5 py-2.5 rounded-xl font-black text-sm hover:bg-orange-50 transition-colors shadow-sm"
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
              className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/30 focus:border-[#FF6B00]"
            />
          </div>
          <select
            value={filterSubject}
            onChange={e => setFilterSubject(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/30 focus:border-[#FF6B00]"
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
            <button onClick={() => router.push('/notes/new')} className="bg-[#FF6B00] hover:bg-[#FF8C00] text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-orange-100 transition-colors">
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no output (clean).

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/notes/page.tsx"
git commit -m "feat: add /notes main hub page with due banner and card grid"
```

---

## Task 8: `/notes/review` — Revision Session

**Files:**
- Create: `app/(dashboard)/notes/review/page.tsx`

- [ ] **Step 1: Create `app/(dashboard)/notes/review/page.tsx`**

```tsx
'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/appwrite/auth'
import { getDueNotes, updateNote } from '@/lib/appwrite/queries'
import { computeNextReview } from '@/lib/srs/engine'
import { FlipCard } from '@/components/notes/FlipCard'
import { RatingButtons } from '@/components/notes/RatingButtons'
import { Loader2, CheckCircle, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import type { Note, SRSRating } from '@/types'

type RatingCount = { again: number; hard: number; good: number; easy: number }

export default function ReviewPage() {
  const router = useRouter()
  const [cards, setCards] = useState<Note[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [counts, setCounts] = useState<RatingCount>({ again: 0, hard: 0, good: 0, easy: 0 })

  useEffect(() => {
    getCurrentUser().then(async user => {
      if (!user) { router.push('/login'); return }
      try {
        const due = await getDueNotes(user.$id)
        setCards(due)
      } catch {
        toast.error('Failed to load review cards.')
      } finally {
        setLoading(false)
      }
    })
  }, [router])

  const handleRate = async (rating: SRSRating) => {
    if (saving) return
    setSaving(true)
    const card = cards[currentIndex]
    const { interval_days, ease_factor, next_review_at } = computeNextReview(card, rating)
    try {
      await updateNote(card.$id, {
        interval_days,
        ease_factor,
        next_review_at,
        review_count: card.review_count + 1,
      })
      setCounts(prev => ({ ...prev, [rating]: prev[rating] + 1 }))
      if (currentIndex + 1 >= cards.length) {
        setDone(true)
      } else {
        setCurrentIndex(i => i + 1)
        setFlipped(false)
      }
    } catch {
      toast.error('Failed to save rating.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 text-[#FF6B00] animate-spin" />
      </div>
    )
  }

  if (cards.length === 0 || done) {
    const total = counts.again + counts.hard + counts.good + counts.easy
    return (
      <div className="min-h-screen bg-[#F8F9FC] flex items-center justify-center p-6">
        <div className="text-center space-y-6 max-w-sm">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="h-10 w-10 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-900">
              {cards.length === 0 ? 'All caught up!' : 'Session Complete!'}
            </h2>
            <p className="text-gray-500 text-sm mt-2">
              {cards.length === 0 ? 'No cards due right now. Check back later.' : `You reviewed ${total} card${total !== 1 ? 's' : ''}.`}
            </p>
          </div>
          {total > 0 && (
            <div className="grid grid-cols-4 gap-2 text-center">
              {(['again', 'hard', 'good', 'easy'] as SRSRating[]).map(r => (
                <div key={r} className="bg-white rounded-xl p-3 border border-gray-100">
                  <p className="text-xl font-black text-gray-900">{counts[r]}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-0.5 capitalize">{r}</p>
                </div>
              ))}
            </div>
          )}
          <button onClick={() => router.push('/notes')} className="bg-[#FF6B00] hover:bg-[#FF8C00] text-white px-8 py-3 rounded-2xl font-black text-sm shadow-lg shadow-orange-100 transition-colors">
            Back to Notes
          </button>
        </div>
      </div>
    )
  }

  const card = cards[currentIndex]
  const progress = ((currentIndex) / cards.length) * 100

  return (
    <div className="min-h-screen bg-[#F8F9FC]">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <button onClick={() => router.push('/notes')} className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-gray-900 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Exit
          </button>
          <span className="text-sm font-black text-gray-500">{currentIndex + 1} / {cards.length}</span>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-[#FF6B00] rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>

        {/* Subject badge */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-orange-50 text-orange-600">{card.subject}</span>
          {card.topic && <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">{card.topic}</span>}
        </div>

        {/* Flip card */}
        <FlipCard front={card.front} back={card.back} onFlipped={() => setFlipped(true)} />

        {/* Rating buttons — only shown after flip */}
        {flipped ? (
          <div className="space-y-3">
            <p className="text-xs font-black uppercase tracking-widest text-gray-400 text-center">How well did you know this?</p>
            <RatingButtons onRate={handleRate} disabled={saving} />
          </div>
        ) : (
          <p className="text-center text-sm text-gray-400 font-medium">Tap the card to reveal the answer</p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no output (clean).

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/notes/review/page.tsx"
git commit -m "feat: add /notes/review spaced repetition session"
```

---

## Task 9: `/notes/[cardId]` — View / Edit / Delete

**Files:**
- Create: `app/(dashboard)/notes/[cardId]/page.tsx`

- [ ] **Step 1: Create `app/(dashboard)/notes/[cardId]/page.tsx`**

```tsx
'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getNoteById, updateNote, deleteNote, getSubjects } from '@/lib/appwrite/queries'
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no output (clean).

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/notes/[cardId]/page.tsx"
git commit -m "feat: add /notes/[cardId] view, edit, and delete page"
```

---

## Task 10: Quiz Session "+ Note" Button Integration

**Files:**
- Modify: `app/(dashboard)/quiz/session/page.tsx`

- [ ] **Step 1: Add imports and state for NoteEditor to `app/(dashboard)/quiz/session/page.tsx`**

Add to the import block at the top:
```typescript
import { NoteEditor } from '@/components/notes/NoteEditor'
```

Also add `getSubjects` to the existing queries import:
```typescript
import {
  saveAttempt, incrementStats, saveUserTestSummary, createTestSession,
  reportIssue, getSubjects
} from '@/lib/appwrite/queries'
```

Add `Subject` to the types import:
```typescript
import type { Question, Subject } from '@/types'
```

Add these state variables inside `TestSessionPage`, after the existing `isReporting` state:
```typescript
const [showNoteModal, setShowNoteModal] = useState(false)
const [subjects, setSubjects] = useState<Subject[]>([])
```

- [ ] **Step 2: Fetch subjects on mount**

Inside `TestSessionPage`, add a new `useEffect` after the existing ones (after the start-timer effect):

```typescript
// ── Load subjects for NoteEditor ──
useEffect(() => {
  getSubjects().then(res => setSubjects(res.documents as unknown as Subject[]))
}, [])
```

- [ ] **Step 3: Add "+ Note" button next to the Report button**

Find the question header row in the JSX (the `{/* Question number + mark tag + Report Flag */}` section). Replace it with:

```tsx
{/* Question number + mark tag + Report Flag + Note */}
<div className="flex items-center justify-between">
  <div className="flex items-center gap-2">
    <span className="bg-[#FF6B00] text-white px-3 py-1 rounded-lg font-bold text-sm shadow-sm">
      Q.{currentIndex + 1}
    </span>
    {testMode && isMarkedCurrent && (
      <span className="flex items-center gap-1 text-xs font-semibold text-purple-600 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-full">
        <Bookmark className="h-3 w-3 fill-purple-500" />
        Marked
      </span>
    )}
  </div>
  <div className="flex items-center gap-2">
    <button
      onClick={() => setShowNoteModal(true)}
      className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-[#FF6B00] transition-colors bg-white px-2.5 py-1.5 rounded-lg border border-gray-100 shadow-sm"
      title="Save this question as a note"
    >
      <BookOpen className="h-3 w-3" />
      Note
    </button>
    <button
      onClick={openReportModal}
      className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-red-500 transition-colors bg-white px-2.5 py-1.5 rounded-lg border border-gray-100 shadow-sm"
      title="Report issue with this question"
    >
      <Flag className="h-3 w-3" />
      Report
    </button>
  </div>
</div>
```

- [ ] **Step 4: Add `BookOpen` to the lucide import in the quiz session file**

Change:
```typescript
import { Loader2, ChevronLeft, ChevronRight, Bookmark, PanelRight, X, House, Flag } from 'lucide-react'
```
To:
```typescript
import { Loader2, ChevronLeft, ChevronRight, Bookmark, PanelRight, X, House, Flag, BookOpen } from 'lucide-react'
```

- [ ] **Step 5: Render `NoteEditor` modal in the JSX**

Add this block just before the `{/* ─── REPORT ISSUE MODAL ─── */}` section (before the closing `</div>`):

```tsx
{/* ─── NOTE EDITOR MODAL ─── */}
{showNoteModal && (
  <NoteEditor
    prefillFront={currentQuestion.question_text}
    sourceQuestionId={currentQuestion.$id}
    subjects={subjects}
    onClose={() => setShowNoteModal(false)}
  />
)}
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no output (clean).

- [ ] **Step 7: Commit**

```bash
git add "app/(dashboard)/quiz/session/page.tsx" components/notes/NoteEditor.tsx
git commit -m "feat: add + Note button to quiz session with NoteEditor modal"
```

---

## Task 11: Push to GitHub for Vercel Deploy

- [ ] **Step 1: Merge worktree branch to main and push**

```bash
cd /Users/dhanush/Desktop/INDICORE/indicore
git merge claude/pensive-turing --ff-only
git push origin main
```

Expected output ends with: `main -> main`

- [ ] **Step 2: Verify Vercel deployment**

Go to the Vercel dashboard and confirm a new deployment is triggered. The build should complete without errors.

**Note:** Before the feature is fully functional in production, you must create the `notes` collection in Appwrite with these attributes:
- `user_id` (String, required)
- `front` (String, size 5000, required)
- `back` (String, size 10000, required)
- `subject` (String, size 200, required)
- `topic` (String, size 200, optional)
- `source_question_id` (String, size 200, optional)
- `next_review_at` (DateTime, required)
- `interval_days` (Float, required)
- `ease_factor` (Float, required)
- `review_count` (Integer, required)
- `created_at` (DateTime, required)

Add indexes: `user_id` (key), `next_review_at` (key) for query performance.

---

## Self-Review

**Spec coverage check:**
- ✅ SM-2 engine with Again/Hard/Good/Easy → Task 1
- ✅ `notes` Appwrite collection + 7 query functions → Task 2
- ✅ Notes sidebar nav item + due badge → Task 3
- ✅ NoteCard tile + NoteEditor modal → Task 4
- ✅ FlipCard + RatingButtons → Task 5
- ✅ `/notes/new` standalone create page → Task 6
- ✅ `/notes` main hub with due banner + filter + grid → Task 7
- ✅ `/notes/review` flip session with progress + summary → Task 8
- ✅ `/notes/[cardId]` view/edit/delete + stats → Task 9
- ✅ Quiz session "+ Note" button + subjects fetch → Task 10
- ✅ Push to GitHub → Task 11

**Type consistency check:**
- `Note` interface defined in Task 1, used consistently as `Note` in all tasks ✅
- `SRSRating` defined in Task 1, used in `computeNextReview`, `RatingButtons`, `ReviewPage` ✅
- `computeNextReview` signature: `(note: Pick<Note, 'interval_days' | 'ease_factor'>, rating: SRSRating) → SRSResult` — matches all call sites ✅
- `createNote`, `getNotesByUser`, `getDueNotes`, `updateNote`, `deleteNote`, `getNoteById` — all defined in Task 2, called correctly in Tasks 6-10 ✅
- `NoteEditor` props: `prefillFront`, `sourceQuestionId`, `subjects`, `onClose`, `onSaved` — defined in Task 4, called correctly in Task 10 ✅

**Placeholder scan:** No TBDs, no "similar to above", all code blocks are complete. ✅
