// app/(admin)/admin/layout.tsx
import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAIL = 'indicoredotai@gmail.com'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Use service role to read the current auth session server-side
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  // Read the auth cookie — Next.js passes cookies automatically in server components
  const { data: { session } } = await sb.auth.getSession()

  if (!session || session.user.email !== ADMIN_EMAIL) {
    redirect('/dashboard')
  }

  return <>{children}</>
}
