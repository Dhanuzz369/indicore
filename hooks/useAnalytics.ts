import posthog from 'posthog-js'

export type EventName =
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

export function useAnalytics() {
  return {
    track: (event: EventName, props?: Record<string, unknown>) =>
      posthog.capture(event, props),
    identify: (userId: string, traits: Record<string, unknown>) =>
      posthog.identify(userId, traits),
    reset: () => posthog.reset(),
  }
}
