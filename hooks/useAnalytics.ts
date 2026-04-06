// hooks/useAnalytics.ts
import posthog from 'posthog-js'

export type EventName =
  // ── Existing ──────────────────────────────────────────────────────
  | 'user_signed_up'
  | 'user_logged_in'
  | 'onboarding_completed'
  | 'mock_test_started'
  | 'subject_practice_started'
  | 'quiz_submitted'
  | 'test_reviewed'
  | 'test_retaken'
  | 'note_created'
  | 'note_review_started'
  | 'note_rated'
  | 'intelligence_viewed'
  // ── Quiz & Test ────────────────────────────────────────────────────
  | 'question_answered'
  | 'question_skipped'
  | 'question_flagged'
  | 'answer_changed'
  | 'lifeline_used'
  | 'quiz_completed'
  | 'results_tab_viewed'
  // ── Navigation & Engagement ────────────────────────────────────────
  | 'page_viewed'
  | 'tab_switched'
  | 'mock_card_viewed'
  | 'weak_area_clicked'
  | 'dashboard_section_viewed'
  // ── Flash Cards ────────────────────────────────────────────────────
  | 'flashcard_created'
  | 'flashcard_review_started'
  | 'flashcard_rated'
  | 'flashcard_session_completed'
  // ── Intelligence & Retention ───────────────────────────────────────
  | 'intelligence_section_viewed'
  | 'session_ended'
  | 'streak_milestone'

export function useAnalytics() {
  return {
    track: (event: EventName, props?: Record<string, unknown>) =>
      posthog.capture(event, props),
    identify: (userId: string, traits: Record<string, unknown>) =>
      posthog.identify(userId, traits),
    reset: () => posthog.reset(),
  }
}
