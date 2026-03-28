# Blue Rebrand + Landing Mobile Optimisation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every orange/saffron accent (`#FF6B00`) with blue (`#4A90E2`) app-wide, and add `sm:` breakpoint fixes to the landing page for 375px–640px screens.

**Architecture:** Hybrid approach — CSS variable value swap covers Tailwind `text-saffron`/`bg-saffron` classes automatically; sed find-replace handles hardcoded hex values and Tailwind orange classes file-by-file; landing components get targeted `sm:` breakpoint additions.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS v4, sed (macOS in-place `-i ''`)

> **Note:** `RatingButtons.tsx` Hard rating (`bg-orange-500`) is intentionally left orange — it is a semantic difficulty signal (hard = warm/red spectrum), not a brand color.

---

## Color Reference Map

| Find | Replace | Notes |
|---|---|---|
| `#FF6B00` | `#4A90E2` | Primary brand blue |
| `#FF8C00` | `#3a7fd4` | Hover/pressed blue |
| `#FFF3EC` | `#EBF2FC` | Light tinted bg |
| `bg-orange-50` | `bg-blue-50` | Tailwind light bg |
| `text-orange-600` | `text-blue-600` | Tailwind text |
| `text-orange-500` | `text-blue-500` | Tailwind text |
| `text-orange-700` | `text-blue-700` | Tailwind text |
| `text-orange-400` | `text-blue-400` | Tailwind text |
| `text-orange-900` | `text-blue-900` | Tailwind text |
| `from-orange-50` | `from-blue-50` | Gradient start |
| `to-orange-400` | `to-blue-400` | Gradient end |
| `to-orange-500` | `to-[#3a7fd4]` | Gradient end |
| `hover:border-orange-100` | `hover:border-blue-100` | Hover border |
| `border-orange-100` | `border-blue-100` | Border |
| `border-orange-200` | `border-blue-200` | Border |
| `shadow-orange-100` | `shadow-blue-100` | Shadow tint |
| `shadow-orange-200` | `shadow-blue-200` | Shadow tint |
| `bg-orange-400` | `bg-blue-400` | Bg tint |
| `bg-orange-500` | `bg-blue-500` | Bg (brand only) |
| `hover:bg-orange-50` | `hover:bg-blue-50` | Hover bg |
| `hover:bg-orange-600` | `hover:bg-blue-600` | Hover bg |
| `ring-[#FF6B00]/30` | `ring-[#4A90E2]/30` | Focus ring |

---

## Task 1: Update CSS Color Tokens

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Update `--color-saffron` value and add hover/light tokens**

Open `app/globals.css`. Find the `@theme inline` block and update:

```css
/* BEFORE */
--color-saffron: #FF6B00;

/* AFTER — replace that line and add two lines below it */
--color-saffron: #4A90E2;
--color-saffron-hover: #3a7fd4;
--color-saffron-light: #EBF2FC;
```

- [ ] **Step 2: Verify the token appears correctly**

```bash
grep -n "saffron" app/globals.css
```

Expected output:
```
12:  --color-saffron: #4A90E2;
13:  --color-saffron-hover: #3a7fd4;
14:  --color-saffron-light: #EBF2FC;
```

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat(rebrand): update CSS color tokens to blue #4A90E2"
```

---

## Task 2: Rebrand Dashboard Layout

**Files:**
- Modify: `app/(dashboard)/layout.tsx`

- [ ] **Step 1: Apply all orange → blue replacements**

```bash
sed -i '' \
  -e 's|#FF6B00|#4A90E2|g' \
  -e 's|#FF8C00|#3a7fd4|g' \
  -e 's|bg-orange-50|bg-blue-50|g' \
  -e 's|text-orange-600|text-blue-600|g' \
  -e 's|shadow-orange-100|shadow-blue-100|g' \
  "app/(dashboard)/layout.tsx"
```

- [ ] **Step 2: Verify zero orange refs remain**

```bash
grep -n "FF6B00\|FF8C00\|orange" "app/(dashboard)/layout.tsx"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/layout.tsx"
git commit -m "feat(rebrand): update dashboard layout nav to blue"
```

---

## Task 3: Rebrand Auth Pages

**Files:**
- Modify: `app/(auth)/signup/page.tsx`
- Modify: `app/(auth)/login/page.tsx`
- Modify: `app/(auth)/forgot-password/page.tsx`
- Modify: `app/(auth)/reset-password/page.tsx`
- Modify: `app/(auth)/onboarding/page.tsx`

- [ ] **Step 1: Apply replacements to all 5 auth pages**

```bash
for f in \
  "app/(auth)/signup/page.tsx" \
  "app/(auth)/login/page.tsx" \
  "app/(auth)/forgot-password/page.tsx" \
  "app/(auth)/reset-password/page.tsx" \
  "app/(auth)/onboarding/page.tsx"; do
  sed -i '' \
    -e 's|#FF6B00|#4A90E2|g' \
    -e 's|#FF8C00|#3a7fd4|g' \
    -e 's|#FFF3EC|#EBF2FC|g' \
    -e 's|from-orange-50|from-blue-50|g' \
    -e 's|bg-orange-50|bg-blue-50|g' \
    -e 's|text-orange-600|text-blue-600|g' \
    -e 's|hover:bg-orange-50|hover:bg-blue-50|g' \
    "$f"
done
```

- [ ] **Step 2: Verify zero orange refs remain**

```bash
grep -rn "FF6B00\|FF8C00\|FFF3EC\|orange" \
  "app/(auth)/signup/page.tsx" \
  "app/(auth)/login/page.tsx" \
  "app/(auth)/forgot-password/page.tsx" \
  "app/(auth)/reset-password/page.tsx" \
  "app/(auth)/onboarding/page.tsx"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add \
  "app/(auth)/signup/page.tsx" \
  "app/(auth)/login/page.tsx" \
  "app/(auth)/forgot-password/page.tsx" \
  "app/(auth)/reset-password/page.tsx" \
  "app/(auth)/onboarding/page.tsx"
git commit -m "feat(rebrand): update auth pages to blue theme"
```

---

## Task 4: Rebrand Quiz Page

**Files:**
- Modify: `app/(dashboard)/quiz/page.tsx`

- [ ] **Step 1: Apply all orange → blue replacements**

```bash
sed -i '' \
  -e 's|#FF6B00|#4A90E2|g' \
  -e 's|#FF8C00|#3a7fd4|g' \
  -e 's|#FFF3EC|#EBF2FC|g' \
  -e 's|bg-orange-50|bg-blue-50|g' \
  -e 's|text-orange-600|text-blue-600|g' \
  -e 's|text-orange-500|text-blue-500|g' \
  -e 's|hover:border-orange-100|hover:border-blue-100|g' \
  -e 's|hover:border-orange-50|hover:border-blue-50|g' \
  -e 's|shadow-orange-100|shadow-blue-100|g' \
  -e 's|hover:bg-orange-50|hover:bg-blue-50|g' \
  -e 's|hover:bg-orange-600|hover:bg-blue-600|g' \
  -e 's|to-orange-500|to-[#3a7fd4]|g' \
  -e 's|to-orange-400|to-blue-400|g' \
  -e 's|bg-orange-500|bg-blue-500|g' \
  "app/(dashboard)/quiz/page.tsx"
```

- [ ] **Step 2: Verify zero orange refs remain**

```bash
grep -n "FF6B00\|FF8C00\|FFF3EC\|orange" "app/(dashboard)/quiz/page.tsx"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/quiz/page.tsx"
git commit -m "feat(rebrand): update quiz page to blue theme"
```

---

## Task 5: Rebrand Quiz Session + Option Components

**Files:**
- Modify: `app/(dashboard)/quiz/session/page.tsx`
- Modify: `components/quiz/OptionButton.tsx`
- Modify: `components/quiz/ExplanationBox.tsx`

- [ ] **Step 1: Apply replacements to session page**

```bash
sed -i '' \
  -e 's|#FF6B00|#4A90E2|g' \
  -e 's|#FF8C00|#3a7fd4|g' \
  -e 's|#FFF3EC|#EBF2FC|g' \
  -e 's|bg-orange-50|bg-blue-50|g' \
  -e 's|border-orange-100|border-blue-100|g' \
  -e 's|border-orange-200|border-blue-200|g' \
  -e 's|text-orange-600|text-blue-600|g' \
  -e 's|hover:bg-orange-50|hover:bg-blue-50|g' \
  -e 's|ring-\[#FF6B00\]\/30|ring-[#4A90E2]/30|g' \
  "app/(dashboard)/quiz/session/page.tsx"
```

- [ ] **Step 2: Apply replacements to OptionButton and ExplanationBox**

```bash
sed -i '' \
  -e 's|#FF6B00|#4A90E2|g' \
  -e 's|#FF8C00|#3a7fd4|g' \
  -e 's|#FFF3EC|#EBF2FC|g' \
  -e 's|hover:border-\[#FF6B00\]|hover:border-[#4A90E2]|g' \
  -e 's|hover:bg-\[#FFF3EC\]|hover:bg-[#EBF2FC]|g' \
  "components/quiz/OptionButton.tsx"

sed -i '' \
  -e 's|#FF6B00|#4A90E2|g' \
  -e 's|#FF8C00|#3a7fd4|g' \
  "components/quiz/ExplanationBox.tsx"
```

- [ ] **Step 3: Verify zero orange refs remain**

```bash
grep -n "FF6B00\|FF8C00\|FFF3EC\|orange" \
  "app/(dashboard)/quiz/session/page.tsx" \
  "components/quiz/OptionButton.tsx" \
  "components/quiz/ExplanationBox.tsx"
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add \
  "app/(dashboard)/quiz/session/page.tsx" \
  "components/quiz/OptionButton.tsx" \
  "components/quiz/ExplanationBox.tsx"
git commit -m "feat(rebrand): update quiz session and option components to blue"
```

---

## Task 6: Rebrand Dashboard Page + Components

**Files:**
- Modify: `app/(dashboard)/dashboard/page.tsx`
- Modify: `components/dashboard/WelcomeBanner.tsx`
- Modify: `components/dashboard/SubjectGrid.tsx`

- [ ] **Step 1: Apply replacements to dashboard page**

```bash
sed -i '' \
  -e 's|#FF6B00|#4A90E2|g' \
  -e 's|#FF8C00|#3a7fd4|g' \
  -e 's|bg-orange-50|bg-blue-50|g' \
  -e 's|text-orange-400|text-blue-400|g' \
  -e 's|hover:bg-orange-50|hover:bg-blue-50|g' \
  -e 's|shadow-orange-100|shadow-blue-100|g' \
  -e 's|shadow-orange-200|shadow-blue-200|g' \
  -e 's|to-orange-500|to-[#3a7fd4]|g' \
  "app/(dashboard)/dashboard/page.tsx"
```

- [ ] **Step 2: Apply replacements to WelcomeBanner and SubjectGrid**

```bash
sed -i '' \
  -e 's|#FF6B00|#4A90E2|g' \
  -e 's|#FF8C00|#3a7fd4|g' \
  "components/dashboard/WelcomeBanner.tsx"

sed -i '' \
  -e 's|#FF6B00|#4A90E2|g' \
  "components/dashboard/SubjectGrid.tsx"
```

- [ ] **Step 3: Verify zero orange refs remain**

```bash
grep -n "FF6B00\|FF8C00\|orange" \
  "app/(dashboard)/dashboard/page.tsx" \
  "components/dashboard/WelcomeBanner.tsx" \
  "components/dashboard/SubjectGrid.tsx"
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add \
  "app/(dashboard)/dashboard/page.tsx" \
  "components/dashboard/WelcomeBanner.tsx" \
  "components/dashboard/SubjectGrid.tsx"
git commit -m "feat(rebrand): update dashboard page and components to blue"
```

---

## Task 7: Rebrand Profile Page

**Files:**
- Modify: `app/(dashboard)/profile/page.tsx`

- [ ] **Step 1: Apply replacements**

```bash
sed -i '' \
  -e 's|#FF6B00|#4A90E2|g' \
  -e 's|#FF8C00|#3a7fd4|g' \
  -e 's|bg-orange-50|bg-blue-50|g' \
  -e 's|text-orange-600|text-blue-600|g' \
  -e 's|text-orange-700|text-blue-700|g' \
  -e 's|to-orange-400|to-blue-400|g' \
  -e 's|to-orange-500|to-[#3a7fd4]|g' \
  -e 's|shadow-orange-100|shadow-blue-100|g' \
  -e 's|shadow-orange-200|shadow-blue-200|g' \
  -e 's|hover:shadow-orange-200|hover:shadow-blue-200|g' \
  "app/(dashboard)/profile/page.tsx"
```

- [ ] **Step 2: Verify zero orange refs remain**

```bash
grep -n "FF6B00\|FF8C00\|orange" "app/(dashboard)/profile/page.tsx"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/profile/page.tsx"
git commit -m "feat(rebrand): update profile page to blue theme"
```

---

## Task 8: Rebrand Notes Pages + Components

**Files:**
- Modify: `app/(dashboard)/notes/page.tsx`
- Modify: `app/(dashboard)/notes/[cardId]/page.tsx`
- Modify: `app/(dashboard)/notes/review/page.tsx`
- Modify: `components/notes/NoteEditor.tsx`
- Modify: `components/notes/NoteCard.tsx`
- Modify: `components/notes/FlipCard.tsx`

> **Note:** `components/notes/RatingButtons.tsx` Hard rating (`bg-orange-500`) is intentionally left unchanged — semantic difficulty color.

- [ ] **Step 1: Apply replacements to all notes files**

```bash
for f in \
  "app/(dashboard)/notes/page.tsx" \
  "app/(dashboard)/notes/review/page.tsx" \
  "components/notes/NoteEditor.tsx" \
  "components/notes/NoteCard.tsx" \
  "components/notes/FlipCard.tsx"; do
  sed -i '' \
    -e 's|#FF6B00|#4A90E2|g' \
    -e 's|#FF8C00|#3a7fd4|g' \
    -e 's|bg-orange-50|bg-blue-50|g' \
    -e 's|text-orange-600|text-blue-600|g' \
    -e 's|text-orange-500|text-blue-500|g' \
    -e 's|text-orange-400|text-blue-400|g' \
    -e 's|hover:border-orange-100|hover:border-blue-100|g' \
    -e 's|shadow-orange-100|shadow-blue-100|g' \
    -e 's|to-orange-400|to-blue-400|g' \
    -e 's|hover:bg-orange-50|hover:bg-blue-50|g' \
    -e 's|ring-\[#FF6B00\]\/30|ring-[#4A90E2]/30|g' \
    "$f"
done

# cardId page needs separate treatment due to path brackets
sed -i '' \
  -e 's|#FF6B00|#4A90E2|g' \
  -e 's|#FF8C00|#3a7fd4|g' \
  -e 's|bg-orange-50|bg-blue-50|g' \
  -e 's|text-orange-600|text-blue-600|g' \
  -e 's|ring-\[#FF6B00\]\/30|ring-[#4A90E2]/30|g' \
  -e 's|shadow-orange-100|shadow-blue-100|g' \
  "app/(dashboard)/notes/[cardId]/page.tsx"
```

- [ ] **Step 2: Verify zero orange refs remain (except RatingButtons)**

```bash
grep -rn "FF6B00\|FF8C00\|orange" \
  "app/(dashboard)/notes/page.tsx" \
  "app/(dashboard)/notes/[cardId]/page.tsx" \
  "app/(dashboard)/notes/review/page.tsx" \
  "components/notes/NoteEditor.tsx" \
  "components/notes/NoteCard.tsx" \
  "components/notes/FlipCard.tsx"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add \
  "app/(dashboard)/notes/page.tsx" \
  "app/(dashboard)/notes/[cardId]/page.tsx" \
  "app/(dashboard)/notes/review/page.tsx" \
  "components/notes/NoteEditor.tsx" \
  "components/notes/NoteCard.tsx" \
  "components/notes/FlipCard.tsx"
git commit -m "feat(rebrand): update notes pages and components to blue"
```

---

## Task 9: Rebrand Tests Pages + Components

**Files:**
- Modify: `components/tests/TestSessionCard.tsx`
- Modify: `components/tests/QuestionReviewCard.tsx`
- Modify: `components/tests/TestFilters.tsx`
- Modify: `components/tests/tabs/SubtopicDrillTab.tsx`
- Modify: `components/tests/tabs/ReviewAllTab.tsx`
- Modify: `app/(dashboard)/tests/[sessionId]/review/page.tsx`
- Modify: `app/(dashboard)/tests/mistakes/page.tsx`

- [ ] **Step 1: Apply replacements to test components**

```bash
for f in \
  "components/tests/TestSessionCard.tsx" \
  "components/tests/QuestionReviewCard.tsx" \
  "components/tests/TestFilters.tsx" \
  "components/tests/tabs/SubtopicDrillTab.tsx" \
  "components/tests/tabs/ReviewAllTab.tsx"; do
  sed -i '' \
    -e 's|#FF6B00|#4A90E2|g' \
    -e 's|#FF8C00|#3a7fd4|g' \
    -e 's|bg-orange-50|bg-blue-50|g' \
    -e 's|text-orange-600|text-blue-600|g' \
    -e 's|border-orange-100|border-blue-100|g' \
    -e 's|border-orange-200|border-blue-200|g' \
    -e 's|ring-\[#FF6B00\]\/30|ring-[#4A90E2]/30|g' \
    -e 's|hover:text-\[#FF8C00\]|hover:text-[#3a7fd4]|g' \
    "$f"
done
```

- [ ] **Step 2: Apply replacements to test pages**

```bash
sed -i '' \
  -e 's|#FF6B00|#4A90E2|g' \
  -e 's|#FF8C00|#3a7fd4|g' \
  -e 's|bg-orange-50|bg-blue-50|g' \
  -e 's|text-orange-600|text-blue-600|g' \
  -e 's|border-orange-100|border-blue-100|g' \
  -e 's|border-orange-200|border-blue-200|g' \
  -e 's|shadow-orange-200|shadow-blue-200|g' \
  -e 's|ring-\[#FF6B00\]|ring-[#4A90E2]|g' \
  "app/(dashboard)/tests/[sessionId]/review/page.tsx"

sed -i '' \
  -e 's|#FF6B00|#4A90E2|g' \
  -e 's|ring-\[#FF6B00\]\/30|ring-[#4A90E2]/30|g' \
  "app/(dashboard)/tests/mistakes/page.tsx"
```

- [ ] **Step 3: Verify zero orange refs remain**

```bash
grep -rn "FF6B00\|FF8C00\|orange" \
  "components/tests/TestSessionCard.tsx" \
  "components/tests/QuestionReviewCard.tsx" \
  "components/tests/TestFilters.tsx" \
  "components/tests/tabs/SubtopicDrillTab.tsx" \
  "components/tests/tabs/ReviewAllTab.tsx" \
  "app/(dashboard)/tests/[sessionId]/review/page.tsx" \
  "app/(dashboard)/tests/mistakes/page.tsx"
```

Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add \
  "components/tests/TestSessionCard.tsx" \
  "components/tests/QuestionReviewCard.tsx" \
  "components/tests/TestFilters.tsx" \
  "components/tests/tabs/SubtopicDrillTab.tsx" \
  "components/tests/tabs/ReviewAllTab.tsx" \
  "app/(dashboard)/tests/[sessionId]/review/page.tsx" \
  "app/(dashboard)/tests/mistakes/page.tsx"
git commit -m "feat(rebrand): update tests pages and components to blue"
```

---

## Task 10: Rebrand Results + Intelligence

**Files:**
- Modify: `components/results/ResultsView.tsx`
- Modify: `app/(dashboard)/results/page.tsx`
- Modify: `app/(dashboard)/intelligence/page.tsx`

- [ ] **Step 1: Apply replacements**

```bash
for f in \
  "components/results/ResultsView.tsx" \
  "app/(dashboard)/results/page.tsx" \
  "app/(dashboard)/intelligence/page.tsx"; do
  sed -i '' \
    -e 's|#FF6B00|#4A90E2|g' \
    -e 's|#FF8C00|#3a7fd4|g' \
    -e 's|bg-orange-50|bg-blue-50|g' \
    -e 's|text-orange-600|text-blue-600|g' \
    -e 's|text-orange-700|text-blue-700|g' \
    -e 's|text-orange-500|text-blue-500|g' \
    -e 's|border-orange-100|border-blue-100|g' \
    -e 's|border-orange-200|border-blue-200|g' \
    -e 's|shadow-orange-100|shadow-blue-100|g' \
    -e 's|shadow-orange-200|shadow-blue-200|g' \
    -e 's|bg-orange-400|bg-blue-400|g' \
    -e 's|hover:bg-orange-50|hover:bg-blue-50|g' \
    -e 's|hover:bg-orange-100|hover:bg-blue-100|g' \
    -e 's|hover:text-\[#FF8C00\]|hover:text-[#3a7fd4]|g' \
    "$f"
done
```

- [ ] **Step 2: Verify zero orange refs remain**

```bash
grep -rn "FF6B00\|FF8C00\|orange" \
  "components/results/ResultsView.tsx" \
  "app/(dashboard)/results/page.tsx" \
  "app/(dashboard)/intelligence/page.tsx"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add \
  "components/results/ResultsView.tsx" \
  "app/(dashboard)/results/page.tsx" \
  "app/(dashboard)/intelligence/page.tsx"
git commit -m "feat(rebrand): update results and intelligence to blue"
```

---

## Task 11: Final Orange Sweep

**Files:**
- Verify: all remaining files

- [ ] **Step 1: Global grep for any missed orange refs**

```bash
grep -rn "FF6B00\|FF8C00\|FFF3EC" \
  --include="*.tsx" --include="*.ts" --include="*.css" \
  . \
  --exclude-dir=node_modules \
  --exclude-dir=.git \
  --exclude-dir=".claude"
```

Expected: no output. If any file still appears, apply the same sed replacements to it.

- [ ] **Step 2: Global grep for remaining Tailwind orange classes (excluding RatingButtons)**

```bash
grep -rn "bg-orange\|text-orange\|border-orange\|shadow-orange\|from-orange\|to-orange\|hover:bg-orange\|hover:border-orange" \
  --include="*.tsx" --include="*.ts" \
  . \
  --exclude-dir=node_modules \
  --exclude-dir=.git \
  --exclude-dir=".claude" \
  | grep -v "RatingButtons"
```

Expected: no output. If any file appears, apply the relevant sed replacement to it.

- [ ] **Step 3: TypeScript check**

```bash
export PATH="$PATH:/opt/homebrew/bin" && npx tsc --noEmit 2>&1
```

Expected: no output (zero errors).

- [ ] **Step 4: Commit if any cleanup files were changed**

```bash
git add -A
git status
# only commit if there are staged changes
git commit -m "feat(rebrand): sweep remaining orange refs to blue" || echo "nothing to commit"
```

---

## Task 12: Mobile-Optimise Landing Page

**Files:**
- Modify: `components/landing/HeroSection.tsx`
- Modify: `components/landing/FeaturesSection.tsx`
- Modify: `components/landing/ProcessSection.tsx`
- Modify: `components/landing/StatsSection.tsx`
- Modify: `components/landing/BentoSection.tsx`
- Modify: `components/landing/TestimonialsSection.tsx`
- Modify: `components/landing/CtaBanner.tsx`
- Modify: `components/landing/Footer.tsx`

- [ ] **Step 1: Fix HeroSection headline and subtext**

In `components/landing/HeroSection.tsx`:

Find:
```tsx
<h1 className="text-6xl md:text-8xl lg:text-9xl font-black leading-[1.0] tracking-tighter mb-8 flex flex-wrap justify-center gap-x-[0.25em]">
```
Replace with:
```tsx
<h1 className="text-4xl sm:text-6xl md:text-8xl lg:text-9xl font-black leading-[1.0] tracking-tighter mb-8 flex flex-wrap justify-center gap-x-[0.25em]">
```

Find:
```tsx
className="text-lg md:text-xl text-[#43494D] max-w-2xl mx-auto mb-10 leading-relaxed"
```
Replace with:
```tsx
className="text-base sm:text-lg md:text-xl text-[#43494D] max-w-2xl mx-auto mb-10 leading-relaxed"
```

- [ ] **Step 2: Fix FeaturesSection vertical padding, heading, gaps, and accordion targets**

In `components/landing/FeaturesSection.tsx`:

Find:
```tsx
<section id="features" ref={ref} className="py-32 px-6 md:px-8 max-w-7xl mx-auto">
```
Replace with:
```tsx
<section id="features" ref={ref} className="py-16 sm:py-20 md:py-32 px-6 md:px-8 max-w-7xl mx-auto">
```

Find:
```tsx
className="text-4xl font-black text-[#1A1C1C] tracking-tight mb-10"
```
Replace with:
```tsx
className="text-2xl sm:text-3xl md:text-4xl font-black text-[#1A1C1C] tracking-tight mb-10"
```

Find:
```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
```
Replace with:
```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-24 items-center">
```

Find:
```tsx
className={`p-7 rounded-2xl cursor-pointer transition-all duration-300 ${
```
Replace with:
```tsx
className={`p-5 sm:p-7 rounded-2xl cursor-pointer transition-all duration-300 ${
```

- [ ] **Step 3: Fix ProcessSection padding and heading**

In `components/landing/ProcessSection.tsx`:

Find:
```tsx
<section className="py-32 bg-white" ref={ref}>
```
Replace with:
```tsx
<section className="py-16 sm:py-20 md:py-32 bg-white" ref={ref}>
```

Find:
```tsx
className="text-4xl font-black text-[#1A1C1C] text-center mb-20 tracking-tight"
```
Replace with:
```tsx
className="text-2xl sm:text-3xl md:text-4xl font-black text-[#1A1C1C] text-center mb-12 sm:mb-16 md:mb-20 tracking-tight"
```

Find:
```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
```
Replace with:
```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 md:gap-8">
```

- [ ] **Step 4: Fix StatsSection padding**

In `components/landing/StatsSection.tsx`:

Find:
```tsx
<section className="py-24 border-y border-[#4A90E2]/15" style={{ backgroundColor: 'rgba(74,144,226,0.06)' }}>
```
Replace with:
```tsx
<section className="py-12 sm:py-16 md:py-24 border-y border-[#4A90E2]/15" style={{ backgroundColor: 'rgba(74,144,226,0.06)' }}>
```

- [ ] **Step 5: Fix BentoSection padding, heading, and gridAutoRows**

In `components/landing/BentoSection.tsx`:

Find:
```tsx
<section id="analytics" ref={ref} className="py-32 px-6 md:px-8 max-w-7xl mx-auto">
```
Replace with:
```tsx
<section id="analytics" ref={ref} className="py-16 sm:py-20 md:py-32 px-6 md:px-8 max-w-7xl mx-auto">
```

Find:
```tsx
<h2 className="text-4xl font-black text-[#1A1C1C] tracking-tight mb-3">Intelligent Insights</h2>
```
Replace with:
```tsx
<h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#1A1C1C] tracking-tight mb-3">Intelligent Insights</h2>
```

Find:
```tsx
<div className="grid grid-cols-1 md:grid-cols-12 gap-5" style={{ gridAutoRows: '240px' }}>
```
Replace with:
```tsx
<div className="grid grid-cols-1 md:grid-cols-12 gap-5" style={{ gridAutoRows: 'minmax(180px, auto)' }}>
```

- [ ] **Step 6: Fix TestimonialsSection padding and heading**

In `components/landing/TestimonialsSection.tsx`:

Find:
```tsx
<section id="testimonials" ref={ref} className="py-32 bg-[#F4F3F2]">
```
Replace with:
```tsx
<section id="testimonials" ref={ref} className="py-16 sm:py-20 md:py-32 bg-[#F4F3F2]">
```

Find:
```tsx
className="text-4xl font-black text-[#1A1C1C] text-center mb-20 tracking-tight"
```
Replace with:
```tsx
className="text-2xl sm:text-3xl md:text-4xl font-black text-[#1A1C1C] text-center mb-12 sm:mb-16 md:mb-20 tracking-tight"
```

Find:
```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
```
Replace with:
```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 md:gap-8">
```

- [ ] **Step 7: Fix CtaBanner padding and heading**

In `components/landing/CtaBanner.tsx`:

Find:
```tsx
className="relative rounded-[3rem] overflow-hidden p-14 md:p-24 text-center text-white"
```
Replace with:
```tsx
className="relative rounded-[3rem] overflow-hidden p-8 sm:p-12 md:p-24 text-center text-white"
```

Find:
```tsx
<h2 className="text-4xl md:text-6xl font-black mb-8 leading-tight max-w-4xl mx-auto flex flex-wrap justify-center gap-x-[0.25em]">
```
Replace with:
```tsx
<h2 className="text-2xl sm:text-3xl md:text-6xl font-black mb-8 leading-tight max-w-4xl mx-auto flex flex-wrap justify-center gap-x-[0.25em]">
```

Find:
```tsx
className="inline-block bg-white text-[#4A90E2] px-12 py-5 rounded-full font-black text-lg hover:scale-105 active:scale-95 transition-all shadow-2xl hover:shadow-white/30"
```
Replace with:
```tsx
className="inline-block bg-white text-[#4A90E2] px-8 py-4 sm:px-12 sm:py-5 rounded-full font-black text-base sm:text-lg hover:scale-105 active:scale-95 transition-all shadow-2xl hover:shadow-white/30"
```

- [ ] **Step 8: Fix Footer grid for tablet**

In `components/landing/Footer.tsx`:

Find:
```tsx
<div className="max-w-7xl mx-auto px-6 md:px-8 grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
```
Replace with:
```tsx
<div className="max-w-7xl mx-auto px-6 md:px-8 grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 mb-16">
```

- [ ] **Step 9: TypeScript check — must be zero errors**

```bash
export PATH="$PATH:/opt/homebrew/bin" && npx tsc --noEmit 2>&1
```

Expected: no output.

- [ ] **Step 10: Commit all landing mobile fixes**

```bash
git add \
  components/landing/HeroSection.tsx \
  components/landing/FeaturesSection.tsx \
  components/landing/ProcessSection.tsx \
  components/landing/StatsSection.tsx \
  components/landing/BentoSection.tsx \
  components/landing/TestimonialsSection.tsx \
  components/landing/CtaBanner.tsx \
  components/landing/Footer.tsx
git commit -m "feat(landing): add sm: breakpoints for mobile optimisation"
```

---

## Task 13: Merge to Main + Deploy

- [ ] **Step 1: Final TypeScript check**

```bash
export PATH="$PATH:/opt/homebrew/bin" && npx tsc --noEmit 2>&1
```

Expected: no output.

- [ ] **Step 2: Final orange grep across whole codebase**

```bash
grep -rn "FF6B00\|FF8C00\|FFF3EC" \
  --include="*.tsx" --include="*.ts" --include="*.css" \
  . \
  --exclude-dir=node_modules \
  --exclude-dir=.git \
  --exclude-dir=".claude" \
  --exclude-dir=docs
```

Expected: no output.

- [ ] **Step 3: Merge to main and push**

```bash
cd /Users/dhanush/Desktop/INDICORE/indicore
git merge claude/pensive-turing
git push origin main
```

Expected: `main -> main` push confirmation. Vercel auto-deploys.

---

## Self-Review

**Spec coverage:**
- ✅ Task 1: CSS token swap (`globals.css`)
- ✅ Tasks 2–10: All 36 files covered (layout, auth×5, quiz, session, option components, dashboard page+components, profile, notes×6, tests×7, results+intelligence)
- ✅ Task 11: Sweep + TS check
- ✅ Task 12: All 8 landing components — HeroSection, FeaturesSection, ProcessSection, StatsSection, BentoSection, TestimonialsSection, CtaBanner, Footer
- ✅ Task 13: Merge + deploy

**RatingButtons exclusion:** Documented in plan header and Task 8 note. `bg-orange-500` for Hard difficulty intentionally preserved.

**Placeholder scan:** All steps have exact sed commands, exact grep commands with expected output, exact git commands. No TBDs.

**Type consistency:** No new types introduced — all changes are string (className) substitutions and no API/interface changes.
