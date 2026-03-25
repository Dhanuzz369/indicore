# Notes & Flashcards Feature Design
**Date:** 2026-03-26
**Project:** Indicore — UPSC Practice Platform
**Status:** Approved

---

## Overview

An Anki-style spaced repetition note-making system that lets aspirants save key concepts as flashcards, organised by subject and topic, and revisit them on an adaptive schedule so they keep coming back for revision.

---

## Data Model

### New Appwrite Collection: `notes`

| Field | Type | Required | Notes |
|---|---|---|---|
| `user_id` | string | yes | Owner of the card |
| `front` | string | yes | Question / topic text (auto-filled from question text or manually entered) |
| `back` | string | yes | User's own answer, explanation, or mnemonic |
| `subject` | string | yes | e.g. "History", "Polity" — pulled from existing Subjects collection |
| `topic` | string | no | Free-text tag e.g. "Mughal Empire", "Article 370" |
| `source_question_id` | string | no | Optional link back to the originating question in the questions collection |
| `next_review_at` | datetime | yes | When the card is next due; set to `now` on creation |
| `interval_days` | float | yes | Current review interval in days; starts at 1 |
| `ease_factor` | float | yes | SM-2 ease multiplier; starts at 2.5, floor 1.3 |
| `review_count` | number | yes | Total number of times the card has been rated; starts at 0 |
| `created_at` | datetime | yes | ISO timestamp of card creation |

**Environment variable to add:**
```
NEXT_PUBLIC_COLLECTION_NOTES="notes"
```

---

## SM-2 Spaced Repetition Algorithm

Pure function in `lib/srs/engine.ts`:

```
computeNextReview(card, rating) → { interval_days, ease_factor, next_review_at }
```

### Rating → Interval Rules

| Button | Colour | interval_days | ease_factor delta |
|---|---|---|---|
| **Again** | Red | 1 | −0.20 (min 1.3) |
| **Hard** | Orange | max(1, interval × 1.2) | −0.15 |
| **Good** | Blue | interval × ease_factor | no change |
| **Easy** | Green | interval × ease_factor × 1.3 | +0.15 |

`next_review_at = now + interval_days`

Ease factor is always clamped: `ease_factor = max(1.3, new_value)`

---

## Routes

| Route | Purpose |
|---|---|
| `/notes` | Main hub — due-today banner, subject/topic browser, search, card grid |
| `/notes/review` | Revision session — flip cards, rate with 4 buttons, session summary |
| `/notes/new` | Standalone create-card page |
| `/notes/[cardId]` | View / edit a single card with stats |

---

## Pages & Components

### `/notes` — Main Hub
- **Due banner:** "X cards due for review today" + "Start Review" CTA button (links to `/notes/review`)
- **Filter bar:** text search (front/back), subject dropdown, topic free-text
- **Card grid:** `NoteCard` tiles — shows truncated front, subject/topic badge, due date, review count
- **"New Note" button** top-right → navigates to `/notes/new`

### `/notes/review` — Revision Session
- One card at a time, large flip card (click/tap to reveal back)
- After flip: 4 rating buttons — **Again** (red) / **Hard** (orange) / **Good** (blue) / **Easy** (green)
- Each rating calls `computeNextReview`, updates card in Appwrite, advances to next card
- Progress bar: "Card 3 of 12"
- **Session complete screen:** shows counts of Again/Hard/Good/Easy, "Back to Notes" button

### `/notes/new` — Create Card
- `front` textarea (blank)
- `back` textarea
- Subject dropdown (from existing Subjects collection)
- Topic free-text input
- Save → creates card in Appwrite with `next_review_at = now`, redirects to `/notes`

### `/notes/[cardId]` — Card Detail / Edit
- Full card view with edit mode toggle
- Stats: next review date, current interval, ease factor, review count
- Delete button (with confirmation)

### `NoteEditor` Modal (in-quiz creation)
- Triggered by **"+ Note"** button in quiz session (appears next to the existing Report button)
- `front` pre-filled with `currentQuestion.question_text` (editable)
- `back` textarea — blank, user writes their own answer/mnemonic
- Subject dropdown
- Topic free-text
- `source_question_id` set silently to `currentQuestion.$id`
- Save → creates card, shows success toast, closes modal
- Works in both full-length test mode and subject practice mode

---

## Sidebar Integration

- Add **"Notes"** link to sidebar navigation between "My Tests" and "Profile"
- Badge showing due card count (integer, fetched once on sidebar mount via `getDueNotes` count query)
- Badge hidden when count is 0

---

## Appwrite Query Functions (in `lib/appwrite/queries.ts`)

| Function | Description |
|---|---|
| `createNote(data)` | Insert new note document |
| `getNotesByUser(userId, filters?)` | List all notes with optional subject/topic filter |
| `getDueNotes(userId)` | List notes where `next_review_at <= now`, ordered by `next_review_at` asc |
| `getDueNotesCount(userId)` | Count of due notes (for sidebar badge) |
| `updateNote(noteId, data)` | Update note fields (used for edits and post-review SRS updates) |
| `deleteNote(noteId)` | Delete a note |

---

## File Structure

```
lib/
  srs/
    engine.ts              ← computeNextReview() pure function

app/(dashboard)/
  notes/
    page.tsx               ← /notes main hub
    new/
      page.tsx             ← /notes/new create card
    review/
      page.tsx             ← /notes/review revision session
    [cardId]/
      page.tsx             ← /notes/[cardId] view/edit

components/
  notes/
    NoteCard.tsx           ← card tile for the grid
    NoteEditor.tsx         ← modal for in-quiz note creation
    FlipCard.tsx           ← flip animation component for review session
    RatingButtons.tsx      ← Again/Hard/Good/Easy buttons
```

---

## Integration Points with Existing Code

### Quiz Session (`app/(dashboard)/quiz/session/page.tsx`)
- Add `showNoteModal` (boolean) and `noteModalPrefill` (string) to component state
- Render `<NoteEditor>` modal controlled by those state values
- Add **"+ Note"** button next to the existing Report flag button in the question header row

### Sidebar (`components/layout/Sidebar.tsx` or equivalent)
- Add Notes nav item with due-count badge
- Fetch count once on mount with `getDueNotesCount(userId)`

---

## Error Handling

- If Appwrite `notes` collection doesn't exist yet: `createNote` fails gracefully with a toast "Notes feature not set up yet — contact admin"
- If no cards are due: `/notes/review` shows an empty state "No cards due — check back later!" with a link to browse all notes
- If `source_question_id` references a deleted question: card still works, source link simply hidden

---

## Out of Scope (not in this version)

- AI-generated card backs from question explanations
- Deck sharing between users
- Card image attachments
- Export to Anki `.apkg` format
- Streak / gamification for review sessions
