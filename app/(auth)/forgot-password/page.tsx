'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Link from 'next/link'
import { sendPasswordRecovery } from '@/lib/supabase/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, Trophy, KeyRound, CheckCircle } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.')
      return
    }

    setLoading(true)
    try {
      await sendPasswordRecovery(email)
      setSent(true)
      toast.success('Recovery email sent! Check your inbox.')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#4A90E2] to-[#3a7fd4] p-12 flex-col justify-between text-white">
        <div>
          <div className="flex items-center gap-3 mb-8">
            <Trophy className="h-10 w-10" />
            <h1 className="text-3xl font-bold">Indicore</h1>
          </div>
          <div className="max-w-md">
            <h2 className="text-4xl font-bold mb-4">Forgot your password?</h2>
            <p className="text-lg opacity-90">
              No worries. Enter your email and we'll send you a secure link to reset your password instantly.
            </p>
          </div>
        </div>
        <p className="text-sm opacity-75">Join thousands of aspirants preparing with Indicore</p>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-2 lg:hidden mb-4">
              <Trophy className="h-8 w-8 text-[#4A90E2]" />
              <span className="text-2xl font-bold">Indicore</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#4A90E2]/10 rounded-xl flex items-center justify-center">
                <KeyRound className="h-5 w-5 text-[#4A90E2]" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold">Reset your password</CardTitle>
                <CardDescription>We'll send you a secure recovery link</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {sent ? (
              <div className="text-center space-y-4 py-6">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="h-8 w-8 text-emerald-600" />
                </div>
                <h3 className="font-bold text-gray-900 text-lg">Email sent!</h3>
                <p className="text-sm text-gray-500 max-w-xs mx-auto">
                  We've sent a password reset link to <strong>{email}</strong>. Check your inbox and spam folder.
                </p>
                <p className="text-xs text-gray-400">The link expires in 1 hour.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="recovery-email">Email address</Label>
                  <Input
                    id="recovery-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    disabled={loading}
                    autoFocus
                    className={error ? 'border-red-400 focus-visible:ring-red-400' : ''}
                  />
                  {error && <p className="text-sm text-red-600">{error}</p>}
                </div>

                <Button
                  id="send-reset-btn"
                  type="submit"
                  className="w-full bg-[#4A90E2] hover:bg-[#3a7fd4]"
                  disabled={loading}
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending reset link…
                    </>
                  ) : 'Send reset link'}
                </Button>
              </form>
            )}
          </CardContent>

          <CardFooter className="flex justify-center">
            <p className="text-sm text-muted-foreground">
              Remembered it?{' '}
              <Link href="/login" className="font-semibold text-[#4A90E2] hover:underline">
                Back to Sign in
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
