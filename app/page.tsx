// app/page.tsx
import { redirect } from 'next/navigation'
import LandingPage from '@/components/landing/LandingPage'

interface Props {
  searchParams: Promise<{ code?: string; next?: string; error?: string }>
}

// Supabase sometimes redirects the OAuth code to the Site URL (root page) if the
// exact redirectTo URL isn't whitelisted in the Supabase dashboard.
// Intercept that here and forward to the real callback handler.
export default async function HomePage({ searchParams }: Props) {
  const params = await searchParams
  if (params.code) {
    const next = params.next ?? '/dashboard'
    // Validate next is a safe relative path
    const safePath = next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard'
    redirect(`/auth/callback?code=${params.code}&next=${encodeURIComponent(safePath)}`)
  }

  return <LandingPage />
}
