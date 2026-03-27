# Intelligence Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Intelligence page — remove clutter cards, filter Weaker Subjects to <50% accuracy, add wrong-count tracking for Confused Topics with a 3/5 threshold, rotate the batch every 3 sessions, remove Confidence Mistakes section, keep Sure But Wrong as a slim banner.

**Architecture:** Add `correct_count`/`wrong_count` fields to `SubtopicRating` type and update the skill-model accumulator to track them. The page then filters confused topics by `wrong_count >= 3 && attempts >= 5` and pages through results in batches of 4, advancing every 3 sessions. All other layout changes are purely in the page component.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind CSS, Supabase (jsonb — no schema migration needed, fields added to existing JSON blob)

---

## File Map

| File | Action | What changes |
|---|---|---|
| `types/index.ts` | Modify | Add `correct_count`, `wrong_count` to `SubtopicRating` |
| `lib/intelligence/skill-model.ts` | Modify | Accumulate `correct_count`/`wrong_count` per subtopic per session |
| `app/(dashboard)/intelligence/page.tsx` | Modify | Remove stat cards, add Sure But Wrong banner, filter subjects <50%, rotate confused topics |

---

### Task 1: Extend `SubtopicRating` type with wrong/correct counts

**Files:**
- Modify: `types/index.ts` (around line 209)

- [ ] **Step 1: Update the `SubtopicRating` interface**

Open `types/index.ts` and replace:

```typescript
export interface SubtopicRating {
  subtopicId: string
  subjectId: string
  rating: number          // ELO rating, starts at 1200
  attempts: number
  lastUpdated: string     // ISO
}
```

with:

```typescript
export interface SubtopicRating {
  subtopicId: string
  subjectId: string
  rating: number          // ELO rating, starts at 1200
  attempts: number
  correct_count: number   // cumulative correct answers across all sessions
  wrong_count: number     // cumulative wrong answers across all sessions
  lastUpdated: string     // ISO
}
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: errors only about `correct_count`/`wrong_count` missing in skill-model (fixed in Task 2). If unrelated errors appear, investigate before continuing.

- [ ] **Step 3: Commit**

```bash
git add types/index.ts
git commit -m "feat: add correct_count/wrong_count to SubtopicRating type"
```

---

### Task 2: Accumulate correct/wrong counts in the skill model

**Files:**
- Modify: `lib/intelligence/skill-model.ts`

- [ ] **Step 1: Update the default object when a subtopic is first seen (line ~58)**

In `updateSkillProfile`, find the block that creates a new `SubtopicRating` when one doesn't exist yet:

```typescript
const existing = ratingMap.get(st.subtopicId) ?? {
  subtopicId: st.subtopicId,
  subjectId: st.subjectId,
  rating: DEFAULT_RATING,
  attempts: 0,
  lastUpdated: new Date().toISOString(),
}
```

Replace with:

```typescript
const existing = ratingMap.get(st.subtopicId) ?? {
  subtopicId: st.subtopicId,
  subjectId: st.subjectId,
  rating: DEFAULT_RATING,
  attempts: 0,
  correct_count: 0,
  wrong_count: 0,
  lastUpdated: new Date().toISOString(),
}
```

- [ ] **Step 2: Accumulate counts when storing the updated rating (line ~88)**

Find the `ratingMap.set(...)` call that stores the updated entry:

```typescript
ratingMap.set(st.subtopicId, {
  subtopicId: st.subtopicId,
  subjectId: st.subjectId,
  rating,
  attempts: existing.attempts + answered,
  lastUpdated: new Date().toISOString(),
})
```

Replace with:

```typescript
ratingMap.set(st.subtopicId, {
  subtopicId: st.subtopicId,
  subjectId: st.subjectId,
  rating,
  attempts: existing.attempts + answered,
  correct_count: (existing.correct_count ?? 0) + st.correct,
  wrong_count: (existing.wrong_count ?? 0) + st.incorrect,
  lastUpdated: new Date().toISOString(),
})
```

Note: `?? 0` guards old persisted records that pre-date this field.

- [ ] **Step 3: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add lib/intelligence/skill-model.ts
git commit -m "feat: accumulate correct_count/wrong_count in skill model subtopic ratings"
```

---

### Task 3: Redesign the Intelligence page

**Files:**
- Modify: `app/(dashboard)/intelligence/page.tsx`

This task rewrites the main rendered section of the page. The loading state, the "not enough sessions" gate, and the data-fetching `useEffect` are all unchanged.

- [ ] **Step 1: Update imports — remove unused icons, add any new ones**

Replace the import line:

```typescript
import { Loader2, Brain, TrendingDown, Clock, AlertTriangle, Zap, BookOpen, ChevronRight, Lightbulb } from 'lucide-react'
```

with:

```typescript
import { Loader2, Brain, TrendingDown, AlertTriangle, Zap, BookOpen, Lightbulb, AlertCircle } from 'lucide-react'
```

(`Clock`, `ChevronRight` removed — no longer used. `AlertCircle` added for Sure But Wrong banner.)

- [ ] **Step 2: Remove the `ReadinessMeter` and `StatCard` component definitions**

Delete the two component functions entirely (lines 13–51 in the original file):

```typescript
// DELETE THIS ENTIRE BLOCK:
function ReadinessMeter({ score }: { score: number }) { ... }
function StatCard({ label, value, sub, warn }: ...) { ... }
```

- [ ] **Step 3: Replace the computed variables block with new filtering logic**

Find the block after the early-return gates (around line 135):

```typescript
const weakSubjects = [...subjects].sort((a, b) => a.accuracy - b.accuracy).slice(0, 3)
const weakSubtopics = subtopics.slice(0, 4)
const revise = recommendations.filter(r => r.type === 'revise')
const practice = recommendations.filter(r => r.type === 'practice')
const speedDrills = recommendations.filter(r => r.type === 'speed_drill')
```

Replace with:

```typescript
// Subjects below 50% accuracy — shown in Weaker Subjects frame
const weakSubjects = subjects.filter(s => s.accuracy < 50).sort((a, b) => a.accuracy - b.accuracy)

// Confused topics: wrong 3+ times out of 5+ attempts
const confusedTopics = subtopics
  .filter(st => (st.wrong_count ?? 0) >= 3 && st.attempts >= 5)
  .sort((a, b) => (b.wrong_count ?? 0) - (a.wrong_count ?? 0))

// Rotational batch: advances every 3 sessions, shows 4 cards at a time
const BATCH_SIZE = 4
const batchIndex = Math.floor(Math.max(0, sessionCount - 3) / 3)
const batchStart = confusedTopics.length > 0
  ? (batchIndex * BATCH_SIZE) % confusedTopics.length
  : 0
// Wrap-around slice: take 4 starting from batchStart, wrapping if near end
const confusedBatch = confusedTopics.length > 0
  ? Array.from({ length: Math.min(BATCH_SIZE, confusedTopics.length) }, (_, i) =>
      confusedTopics[(batchStart + i) % confusedTopics.length]
    )
  : []

const revise = recommendations.filter(r => r.type === 'revise')
const practice = recommendations.filter(r => r.type === 'practice')
const speedDrills = recommendations.filter(r => r.type === 'speed_drill')

// Sure But Wrong from behavior signals
const sureButWrongRate = behavior?.sureButWrongRate ?? 0
const sureButWrongHigh = sureButWrongRate > 25
```

- [ ] **Step 4: Replace the JSX return body**

Replace everything inside the outer `<div className="min-h-screen bg-[#F8F9FC]">` (the main content div, after the early-return gates) with the following:

```tsx
return (
  <div className="min-h-screen bg-[#F8F9FC]">
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-8 space-y-8">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-[#FF6B00] rounded-xl flex items-center justify-center shadow-md shadow-orange-100">
          <Brain className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Intelligence Engine</h1>
          <p className="text-sm text-gray-500 font-medium">Based on {sessionCount} sessions · Updated after every test</p>
        </div>
      </div>

      {/* Sure But Wrong — slim banner */}
      {behavior && (
        <div className={`rounded-2xl border p-5 flex items-center gap-4 ${sureButWrongHigh ? 'bg-red-50 border-red-100' : 'bg-white border-gray-100 shadow-sm'}`}>
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${sureButWrongHigh ? 'bg-red-100' : 'bg-orange-50'}`}>
            <AlertCircle className={`h-5 w-5 ${sureButWrongHigh ? 'text-red-500' : 'text-orange-500'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Sure But Wrong</p>
            <p className={`text-2xl font-black leading-tight ${sureButWrongHigh ? 'text-red-500' : 'text-gray-900'}`}>
              {sureButWrongRate.toFixed(0)}%
            </p>
          </div>
          <p className="text-xs text-gray-400 font-medium text-right max-w-[160px] leading-relaxed">
            {sureButWrongHigh
              ? 'High — you are overconfident on wrong answers'
              : 'of confident answers were incorrect'}
          </p>
        </div>
      )}

      {/* Weaker Subjects — <50% accuracy */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <TrendingDown className="h-4 w-4 text-red-500" />
          <h2 className="font-black text-gray-900 text-base">Weaker Subjects</h2>
          <span className="text-xs font-semibold text-gray-400 ml-auto">Below 50% accuracy</span>
        </div>
        {weakSubjects.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm font-bold text-emerald-600">All subjects above 50% — strong work!</p>
            <p className="text-xs text-gray-400 mt-1">Keep taking tests to track subject trends</p>
          </div>
        ) : (
          <div className="space-y-3">
            {weakSubjects.map(sub => (
              <div key={sub.subjectId} className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-gray-700">{sub.subjectId}</span>
                    <span className="text-sm font-black text-gray-900">{sub.accuracy.toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${sub.accuracy < 30 ? 'bg-red-500' : 'bg-orange-400'}`}
                      style={{ width: `${sub.accuracy}%` }}
                    />
                  </div>
                </div>
                <span className="text-xs font-bold text-gray-400 shrink-0">{sub.attempts} attempts</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confused Topics — rotational batch */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          <h2 className="font-black text-gray-900 text-base">Confused Topics</h2>
          {confusedTopics.length > BATCH_SIZE && (
            <span className="text-xs font-semibold text-gray-400 ml-auto">
              Batch {(batchIndex % Math.ceil(confusedTopics.length / BATCH_SIZE)) + 1} of {Math.ceil(confusedTopics.length / BATCH_SIZE)} · rotates every 3 tests
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 font-medium mb-5">Wrong 3+ times out of 5+ attempts</p>
        {confusedBatch.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm font-bold text-gray-500">No confused topics yet</p>
            <p className="text-xs text-gray-400 mt-1">A topic appears here when you get it wrong 3+ times out of 5 attempts</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {confusedBatch.map(st => (
              <div key={st.subtopicId} className="bg-orange-50 rounded-xl p-4 border border-orange-100">
                <p className="text-sm font-black text-gray-900 truncate">{st.subtopicId}</p>
                <p className="text-xs text-gray-500 mt-0.5">{st.subjectId}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-lg font-black text-orange-600">
                    {st.wrong_count ?? 0}/{st.attempts} wrong
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    {st.attempts} attempts
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Plan */}
      {recommendations.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-5">
            <Lightbulb className="h-4 w-4 text-[#FF6B00]" />
            <h2 className="font-black text-gray-900 text-base">Your Action Plan</h2>
          </div>
          <div className="space-y-4">
            {revise.length > 0 && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-2">Revise</p>
                {revise.map((r, i) => (
                  <div key={i} className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
                    <span className="h-5 w-5 rounded-full bg-red-50 text-red-500 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">{r.priority}</span>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{r.target.subtopicId ?? r.target.subjectId ?? 'General revision'}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{r.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {practice.length > 0 && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-2">Practice</p>
                {practice.map((r, i) => (
                  <div key={i} className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
                    <span className="h-5 w-5 rounded-full bg-blue-50 text-blue-500 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">{r.priority}</span>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{r.target.subtopicId ?? r.target.subjectId ?? 'Targeted practice'}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{r.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {speedDrills.length > 0 && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-purple-500 mb-2">Speed Drills</p>
                {speedDrills.map((r, i) => (
                  <div key={i} className="flex items-start gap-3 py-2.5">
                    <Zap className="h-4 w-4 text-purple-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-gray-900">Time improvement needed</p>
                      <p className="text-xs text-gray-500 mt-0.5">{r.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CTAs */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => router.push('/quiz')}
          className="flex items-center justify-center gap-2 h-14 rounded-2xl bg-[#FF6B00] hover:bg-[#FF8C00] text-white font-black text-sm shadow-lg shadow-orange-100 transition-colors"
        >
          <Zap className="h-4 w-4" /> Start Practice
        </button>
        <button
          onClick={() => router.push('/notes')}
          className="flex items-center justify-center gap-2 h-14 rounded-2xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 font-black text-sm transition-colors"
        >
          <BookOpen className="h-4 w-4" /> Revision Deck
        </button>
      </div>

    </div>
  </div>
)
```

- [ ] **Step 5: Build to verify no TypeScript or JSX errors**

```bash
npm run build 2>&1 | grep -E "error TS|Error:|✓ Compiled|Failed" | head -10
```

Expected: `✓ Compiled successfully`

- [ ] **Step 6: Commit**

```bash
git add app/\(dashboard\)/intelligence/page.tsx
git commit -m "feat: redesign intelligence page — remove clutter, confused topics 3/5 rule, rotational batches"
```

---

### Task 4: Push to production

- [ ] **Step 1: Push**

```bash
git push origin HEAD:main
```

- [ ] **Step 2: Verify Vercel deployment completes without errors**

Check `https://indicore-seven.vercel.app/intelligence` loads correctly after deploy.

---

## Self-Review

**Spec coverage:**
- ✅ Remove readiness score card — `ReadinessMeter` component deleted in Task 3
- ✅ Remove avg time/question card — `StatCard` deleted in Task 3
- ✅ Remove sessions analysed card — `StatCard` deleted in Task 3
- ✅ Sure But Wrong kept as slim banner — Task 3 Step 4
- ✅ Weaker Subjects filter to <50% accuracy — Task 3 Step 3
- ✅ Confused Topics 3/5 wrong rule — requires `wrong_count` field (Tasks 1+2), filter in Task 3 Step 3
- ✅ Rotational cards every 3 tests — `batchIndex = Math.floor((sessionCount-3)/3)` in Task 3 Step 3
- ✅ Remove Confidence Mistakes section — not present in new JSX in Task 3 Step 4

**Placeholder scan:** None found. All code blocks are complete.

**Type consistency:** `wrong_count`/`correct_count` added to type in Task 1, used in skill-model Task 2, and read in page Task 3. `?? 0` guards on both fields protect against old persisted records with missing fields.
