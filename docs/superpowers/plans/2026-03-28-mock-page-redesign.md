# Mock Test Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the tabbed quiz page (mock / PYQ / subject practice) with a single linear page showing: Previous Sessions → Weak Subject Strip → Full Length Mocks — all INDICORE_MOCK only.

**Architecture:** Single `QuizSetupContent` component, three `<section>` zones rendered top-to-bottom. Sessions fetched on mount via `listTestSessions`; weak subjects derived client-side from parsed `analytics` JSON — no extra DB call. Retake uses existing `getQuestionsByIds`. All PYQ/subject-practice code deleted.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind CSS, Supabase JS client, Zustand quiz store, sonner toasts, lucide-react icons.

---

## File Map

| File | Action | What changes |
|---|---|---|
| `app/(dashboard)/quiz/page.tsx` | **Rewrite** | Remove tabs, PYQ, subject-practice; add 3 zones with sessions + weak strip + full mocks |
| `lib/supabase/queries.ts` | **No change** | `getQuestionsByIds` already exists and is exported — retake handler uses it directly |

---

## Task 1: Rewrite `app/(dashboard)/quiz/page.tsx`

**Files:**
- Modify: `app/(dashboard)/quiz/page.tsx` (full rewrite — 887 lines → ~230 lines)

### Context for implementer

The existing file lives at `app/(dashboard)/quiz/page.tsx`. It is 887 lines. Keep the outer `export default function PracticePage()` wrapper with its `<Suspense>` — only rewrite the inner `QuizSetupContent` function and all supporting code.

Key existing functions/imports to **keep** (same logic, same signatures):
- `shuffleArray<T>` utility — keep as-is
- `handleStartMock` — keep logic (unchanged, reads `mock.subject_weights`, calls `getQuestions`)
- `getSubjectAccent` — **delete** (no longer needed)
- `formatTimerPreview` — **delete** (no longer needed)
- `getDifficultyStyle` — **delete** (no longer needed)

Existing imports to **keep:**
- `listMocks`, `getSubjectsWithMockCounts`, `getQuestions` from `@/lib/supabase/queries`
- `getCurrentUser` from `@/lib/supabase/auth`
- `useQuizStore` from `@/store/quiz-store`
- `Mock`, `Question` from `@/types`
- `Loader2`, `ArrowRight` from `lucide-react`
- `Skeleton` from `@/components/ui/skeleton`
- `toast` from `sonner`

New imports to **add:**
- `listTestSessions`, `getQuestionsByIds` from `@/lib/supabase/queries`
- `TestSession` from `@/types`
- `RotateCcw`, `Eye`, `Zap` from `lucide-react`

Imports to **remove:**
- `getSubjectsWithCounts` (PYQ subject list — no longer needed)
- `useSearchParams` (tabs + tab URL param removed)
- `LayoutGrid`, `FileText`, `Sparkles`, `X`, `Clock`, `Target`, `ChevronRight`, `Search` from lucide (only `Loader2`, `ArrowRight`, `RotateCcw`, `Eye`, `Zap`, `LayoutGrid` remain)

> Note: Keep `LayoutGrid` for the header icon.

**Quiz store `setTestMode` takes a boolean** — pass `true` for all modes (not a string). This is consistent with all existing calls in the file.

**`getCurrentUser()` returns `{ $id: string, name: string, ... } | null`** — use `user.$id` as the userId for `listTestSessions`.

**`getQuestionsByIds(ids: string[])` already exists** in `lib/supabase/queries.ts` at line 126 — import and use directly. No changes to queries.ts needed.

**AnalyticsResult shape** (defined locally in `lib/analytics/engine.ts`, not exported — define inline):
```typescript
interface SubjectStat {
  subject: string
  correct: number
  total: number
}
interface ParsedAnalytics {
  subjectStats?: SubjectStat[]
}
```

---

- [ ] **Step 1: Write the new file**

Replace the entire contents of `app/(dashboard)/quiz/page.tsx` with:

```tsx
'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import {
  listMocks,
  getSubjectsWithMockCounts,
  getQuestions,
  listTestSessions,
  getQuestionsByIds,
} from '@/lib/supabase/queries'
import { getCurrentUser } from '@/lib/supabase/auth'
import { useQuizStore } from '@/store/quiz-store'
import { toast } from 'sonner'
import { Loader2, ArrowRight, LayoutGrid, RotateCcw, Eye, Zap } from 'lucide-react'
import type { Question, Mock, TestSession } from '@/types'
import { Skeleton } from '@/components/ui/skeleton'

// ── Helpers ──────────────────────────────────────────────────────────────────

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
}

// Inline shape — AnalyticsResult is not exported from engine.ts
interface SubjectStat {
  subject: string
  correct: number
  total: number
}
interface ParsedAnalytics {
  subjectStats?: SubjectStat[]
}

// ── Main component ────────────────────────────────────────────────────────────

type MockSubjectWithCount = { $id: string; Name: string; count: number }

function QuizSetupContent() {
  const router = useRouter()
  const { setQuestions, setTestMode, setPaperLabel, setPracticeTimerTotal } = useQuizStore()

  // Zone 3 — full-length mocks
  const [mocks, setMocks] = useState<Mock[]>([])
  const [loadingMocks, setLoadingMocks] = useState(true)

  // Needed for weak-drill name → UUID resolution
  const [mockSubjects, setMockSubjects] = useState<MockSubjectWithCount[]>([])

  // Per-card / per-chip loading id
  const [loadingCardId, setLoadingCardId] = useState<string | null>(null)

  // Zone 1 — previous sessions
  const [mockSessions, setMockSessions] = useState<TestSession[]>([])
  const [loadingSessions, setLoadingSessions] = useState(true)

  // Zone 2 — weak subjects (derived client-side)
  const [weakSubjects, setWeakSubjects] = useState<{ name: string; accuracy: number }[]>([])
  const [weakDrillLoading, setWeakDrillLoading] = useState<string | null>(null)

  useEffect(() => {
    // Fetch full-length mocks
    listMocks()
      .then(r => setMocks(r.documents))
      .catch(() => toast.error('Failed to load mocks'))
      .finally(() => setLoadingMocks(false))

    // Fetch mock subjects for name→UUID resolution in weak drill
    getSubjectsWithMockCounts()
      .then(r => setMockSubjects(r.documents as unknown as MockSubjectWithCount[]))
      .catch(() => {})

    // Fetch last 5 INDICORE_MOCK sessions + derive weak subjects
    getCurrentUser().then(user => {
      if (!user) { setLoadingSessions(false); return }
      listTestSessions({ userId: user.$id, examType: 'INDICORE_MOCK', sort: 'newest', limit: 5 })
        .then(r => {
          setMockSessions(r.documents)
          // Derive weak subjects client-side — no extra DB call
          const accMap: Record<string, { correct: number; total: number }> = {}
          for (const session of r.documents) {
            try {
              const analytics: ParsedAnalytics = JSON.parse(session.analytics)
              for (const stat of analytics.subjectStats ?? []) {
                if (!accMap[stat.subject]) accMap[stat.subject] = { correct: 0, total: 0 }
                accMap[stat.subject].correct += stat.correct
                accMap[stat.subject].total += stat.total
              }
            } catch {
              // skip malformed analytics
            }
          }
          const weak = Object.entries(accMap)
            .filter(([, v]) => v.total >= 5)
            .map(([name, v]) => ({ name, accuracy: Math.round((v.correct / v.total) * 100) }))
            .sort((a, b) => a.accuracy - b.accuracy)
            .slice(0, 3)
          setWeakSubjects(weak)
        })
        .catch(() => toast.error('Failed to load sessions'))
        .finally(() => setLoadingSessions(false))
    })
  }, [])

  // ── Zone 1: Retake a previous session ──────────────────────────────────────
  const handleRetake = async (session: TestSession) => {
    setLoadingCardId(session.$id)
    try {
      const ids: string[] = JSON.parse(session.question_ids ?? '[]')
      if (!ids.length) { toast.error('No question IDs saved for this session.'); setLoadingCardId(null); return }
      const result = await getQuestionsByIds(ids)
      if (!result.documents.length) { toast.error('Questions not found.'); setLoadingCardId(null); return }
      useQuizStore.getState().resetQuiz()
      const shuffled = shuffleArray(result.documents as unknown as Question[])
      setQuestions(shuffled)
      setTestMode(true)
      setPracticeTimerTotal(0)
      setPaperLabel((session.paper_label ?? 'Mock') + ' · Retake')
      router.push('/quiz/session?id=' + crypto.randomUUID())
    } catch {
      toast.error('Failed to start retake')
      setLoadingCardId(null)
    }
  }

  // ── Zone 2: Weak subject drill ─────────────────────────────────────────────
  const handleWeakSubjectDrill = async (subjectName: string) => {
    const subject = mockSubjects.find(s => s.Name === subjectName)
    if (!subject) { toast.error('Subject not found'); return }
    setWeakDrillLoading(subjectName)
    try {
      const result = await getQuestions({ examType: 'INDICORE_MOCK', subjectId: subject.$id, limit: 40 })
      if (!result.documents.length) { toast.error('No questions found for this subject.'); setWeakDrillLoading(null); return }
      useQuizStore.getState().resetQuiz()
      const shuffled = shuffleArray(result.documents as unknown as Question[])
      setQuestions(shuffled)
      setTestMode(true)
      setPracticeTimerTotal(0)
      setPaperLabel(`${subjectName} · Weak Area Drill · ${shuffled.length}Q`)
      router.push('/quiz/session?id=' + crypto.randomUUID())
    } catch {
      toast.error('Failed to start drill')
      setWeakDrillLoading(null)
    }
  }

  // ── Zone 3: Start a full-length mock ───────────────────────────────────────
  const handleStartMock = async (mock: Mock) => {
    setLoadingCardId(mock.$id)
    try {
      useQuizStore.getState().resetQuiz()
      const batches = await Promise.all(
        mock.subject_weights.map(weight =>
          getQuestions({
            examType: 'INDICORE_MOCK',
            subjectId: weight.subjectId,
            limit: weight.count * 2,
          }).then(result => {
            const batch = shuffleArray(result.documents as unknown as Question[])
            return batch.slice(0, weight.count)
          })
        )
      )
      const all = shuffleArray(batches.flat())
      if (!all.length) { toast.error('No mock questions available yet.'); setLoadingCardId(null); return }
      setQuestions(all)
      setTestMode(true)
      setPracticeTimerTotal(0)
      setPaperLabel(mock.name)
      router.push('/quiz/session?id=' + crypto.randomUUID())
    } catch {
      toast.error('Failed to start mock test')
      setLoadingCardId(null)
    }
  }

  const fullLengthMocks = mocks.filter(m => m.subject_weights.length > 1)

  return (
    <div className="min-h-screen bg-[#FDFDFD] pb-32">

      {/* HEADER */}
      <div className="max-w-7xl mx-auto px-6 pt-10 pb-6">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 bg-blue-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
            <LayoutGrid className="h-6 w-6" />
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">Mock Tests</h1>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 mt-8 space-y-16">

        {/* ── ZONE 1: PREVIOUS SESSIONS ── */}
        <section>
          <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6">Previous Sessions</h2>

          {loadingSessions ? (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-48 w-64 flex-none rounded-[2rem]" />
              ))}
            </div>
          ) : mockSessions.length === 0 ? (
            <div className="bg-white rounded-[2rem] border border-gray-100 p-10 text-center">
              <p className="text-sm font-bold text-gray-500">
                Complete your first mock to see your history here.
              </p>
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {mockSessions.map(session => (
                <div
                  key={session.$id}
                  className="flex-none w-64 bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 flex flex-col gap-3"
                >
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
                    {formatDate(session.submitted_at)}
                  </p>
                  <p className="text-sm font-black text-gray-900 leading-snug line-clamp-2">
                    {session.paper_label}
                  </p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-black text-gray-900">{session.score}%</span>
                    <span className="text-xs font-bold text-gray-400">
                      {session.correct}/{session.total_questions} correct
                    </span>
                  </div>
                  <div className="flex gap-2 mt-auto">
                    <button
                      onClick={() => router.push('/results?session=' + session.$id)}
                      className="flex-1 h-10 rounded-xl border border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-600 hover:border-blue-200 hover:text-blue-600 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Eye className="h-3.5 w-3.5" /> Review
                    </button>
                    <button
                      onClick={() => handleRetake(session)}
                      disabled={loadingCardId === session.$id}
                      className="flex-1 h-10 rounded-xl bg-[#4A90E2] text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60"
                    >
                      {loadingCardId === session.$id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <><RotateCcw className="h-3.5 w-3.5" /> Retake</>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── ZONE 2: WEAK SUBJECT STRIP ── */}
        {mockSessions.length > 0 && weakSubjects.length > 0 && (
          <section>
            <div className="bg-blue-50 rounded-[2rem] p-6 border border-blue-100">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="h-4 w-4 text-blue-600" />
                <h2 className="text-sm font-black text-blue-900 uppercase tracking-widest">
                  Focus on Your Weak Areas
                </h2>
              </div>
              <p className="text-xs text-blue-600 font-semibold mb-4">
                Based on your last {mockSessions.length} mock session{mockSessions.length > 1 ? 's' : ''}
              </p>
              <div className="flex gap-3 flex-wrap">
                {weakSubjects.map(ws => (
                  <button
                    key={ws.name}
                    onClick={() => handleWeakSubjectDrill(ws.name)}
                    disabled={weakDrillLoading === ws.name}
                    className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white border border-blue-200 text-sm font-black text-gray-900 hover:border-blue-400 hover:shadow-md transition-all disabled:opacity-60"
                  >
                    {weakDrillLoading === ws.name ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        {ws.name}
                        <span className="text-blue-600">{ws.accuracy}%</span>
                        <ArrowRight className="h-4 w-4 text-blue-400" />
                      </>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── ZONE 3: FULL LENGTH MOCKS ── */}
        <section>
          <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6">Full Length Mocks</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loadingMocks ? (
              [1, 2, 3].map(i => <Skeleton key={i} className="h-64 rounded-[2.5rem]" />)
            ) : fullLengthMocks.length === 0 ? (
              <div className="col-span-3 bg-white rounded-[2.5rem] border border-gray-100 p-10 text-center">
                <p className="text-sm font-bold text-gray-500">Full-length mocks coming soon</p>
                <p className="text-xs text-gray-400 mt-1">
                  Multi-subject mock tests will appear here once configured
                </p>
              </div>
            ) : (
              fullLengthMocks.map((mock, idx) => {
                const theme = idx === 0 ? 'blue' : idx === 1 ? 'black' : 'gray'
                return (
                  <div
                    key={mock.$id}
                    className="relative bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden p-8 group hover:shadow-xl hover:border-blue-100 transition-all flex flex-col"
                  >
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1 font-mono">
                      INDICORE MOCK
                    </p>
                    <h3 className="text-2xl font-black text-gray-900 mb-1">{mock.name}</h3>
                    <p className="text-xs text-gray-400 font-semibold mb-6">{mock.description}</p>
                    <div className="grid grid-cols-3 gap-4 mb-8 mt-auto">
                      <div>
                        <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1">Questions</p>
                        <p className="text-sm font-black text-gray-900">100</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1">Duration</p>
                        <p className="text-sm font-black text-gray-900">2 Hr</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1">Marks</p>
                        <p className="text-sm font-black text-gray-900">200</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleStartMock(mock)}
                      disabled={loadingCardId === mock.$id}
                      className={`h-16 w-full rounded-2xl flex items-center justify-center gap-3 font-black text-[11px] uppercase tracking-widest transition-all disabled:opacity-60 ${
                        theme === 'black'
                          ? 'bg-black text-white hover:bg-gray-800 shadow-lg shadow-gray-200'
                          : theme === 'gray'
                            ? 'bg-gray-800 text-white hover:bg-gray-700 shadow-lg shadow-gray-200'
                            : 'bg-[#4A90E2] text-white hover:bg-blue-600 shadow-lg shadow-blue-100'
                      }`}
                    >
                      {loadingCardId === mock.$id ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <>Attempt Test <ArrowRight className="h-5 w-5" /></>
                      )}
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </section>

      </main>
    </div>
  )
}

export default function PracticePage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-gray-400 text-sm flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading...
        </div>
      }
    >
      <QuizSetupContent />
    </Suspense>
  )
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
cd /Users/dhanush/Desktop/INDICORE/indicore/.claude/worktrees/pensive-turing
export PATH="$PATH:/opt/homebrew/bin"
npx tsc --noEmit 2>&1 | grep -E "quiz/page|error" | head -30
```

Expected: zero lines containing `quiz/page` errors. If errors appear, fix them:
- `Property '$id' does not exist` → the `TestSession` type from `@/types` has `$id: string` ✓
- `getQuestionsByIds is not exported` → it IS exported at line 126 of queries.ts ✓
- `setTestMode(true)` type error → `setTestMode` takes `boolean` ✓
- `question_ids` does not exist → `TestSession.question_ids?: string` is defined in types/index.ts ✓

- [ ] **Step 3: Commit**

```bash
cd /Users/dhanush/Desktop/INDICORE/indicore/.claude/worktrees/pensive-turing
git add "app/(dashboard)/quiz/page.tsx"
git commit -m "$(cat <<'EOF'
feat(quiz): redesign mock page — 3-zone linear layout, no tabs

Remove subject-wise mock, subject practice, and PYQ tabs entirely.
Replace with: Zone 1 (last 5 INDICORE_MOCK sessions, horizontal scroll,
Retake + Review), Zone 2 (weak subject strip derived client-side from
session analytics), Zone 3 (full-length multi-subject mocks only).
No PYQ questions ever loaded on this page.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

## Spec Coverage Self-Check

| Spec requirement | Covered by |
|---|---|
| Remove subject-wise mock section | Step 1 — entire mock config panel deleted |
| Remove subject practice section | Step 1 — `activeTab === 'subject'` block deleted |
| Remove PYQ tab / UPSC_PRE content | Step 1 — `PAPER_OPTIONS`, `activeTab === 'full'` deleted |
| Zone 1: last 5 INDICORE_MOCK sessions | `listTestSessions({ examType: 'INDICORE_MOCK', limit: 5 })` |
| Horizontal scroll cards | `flex gap-4 overflow-x-auto` wrapper |
| Card: label, date, score%, correct/total | `paper_label`, `formatDate(submitted_at)`, `score`, `correct/total_questions` |
| Review button → `/results?session=ID` | `router.push('/results?session=' + session.$id)` |
| Retake button → re-fetch original IDs | `getQuestionsByIds(JSON.parse(session.question_ids))` |
| 3 skeleton cards while loading | `[1,2,3].map(i => <Skeleton .../>)` |
| Empty state message | `"Complete your first mock..."` |
| Zone 2 hidden when 0 sessions | `{mockSessions.length > 0 && weakSubjects.length > 0 && ...}` |
| Weak subjects derived client-side | `accMap` loop over `analytics.subjectStats` |
| Min 5 questions filter | `.filter(([, v]) => v.total >= 5)` |
| Bottom 3 subjects by accuracy | `.sort((a,b) => a.accuracy - b.accuracy).slice(0, 3)` |
| Chip click → INDICORE_MOCK drill | `handleWeakSubjectDrill` → `getQuestions({ examType: 'INDICORE_MOCK', subjectId, limit: 40 })` |
| Per-chip spinner | `weakDrillLoading === ws.name` |
| Zone 3: multi-subject mocks only | `mocks.filter(m => m.subject_weights.length > 1)` |
| Full-length mock start handler | `handleStartMock` (unchanged logic) |
| No tabs | No `activeTab` state, no tab switcher UI |
| TypeScript zero errors | Step 2 |
| State removed (activeTab, subjects, etc.) | All removed in Step 1 rewrite |
| State added (mockSessions, weakSubjects, etc.) | All added in Step 1 rewrite |

---

## Success Criteria Checklist

- [ ] Page renders with zero tabs — single vertical scroll
- [ ] Previous sessions load from DB (INDICORE_MOCK only), show as horizontal scroll
- [ ] Weak subject chips derived from session analytics (no extra DB call)
- [ ] Clicking a weak subject chip starts a session with INDICORE_MOCK questions only
- [ ] Retake correctly re-fetches the original question set via `getQuestionsByIds`
- [ ] Full-length multi-subject mocks still start correctly
- [ ] No PYQ questions are ever loaded on this page
- [ ] TypeScript check passes with zero errors in `quiz/page.tsx`
