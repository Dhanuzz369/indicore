-- ──────────────────────────────────────────────────────────────
-- Fix: activate all uploaded INDICORE_MOCK questions
-- Bulk-uploaded questions often arrive with is_active = NULL or false.
-- This sets them all active so they appear in subject-wise mock.
-- ──────────────────────────────────────────────────────────────
UPDATE questions
SET is_active = true
WHERE exam_type = 'INDICORE_MOCK'
  AND (is_active IS NULL OR is_active = false);

-- ──────────────────────────────────────────────────────────────
-- Remove the "History Intensive Mock" full-mock card.
-- History questions should only appear in subject-wise mock,
-- not as a standalone full-length mock card.
-- ──────────────────────────────────────────────────────────────
UPDATE mocks
SET is_active = false
WHERE name ILIKE '%history%intensive%'
   OR name ILIKE '%history%mock%'
   OR (
     subject_weights::text ILIKE '%history%'
     AND jsonb_array_length(subject_weights) = 1
   );

-- Verify counts after running this migration:
-- SELECT exam_type, COUNT(*), SUM(CASE WHEN is_active THEN 1 ELSE 0 END) as active_count
-- FROM questions GROUP BY exam_type;
