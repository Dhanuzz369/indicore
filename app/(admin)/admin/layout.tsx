// app/(admin)/admin/layout.tsx
import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const ADMIN_EMAIL = 'indicoredotai@gmail.com'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()

  // Use anon key + SSR client so it can read the auth cookie
  const sb = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() { /* read-only in layout */ },
      },
    }
  )

  const { data: { session } } = await sb.auth.getSession()

  if (!session || session.user.email !== ADMIN_EMAIL) {
    redirect('/dashboard')
  }

  return <>{children}</>
}
