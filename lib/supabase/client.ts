// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Exported so profile/page.tsx import doesn't need to change.
// 'avatars' is the Supabase storage bucket name (always configured).
export const STORAGE_BUCKET_ID = 'avatars'
