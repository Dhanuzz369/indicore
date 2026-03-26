# My Tests Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all broken /tests sub-pages with a clean 3-page system: session list, 4-tab session detail page, and cross-session mistakes aggregator.

**Architecture:** Approach A — flat routes, data fetched once per page mount, 4 tab components share a single state object. Old sub-pages deleted entirely. `TestSessionCard` updated to point to new unified route.

**Tech Stack:** Next.js 14 App Router, Appwrite client SDK, shadcn/ui, Lucide icons, Sonner toasts, Tailwind CSS, `@/lib/formatters`, `@/components/notes/NoteEditor`.

---

## File Map

**Delete:**
- `app/(dashboard)/tests/[sessionId]/results/page.tsx`
- `app/(dashboard)/tests/[sessionId]/analytics/page.tsx`
- `app/(dashboard)/tests/[sessionId]/review/page.tsx`

**Create:**
- `components/tests/QuestionReviewCard.tsx` — shared question card (wrong answers + review all)
- `components/tests/tabs/OverviewTab.tsx` — score hero, subject table, behavior metrics, AI feedback
- `components/tests/tabs/WrongAnswersTab.tsx` — filtered wrong answers with save-as-note
- `components/tests/tabs/ReviewAllTab.tsx` — all questions with filter chips
- `components/tests/tabs/SubtopicDrillTab.tsx` — grouped by subtopic, practice CTAs
- `app/(dashboard)/tests/[sessionId]/page.tsx` — loads all data, tab switcher via `?tab=`
- `app/(dashboard)/tests/mistakes/page.tsx` — cross-session mistake aggregator

**Modify:**
- `components/tests/TestSessionCard.tsx` — change action buttons to link to `/tests/[sessionId]` (single route)
- `app/(dashboard)/tests/page.tsx` — add "All Mistakes" link button in header

---

## Task 1: Delete broken sub-pages + update TestSessionCard

**Files:**
- Delete: `app/(dashboard)/tests/[sessionId]/results/page.tsx`
- Delete: `app/(dashboard)/tests/[sessionId]/analytics/page.tsx`
- Delete: `app/(dashboard)/tests/[sessionId]/review/page.tsx`
- Modify: `components/tests/TestSessionCard.tsx`

- [ ] **Step 1: Delete the three broken sub-pages**

```bash
rm app/\(dashboard\)/tests/\[sessionId\]/results/page.tsx
rm app/\(dashboard\)/tests/\[sessionId\]/analytics/page.tsx
rm app/\(dashboard\)/tests/\[sessionId\]/review/page.tsx
```

- [ ] **Step 2: Update `TestSessionCard.tsx` — replace the two action buttons with a single "View Details" link**

Replace the entire action buttons section (lines 99–113) in `components/tests/TestSessionCard.tsx`:

```tsx
      {/* Action button */}
      <div className="px-6 py-4 border-t border-gray-50">
        <Link href={`/tests/${session.$id}`} className="block w-full">
          <Button size="sm" className="w-full gap-2 bg-[#FF6B00] hover:bg-[#FF8C00] font-semibold">
            <BarChart2 className="h-4 w-4" />
            View Details
          </Button>
        </Link>
      </div>
```

Remove the `BookOpen` import since it's no longer used. The full updated imports line becomes:

```tsx
import { Clock, CheckCircle, XCircle, MinusCircle, BarChart2, AlertTriangle } from 'lucide-react'
```

- [ ] **Step 3: Verify the app builds**

```bash
cd /Users/dhanush/Desktop/INDICORE/indicore && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors related to the deleted files or TestSessionCard.

- [ ] **Step 4: Commit**

```bash
git add components/tests/TestSessionCard.tsx
git rm app/\(dashboard\)/tests/\[sessionId\]/results/page.tsx app/\(dashboard\)/tests/\[sessionId\]/analytics/page.tsx app/\(dashboard\)/tests/\[sessionId\]/review/page.tsx
git commit -m "feat(tests): delete broken sub-pages, update card to unified route

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 2: Create `QuestionReviewCard` component

**Files:**
- Create: `components/tests/QuestionReviewCard.tsx`

This is the shared card used in both WrongAnswersTab and ReviewAllTab.

- [ ] **Step 1: Create `components/tests/QuestionReviewCard.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, BookOpen } from 'lucide-react'
import { NoteEditor } from '@/components/notes/NoteEditor'
import type { Question, Subject } from '@/types'

interface QuestionReviewCardProps {
  question: Question
  userAnswer: string | null   // null = skipped
  isCorrect: boolean
  wasSkipped: boolean
  confidenceTag?: string | null
  timeTaken?: number | null
  subjectName?: string        // human-readable name, falls back to question.subject_id
  subjects?: Subject[]        // for NoteEditor
  showSaveNote?: boolean
}

export function QuestionReviewCard({
  question,
  userAnswer,
  isCorrect,
  wasSkipped,
  confidenceTag,
  timeTaken,
  subjectName,
  subjects = [],
  showSaveNote = false,
}: QuestionReviewCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [showNoteEditor, setShowNoteEditor] = useState(false)

  const borderClass = wasSkipped
    ? 'border-l-gray-300'
    : isCorrect
    ? 'border-l-green-500'
    : 'border-l-red-500'

  const optionText = (opt: string): string => {
    const map: Record<string, string> = {
      A: question.option_a,
      B: question.option_b,
      C: question.option_c,
      D: question.option_d,
    }
    return map[opt] ? `${opt}. ${map[opt]}` : opt
  }

  const confidenceLabel: Record<string, string> = {
    sure: 'Sure',
    fifty_fifty: '50/50',
    guess: 'Guess',
  }

  return (
    <div
      className={`bg-white rounded-2xl border border-gray-100 border-l-4 ${borderClass} shadow-sm p-5 space-y-3`}
    >
      {/* Badges row */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-orange-50 text-orange-600">
          {subjectName || question.subject_id}
        </span>
        {question.subtopic && (
          <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">
            {question.subtopic}
          </span>
        )}
        {wasSkipped && (
          <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">
            Skipped
          </span>
        )}
        {confidenceTag && confidenceTag !== 'normal' && confidenceLabel[confidenceTag] && (
          <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-600">
            {confidenceLabel[confidenceTag]}
          </span>
        )}
        {timeTaken != null && timeTaken > 0 && (
          <span className="text-[10px] text-gray-400 ml-auto">{timeTaken}s</span>
        )}
      </div>

      {/* Question text */}
      <p className="text-sm font-semibold text-gray-900 leading-relaxed">
        {question.question_text}
      </p>

      {/* Answer pills */}
      <div className="flex flex-wrap gap-2">
        {!wasSkipped && userAnswer && !isCorrect && (
          <span className="inline-flex items-center px-3 py-1.5 rounded-xl bg-red-50 text-red-700 text-xs font-bold">
            Your answer: {optionText(userAnswer)}
          </span>
        )}
        <span className="inline-flex items-center px-3 py-1.5 rounded-xl bg-green-50 text-green-700 text-xs font-bold">
          Correct: {optionText(question.correct_option)}
        </span>
      </div>

      {/* Explanation toggle */}
      {question.explanation && (
        <div>
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-1 text-xs font-bold text-[#FF6B00] hover:text-[#FF8C00] transition-colors"
          >
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
            {expanded ? 'Hide' : 'Show'} Explanation
          </button>
          {expanded && (
            <p className="mt-2 text-xs text-gray-600 leading-relaxed bg-orange-50/50 rounded-xl p-3">
              {question.explanation}
            </p>
          )}
        </div>
      )}

      {/* Save as Note */}
      {showSaveNote && subjects.length > 0 && (
        <button
          onClick={() => setShowNoteEditor(true)}
          className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-900 border border-gray-200 px-3 py-1.5 rounded-xl bg-white transition-colors"
        >
          <BookOpen className="h-3.5 w-3.5" /> Save as Note
        </button>
      )}

      {showNoteEditor && (
        <NoteEditor
          prefillFront={question.question_text}
          sourceQuestionId={question.$id}
          subjects={subjects}
          onClose={() => setShowNoteEditor(false)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/tests/QuestionReviewCard.tsx
git commit -m "feat(tests): add QuestionReviewCard shared component

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 3: Create `OverviewTab` component

**Files:**
- Create: `components/tests/tabs/OverviewTab.tsx`

- [ ] **Step 1: Create `components/tests/tabs/` directory and `OverviewTab.tsx`**

```bash
mkdir -p components/tests/tabs
```

- [ ] **Step 2: Create `components/tests/tabs/OverviewTab.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { TestSession, TestAnalyticsV1 } from '@/types'

interface OverviewTabProps {
  session: TestSession
  analytics: TestAnalyticsV1 | null
}

function StatBox({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-gray-50 rounded-2xl p-4 text-center">
      <p className="text-2xl font-black text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">{label}</p>
    </div>
  )
}

export function OverviewTab({ session, analytics }: OverviewTabProps) {
  const [aiExpanded, setAiExpanded] = useState(false)

  const score = session.score ?? session.accuracy ?? 0
  const scoreColor =
    score >= 60 ? 'text-green-600' : score >= 40 ? 'text-amber-600' : 'text-red-600'

  const avgTime =
    session.total_questions > 0
      ? Math.round(session.total_time_seconds / session.total_questions)
      : 0

  const totalMins = Math.floor(session.total_time_seconds / 60)
  const totalSecs = session.total_time_seconds % 60
  const totalTimeStr = `${totalMins}m ${totalSecs}s`

  return (
    <div className="space-y-6">
      {/* Score Hero */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center space-y-2">
        <p className={`text-6xl font-black ${scoreColor}`}>{score.toFixed(0)}%</p>
        <p className="text-sm text-gray-500 font-medium">
          {session.correct} correct out of {session.total_questions} questions
        </p>
        <p className="text-xs text-gray-400">Total time: {totalTimeStr}</p>
      </div>

      {/* 4-stat row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatBox label="Correct" value={session.correct} />
        <StatBox label="Wrong" value={session.incorrect} />
        <StatBox label="Skipped" value={session.skipped} />
        <StatBox label="Avg / Question" value={`${avgTime}s`} />
      </div>

      {/* Subject breakdown */}
      {analytics?.subjectBreakdown && analytics.subjectBreakdown.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <p className="text-xs font-black uppercase tracking-widest text-gray-400">
            Subject Breakdown
          </p>
          <div className="space-y-3">
            {analytics.subjectBreakdown.map(sub => (
              <div key={sub.subjectId} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-gray-700 capitalize">
                    {sub.subjectId.replace(/_/g, ' ')}
                  </span>
                  <span className="text-gray-500">
                    {sub.correct}/{sub.total} · {sub.accuracy.toFixed(0)}% · avg {sub.avgTimeSeconds.toFixed(0)}s
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      sub.accuracy >= 60
                        ? 'bg-green-500'
                        : sub.accuracy >= 40
                        ? 'bg-amber-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${sub.accuracy}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Behavior metrics */}
      {analytics?.behavior && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <p className="text-xs font-black uppercase tracking-widest text-gray-400">
            Behavior Signals
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-xl font-black text-red-500">
                {analytics.behavior.sureButWrongCount}
              </p>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">
                Sure But Wrong
              </p>
            </div>
            <div className="text-center">
              <p className="text-xl font-black text-amber-500">
                {(analytics.behavior.sureButWrongRate * 100).toFixed(0)}%
              </p>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">
                Overconfidence Rate
              </p>
            </div>
            <div className="text-center">
              <p className="text-xl font-black text-blue-500">
                {analytics.behavior.answerChangeAvg.toFixed(1)}
              </p>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">
                Avg Answer Changes
              </p>
            </div>
          </div>
        </div>
      )}

      {/* AI Feedback */}
      {session.ai_feedback && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <button
            onClick={() => setAiExpanded(e => !e)}
            className="w-full flex items-center justify-between"
          >
            <p className="text-xs font-black uppercase tracking-widest text-gray-400">
              AI Feedback
            </p>
            {aiExpanded ? (
              <ChevronUp className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            )}
          </button>
          {aiExpanded && (
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {session.ai_feedback}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/tests/tabs/OverviewTab.tsx
git commit -m "feat(tests): add OverviewTab component

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 4: Create `WrongAnswersTab` component

**Files:**
- Create: `components/tests/tabs/WrongAnswersTab.tsx`

- [ ] **Step 1: Create `components/tests/tabs/WrongAnswersTab.tsx`**

```tsx
'use client'

import { Trophy } from 'lucide-react'
import { QuestionReviewCard } from '@/components/tests/QuestionReviewCard'
import type { Question, QuizAttempt, Subject } from '@/types'

export interface WrongItem {
  question: Question
  attempt: QuizAttempt
  subjectName: string
}

interface WrongAnswersTabProps {
  wrongItems: WrongItem[]
  subjects: Subject[]
}

export function WrongAnswersTab({ wrongItems, subjects }: WrongAnswersTabProps) {
  if (wrongItems.length === 0) {
    return (
      <div className="text-center py-20 space-y-4">
        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto">
          <Trophy className="h-10 w-10 text-green-400" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">You got everything right! 🎉</h3>
        <p className="text-sm text-gray-500">No wrong answers in this session.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-400 font-medium px-1">
        {wrongItems.length} wrong answer{wrongItems.length !== 1 ? 's' : ''}
      </p>
      {wrongItems.map(({ question, attempt, subjectName }) => (
        <QuestionReviewCard
          key={question.$id}
          question={question}
          userAnswer={attempt.selected_option || null}
          isCorrect={false}
          wasSkipped={false}
          confidenceTag={attempt.confidence_tag}
          timeTaken={attempt.time_taken_seconds}
          subjectName={subjectName}
          subjects={subjects}
          showSaveNote
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/tests/tabs/WrongAnswersTab.tsx
git commit -m "feat(tests): add WrongAnswersTab component

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 5: Create `ReviewAllTab` component

**Files:**
- Create: `components/tests/tabs/ReviewAllTab.tsx`

- [ ] **Step 1: Create `components/tests/tabs/ReviewAllTab.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { QuestionReviewCard } from '@/components/tests/QuestionReviewCard'
import type { Question, QuizAttempt, Subject } from '@/types'

export interface ReviewItem {
  question: Question
  userAnswer: string | null
  isCorrect: boolean
  wasSkipped: boolean
  confidenceTag?: string | null
  timeTaken?: number | null
  subjectName: string
}

type FilterChip = 'all' | 'correct' | 'wrong' | 'skipped'

const PAGE_SIZE = 20

interface ReviewAllTabProps {
  items: ReviewItem[]
  subjects: Subject[]
}

export function ReviewAllTab({ items, subjects }: ReviewAllTabProps) {
  const [filter, setFilter] = useState<FilterChip>('all')
  const [page, setPage] = useState(0)

  const filtered = items.filter(item => {
    if (filter === 'correct') return item.isCorrect && !item.wasSkipped
    if (filter === 'wrong') return !item.isCorrect && !item.wasSkipped
    if (filter === 'skipped') return item.wasSkipped
    return true
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const chips: { key: FilterChip; label: string }[] = [
    { key: 'all', label: `All (${items.length})` },
    { key: 'correct', label: `Correct (${items.filter(i => i.isCorrect && !i.wasSkipped).length})` },
    { key: 'wrong', label: `Wrong (${items.filter(i => !i.isCorrect && !i.wasSkipped).length})` },
    { key: 'skipped', label: `Skipped (${items.filter(i => i.wasSkipped).length})` },
  ]

  return (
    <div className="space-y-4">
      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {chips.map(chip => (
          <button
            key={chip.key}
            onClick={() => { setFilter(chip.key); setPage(0) }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              filter === chip.key
                ? 'bg-[#FF6B00] text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Question cards */}
      {paged.length === 0 ? (
        <p className="text-center py-12 text-sm text-gray-400">No questions match this filter.</p>
      ) : (
        <>
          {paged.map(item => (
            <QuestionReviewCard
              key={item.question.$id}
              question={item.question}
              userAnswer={item.userAnswer}
              isCorrect={item.isCorrect}
              wasSkipped={item.wasSkipped}
              confidenceTag={item.confidenceTag}
              timeTaken={item.timeTaken}
              subjectName={item.subjectName}
              subjects={subjects}
              showSaveNote={!item.isCorrect}
            />
          ))}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
                className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Prev
              </button>
              <span className="text-sm font-semibold text-gray-500">
                {page + 1} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => p + 1)}
                className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/tests/tabs/ReviewAllTab.tsx
git commit -m "feat(tests): add ReviewAllTab component

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 6: Create `SubtopicDrillTab` component

**Files:**
- Create: `components/tests/tabs/SubtopicDrillTab.tsx`

- [ ] **Step 1: Create `components/tests/tabs/SubtopicDrillTab.tsx`**

```tsx
'use client'

import { useRouter } from 'next/navigation'
import type { TestAnalyticsV1, Question, QuizAttempt } from '@/types'

interface SubtopicDrillTabProps {
  analytics: TestAnalyticsV1 | null
  questions: Question[]
  attemptMap: Record<string, QuizAttempt>
}

interface DrillGroup {
  name: string
  subjectId: string
  total: number
  correct: number
  accuracy: number
  confusionScore: number
  subtopicId?: string
}

export function SubtopicDrillTab({ analytics, questions, attemptMap }: SubtopicDrillTabProps) {
  const router = useRouter()

  // Build groups — prefer analytics.subtopicBreakdown, fall back to computing from questions
  let groups: DrillGroup[] = []

  if (analytics?.subtopicBreakdown && analytics.subtopicBreakdown.length > 0) {
    groups = analytics.subtopicBreakdown.map(sub => ({
      name: sub.subtopicId || sub.subjectId,
      subjectId: sub.subjectId,
      subtopicId: sub.subtopicId || undefined,
      total: sub.total,
      correct: sub.correct,
      accuracy: sub.accuracy,
      confusionScore: sub.confusionScore,
    }))
  } else {
    // Fallback: group by subtopic or subject from questions
    const map = new Map<string, DrillGroup>()
    for (const q of questions) {
      const key = q.subtopic || q.subject_id
      const attempt = attemptMap[q.$id]
      const isCorrect = attempt?.is_correct ?? false
      if (!map.has(key)) {
        map.set(key, {
          name: key,
          subjectId: q.subject_id,
          subtopicId: q.subtopic || undefined,
          total: 0,
          correct: 0,
          accuracy: 0,
          confusionScore: 0,
        })
      }
      const g = map.get(key)!
      g.total++
      if (isCorrect) g.correct++
    }
    for (const g of map.values()) {
      g.accuracy = g.total > 0 ? (g.correct / g.total) * 100 : 0
    }
    groups = Array.from(map.values())
  }

  // Sort by accuracy ascending (weakest first)
  groups.sort((a, b) => a.accuracy - b.accuracy)

  if (groups.length === 0) {
    return (
      <p className="text-center py-12 text-sm text-gray-400">
        Not enough data to show subtopic breakdown.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400 font-medium px-1">
        Sorted by weakest first — practice the ones at the top
      </p>
      {groups.map(group => (
        <div
          key={group.name}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4"
        >
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-bold text-gray-900 capitalize truncate">
                {group.name.replace(/_/g, ' ')}
              </p>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 shrink-0">
                {group.subjectId.replace(/_/g, ' ')}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>{group.correct}/{group.total} correct</span>
              <span
                className={`font-bold ${
                  group.accuracy >= 60
                    ? 'text-green-600'
                    : group.accuracy >= 40
                    ? 'text-amber-600'
                    : 'text-red-600'
                }`}
              >
                {group.accuracy.toFixed(0)}%
              </span>
              {group.confusionScore > 0 && (
                <span className="text-gray-400">
                  confusion: {group.confusionScore.toFixed(0)}
                </span>
              )}
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  group.accuracy >= 60
                    ? 'bg-green-500'
                    : group.accuracy >= 40
                    ? 'bg-amber-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${group.accuracy}%` }}
              />
            </div>
          </div>
          <button
            onClick={() =>
              router.push(
                `/quiz?${group.subtopicId ? `subtopic=${encodeURIComponent(group.subtopicId)}` : `subjectId=${encodeURIComponent(group.subjectId)}`}`
              )
            }
            className="shrink-0 px-3 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#FF8C00] text-white text-xs font-bold transition-colors"
          >
            Practice
          </button>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/tests/tabs/SubtopicDrillTab.tsx
git commit -m "feat(tests): add SubtopicDrillTab component

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 7: Create `[sessionId]/page.tsx` — the unified detail page

**Files:**
- Create: `app/(dashboard)/tests/[sessionId]/page.tsx`

This page:
1. Fetches session + attempts in `Promise.all`
2. Parses snapshot for questions (falls back to DB query)
3. Parses `session.analytics` for `TestAnalyticsV1`
4. Renders tab bar + active tab component
5. Tab state lives in `?tab=` URL param

- [ ] **Step 1: Create `app/(dashboard)/tests/[sessionId]/page.tsx`**

```tsx
'use client'
export const dynamic = 'force-dynamic'

import { Suspense, useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  getTestSession,
  listAttemptsBySession,
  getQuestionsByIds,
  getSubjects,
} from '@/lib/appwrite/queries'
import { OverviewTab } from '@/components/tests/tabs/OverviewTab'
import { WrongAnswersTab } from '@/components/tests/tabs/WrongAnswersTab'
import type { WrongItem } from '@/components/tests/tabs/WrongAnswersTab'
import { ReviewAllTab } from '@/components/tests/tabs/ReviewAllTab'
import type { ReviewItem } from '@/components/tests/tabs/ReviewAllTab'
import { SubtopicDrillTab } from '@/components/tests/tabs/SubtopicDrillTab'
import type { TestSession, Question, QuizAttempt, Subject, TestAnalyticsV1 } from '@/types'

type TabName = 'overview' | 'wrong-answers' | 'review-all' | 'subtopic-drill'

const TABS: { key: TabName; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'wrong-answers', label: 'Wrong Answers' },
  { key: 'review-all', label: 'Review All' },
  { key: 'subtopic-drill', label: 'Subtopic Drill' },
]

function parseAnalytics(raw: string | undefined): TestAnalyticsV1 | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed.subjectBreakdown)) return parsed as TestAnalyticsV1
    return null
  } catch {
    return null
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function SessionDetailContent() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = params.sessionId as string
  const activeTab = (searchParams.get('tab') || 'overview') as TabName

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [session, setSession] = useState<TestSession | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [attemptMap, setAttemptMap] = useState<Record<string, QuizAttempt>>({})
  const [analytics, setAnalytics] = useState<TestAnalyticsV1 | null>(null)
  const [subjects, setSubjects] = useState<Subject[]>([])

  useEffect(() => {
    const load = async () => {
      try {
        const [sess, attemptsRes, subsRes] = await Promise.all([
          getTestSession(sessionId),
          listAttemptsBySession(sessionId),
          getSubjects(),
        ])
        setSession(sess)
        setSubjects(subsRes.documents as unknown as Subject[])

        // Build attempt map
        const aMap: Record<string, QuizAttempt> = {}
        for (const a of attemptsRes.documents as unknown as QuizAttempt[]) {
          aMap[a.question_id] = a
        }
        setAttemptMap(aMap)

        // Get questions from snapshot or DB
        let qs: Question[] = []
        const snapRaw = sess.snapshot
        if (snapRaw) {
          try {
            const snap = JSON.parse(snapRaw)
            if (Array.isArray(snap.questions) && snap.questions.length > 0) {
              qs = snap.questions as Question[]
            }
          } catch { /* snapshot parse failed, fall through */ }
        }
        if (qs.length === 0) {
          const qIds = (attemptsRes.documents as unknown as QuizAttempt[])
            .map(a => a.question_id)
            .filter(Boolean)
          if (qIds.length > 0) {
            const qRes = await getQuestionsByIds(qIds)
            qs = qRes.documents as unknown as Question[]
          }
        }
        setQuestions(qs)

        // Parse analytics (prefer session.analytics, fallback session.results_history)
        const analyticsRaw = sess.analytics || sess.results_history
        setAnalytics(parseAnalytics(analyticsRaw))
      } catch (e: any) {
        console.error('[SessionDetail] load failed:', e)
        setError(e?.message || 'Failed to load session')
        toast.error('Failed to load session details')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [sessionId])

  const setTab = (tab: TabName) => {
    router.replace(`/tests/${sessionId}?tab=${tab}`, { scroll: false })
  }

  // Build subject name lookup
  const subjectNameMap = new Map(subjects.map(s => [s.$id, s.Name]))
  const subjectName = (id: string) => subjectNameMap.get(id) || id

  // Build derived data for tabs
  const wrongItems: WrongItem[] = questions
    .filter(q => attemptMap[q.$id] && !attemptMap[q.$id].is_correct)
    .map(q => ({
      question: q,
      attempt: attemptMap[q.$id],
      subjectName: subjectName(q.subject_id),
    }))

  const reviewItems: ReviewItem[] = questions.map(q => {
    const attempt = attemptMap[q.$id]
    const wasSkipped = !attempt
    return {
      question: q,
      userAnswer: attempt?.selected_option || null,
      isCorrect: attempt?.is_correct ?? false,
      wasSkipped,
      confidenceTag: attempt?.confidence_tag,
      timeTaken: attempt?.time_taken_seconds,
      subjectName: subjectName(q.subject_id),
    }
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 text-[#FF6B00] animate-spin" />
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-[#F8F9FC] flex items-center justify-center">
        <div className="text-center space-y-4 p-6">
          <p className="text-lg font-bold text-gray-900">Failed to load session</p>
          <p className="text-sm text-gray-500">{error}</p>
          <Link
            href="/tests"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FF6B00] text-white text-sm font-bold hover:bg-[#FF8C00] transition-colors"
          >
            Back to Tests
          </Link>
        </div>
      </div>
    )
  }

  const sessionDate = session.submitted_at || session.date || session.$createdAt || ''

  return (
    <div className="min-h-screen bg-[#F8F9FC]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/tests"
              className="flex items-center gap-1.5 text-sm font-bold text-gray-400 hover:text-gray-900 transition-colors shrink-0"
            >
              <ArrowLeft className="h-4 w-4" /> Tests
            </Link>
            <div className="min-w-0">
              <p className="text-sm font-black text-gray-900 truncate">{session.paper_label}</p>
              <p className="text-xs text-gray-400">
                {session.exam_type} · {sessionDate ? formatDate(sessionDate) : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="max-w-4xl mx-auto px-4 md:px-6">
          <div className="flex gap-1 overflow-x-auto pb-px scrollbar-none">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setTab(tab.key)}
                className={`shrink-0 px-4 py-2.5 text-xs font-black uppercase tracking-wide border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-[#FF6B00] text-[#FF6B00]'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-6">
        {activeTab === 'overview' && (
          <OverviewTab session={session} analytics={analytics} />
        )}
        {activeTab === 'wrong-answers' && (
          <WrongAnswersTab wrongItems={wrongItems} subjects={subjects} />
        )}
        {activeTab === 'review-all' && (
          <ReviewAllTab items={reviewItems} subjects={subjects} />
        )}
        {activeTab === 'subtopic-drill' && (
          <SubtopicDrillTab
            analytics={analytics}
            questions={questions}
            attemptMap={attemptMap}
          />
        )}
      </div>
    </div>
  )
}

export default function SessionDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 text-[#FF6B00] animate-spin" />
        </div>
      }
    >
      <SessionDetailContent />
    </Suspense>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/dhanush/Desktop/INDICORE/indicore && npx tsc --noEmit 2>&1 | head -40
```

Expected: no errors in `tests/[sessionId]/page.tsx` or the tab components.

- [ ] **Step 3: Commit**

```bash
git add app/\(dashboard\)/tests/\[sessionId\]/page.tsx
git commit -m "feat(tests): add unified 4-tab session detail page

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 8: Update `tests/page.tsx` — add "All Mistakes" link

**Files:**
- Modify: `app/(dashboard)/tests/page.tsx`

- [ ] **Step 1: Add "All Mistakes" link button in the header of `tests/page.tsx`**

Find the header section that currently looks like:
```tsx
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#FF6B00] rounded-xl flex items-center justify-center shadow-md shadow-orange-100">
              <ClipboardList className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">My Tests</h1>
              <p className="text-sm text-gray-500 font-medium">
                Review your previous attempts, analytics and improvement areas.
              </p>
            </div>
          </div>
```

Replace that entire `<div className="space-y-1">` block with:
```tsx
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#FF6B00] rounded-xl flex items-center justify-center shadow-md shadow-orange-100">
              <ClipboardList className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">My Tests</h1>
              <p className="text-sm text-gray-500 font-medium">
                Review your previous attempts, analytics and improvement areas.
              </p>
            </div>
          </div>
          <Link
            href="/tests/mistakes"
            className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm font-bold text-gray-700 hover:bg-gray-50 hover:border-[#FF6B00]/40 hover:text-[#FF6B00] transition-colors shadow-sm"
          >
            <BookOpen className="h-4 w-4" />
            All Mistakes
          </Link>
        </div>
```

Also add the `Link` import and keep `BookOpen` import. The imports at the top need to include:
```tsx
import Link from 'next/link'
import { ClipboardList, ChevronLeft, ChevronRight, BookOpen } from 'lucide-react'
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/dhanush/Desktop/INDICORE/indicore && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/\(dashboard\)/tests/page.tsx
git commit -m "feat(tests): add All Mistakes link in session list header

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 9: Create `mistakes/page.tsx` — cross-session aggregator

**Files:**
- Create: `app/(dashboard)/tests/mistakes/page.tsx`

- [ ] **Step 1: Create `app/(dashboard)/tests/mistakes/page.tsx`**

```tsx
'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Trophy } from 'lucide-react'
import { getCurrentUser } from '@/lib/appwrite/auth'
import {
  listTestSessions,
  listAttemptsBySession,
  getQuestionsByIds,
  getSubjects,
} from '@/lib/appwrite/queries'
import { QuestionReviewCard } from '@/components/tests/QuestionReviewCard'
import type { TestSession, Question, Subject } from '@/types'

interface MistakeRecord {
  question: Question
  wrongCount: number
  lastDate: string
  lastAnswer: string
  subjectName: string
}

function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = []
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size))
  return result
}

async function extractMistakesFromSession(
  sess: TestSession
): Promise<{ questionId: string; userAnswer: string; sessionDate: string; question?: Question }[]> {
  // Try snapshot first
  if (sess.snapshot) {
    try {
      const snap = JSON.parse(sess.snapshot)
      const questions: Question[] = snap.questions || []
      const answers: Record<string, string> = snap.answers || {}
      const date = sess.submitted_at || sess.date || ''
      return questions
        .filter(q => answers[q.$id] && answers[q.$id] !== q.correct_option)
        .map(q => ({ questionId: q.$id, userAnswer: answers[q.$id], sessionDate: date, question: q }))
    } catch { /* fall through */ }
  }

  // Fallback: load attempts from DB
  try {
    const attRes = await listAttemptsBySession(sess.$id)
    const wrongAttempts = (attRes.documents as any[]).filter(
      a => a.is_correct === false && a.selected_option
    )
    if (wrongAttempts.length === 0) return []
    const qIds = wrongAttempts.map((a: any) => a.question_id as string)
    const qRes = await getQuestionsByIds(qIds)
    const qMap = new Map((qRes.documents as unknown as Question[]).map(q => [q.$id, q]))
    const date = sess.submitted_at || sess.date || ''
    return wrongAttempts
      .map((a: any) => ({
        questionId: a.question_id as string,
        userAnswer: a.selected_option as string,
        sessionDate: date,
        question: qMap.get(a.question_id),
      }))
      .filter(item => item.question)
  } catch {
    return []
  }
}

export default function MistakesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState({ loaded: 0, total: 0 })
  const [mistakes, setMistakes] = useState<MistakeRecord[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [sort, setSort] = useState<'most-wrong' | 'recent'>('most-wrong')

  const load = useCallback(async () => {
    try {
      const user = await getCurrentUser()
      if (!user) { router.push('/login'); return }

      const [sessRes, subsRes] = await Promise.all([
        listTestSessions({ userId: user.$id, limit: 20 }),
        getSubjects(),
      ])
      const sessions = sessRes.documents as TestSession[]
      const subsArr = subsRes.documents as unknown as Subject[]
      setSubjects(subsArr)
      const subjectNameMap = new Map(subsArr.map(s => [s.$id, s.Name]))
      const subjectName = (id: string) => subjectNameMap.get(id) || id

      setProgress({ loaded: 0, total: sessions.length })

      // Aggregate mistakes
      const mistakeMap = new Map<
        string,
        { question: Question; wrongCount: number; lastDate: string; lastAnswer: string }
      >()

      const batches = chunk(sessions, 5)
      let loaded = 0
      for (const batch of batches) {
        const results = await Promise.all(batch.map(sess => extractMistakesFromSession(sess)))
        for (const items of results) {
          for (const item of items) {
            if (!item.question) continue
            const existing = mistakeMap.get(item.questionId)
            if (existing) {
              existing.wrongCount++
              if (new Date(item.sessionDate) > new Date(existing.lastDate)) {
                existing.lastDate = item.sessionDate
                existing.lastAnswer = item.userAnswer
              }
            } else {
              mistakeMap.set(item.questionId, {
                question: item.question,
                wrongCount: 1,
                lastDate: item.sessionDate,
                lastAnswer: item.userAnswer,
              })
            }
          }
        }
        loaded += batch.length
        setProgress({ loaded, total: sessions.length })
      }

      const records: MistakeRecord[] = Array.from(mistakeMap.values()).map(m => ({
        ...m,
        subjectName: subjectName(m.question.subject_id),
      }))

      setMistakes(records)
    } catch (e) {
      console.error('[MistakesPage] load failed:', e)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { load() }, [load])

  // Filter + sort
  const filtered = mistakes
    .filter(m => subjectFilter === 'all' || m.question.subject_id === subjectFilter)
    .sort((a, b) =>
      sort === 'most-wrong'
        ? b.wrongCount - a.wrongCount
        : new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime()
    )

  // Unique subjects in the mistakes list for filter dropdown
  const mistakeSubjects = Array.from(
    new Map(mistakes.map(m => [m.question.subject_id, m.subjectName])).entries()
  )

  return (
    <div className="min-h-screen bg-[#F8F9FC]">
      {/* Sticky header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-4 flex items-center gap-3">
          <Link
            href="/tests"
            className="flex items-center gap-1.5 text-sm font-bold text-gray-400 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Tests
          </Link>
          <div>
            <p className="text-sm font-black text-gray-900">All Mistakes</p>
            <p className="text-xs text-gray-400">Questions you've got wrong across all tests</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 space-y-5">
        {loading ? (
          <div className="text-center py-20 space-y-4">
            <Loader2 className="h-8 w-8 text-[#FF6B00] animate-spin mx-auto" />
            {progress.total > 0 && (
              <p className="text-sm text-gray-500">
                Loading mistakes from {progress.loaded}/{progress.total} sessions…
              </p>
            )}
          </div>
        ) : filtered.length === 0 && mistakes.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto">
              <Trophy className="h-10 w-10 text-[#FF6B00]" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">No mistakes yet — keep it up! 🏆</h3>
            <p className="text-sm text-gray-500">Complete more tests to track your weak areas.</p>
          </div>
        ) : (
          <>
            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
              <select
                value={subjectFilter}
                onChange={e => setSubjectFilter(e.target.value)}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/30"
              >
                <option value="all">All Subjects</option>
                {mistakeSubjects.map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
              <select
                value={sort}
                onChange={e => setSort(e.target.value as 'most-wrong' | 'recent')}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/30"
              >
                <option value="most-wrong">Most Wrong First</option>
                <option value="recent">Most Recent First</option>
              </select>
              <p className="text-xs text-gray-400 font-medium ml-auto">
                {filtered.length} unique mistake{filtered.length !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Mistake cards */}
            {filtered.length === 0 ? (
              <p className="text-center py-8 text-sm text-gray-400">No mistakes match this filter.</p>
            ) : (
              <div className="space-y-4">
                {filtered.map(m => (
                  <div key={m.question.$id} className="relative">
                    {m.wrongCount >= 2 && (
                      <div className="absolute -top-2 -right-2 z-10 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow">
                        Wrong {m.wrongCount}×
                      </div>
                    )}
                    <QuestionReviewCard
                      question={m.question}
                      userAnswer={m.lastAnswer}
                      isCorrect={false}
                      wasSkipped={false}
                      subjectName={m.subjectName}
                      subjects={subjects}
                      showSaveNote
                    />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /Users/dhanush/Desktop/INDICORE/indicore && npx tsc --noEmit 2>&1 | head -40
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/\(dashboard\)/tests/mistakes/page.tsx
git commit -m "feat(tests): add cross-session mistakes aggregator page

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Task 10: Final build check + push

- [ ] **Step 1: Run full TypeScript check**

```bash
cd /Users/dhanush/Desktop/INDICORE/indicore && npx tsc --noEmit 2>&1
```

Expected: zero errors.

- [ ] **Step 2: Check that deleted sub-pages leave no dangling directory**

```bash
ls app/\(dashboard\)/tests/
```

Expected output: `[sessionId]/  mistakes/  page.tsx` — no `results/`, `analytics/`, `review/` directories remain.

- [ ] **Step 3: Push to remote**

```bash
git push
```

- [ ] **Step 4: Deploy note**

The following env vars must be set in Vercel (all should already exist from earlier setup):
- `NEXT_PUBLIC_COLLECTION_TEST_SESSIONS`
- `NEXT_PUBLIC_COLLECTION_ATTEMPTS`
- `NEXT_PUBLIC_COLLECTION_SUBJECTS`
- `NEXT_PUBLIC_COLLECTION_USER_TEST_SUMMARY`

No new env vars are required for this feature.

---

## Summary

| Task | Files Changed | Description |
|---|---|---|
| 1 | TestSessionCard + 3 deletions | Remove broken sub-pages, unify card links |
| 2 | QuestionReviewCard | Shared question display component |
| 3 | OverviewTab | Score hero + subject table + behavior + AI feedback |
| 4 | WrongAnswersTab | Filtered wrong answers with save-as-note |
| 5 | ReviewAllTab | All questions with filter chips + pagination |
| 6 | SubtopicDrillTab | Grouped accuracy + practice CTAs |
| 7 | [sessionId]/page.tsx | 4-tab unified detail page with data loading |
| 8 | tests/page.tsx | Add "All Mistakes" link |
| 9 | mistakes/page.tsx | Cross-session mistake aggregator |
| 10 | — | Final checks + push |
