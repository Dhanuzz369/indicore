'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { confirmPasswordRecovery } from '@/lib/supabase/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, Trophy, ShieldCheck, AlertCircle, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const userId = searchParams.get('userId') ?? ''
  const secret = searchParams.get('secret') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errors, setErrors] = useState<{ password?: string; confirm?: string; general?: string }>({})

  // Validate params on mount
  const missingParams = !userId || !secret

  const validate = () => {
    const e: typeof errors = {}
    if (password.length < 8) e.password = 'Password must be at least 8 characters.'
    if (password !== confirm) e.confirm = 'Passwords do not match.'
    return e
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setErrors({})
    setLoading(true)
    try {
      await confirmPasswordRecovery(userId, secret, password)
      setSuccess(true)
      toast.success('Password updated successfully!')
      setTimeout(() => router.push('/login'), 2000)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Recovery link is invalid or has expired.'
      setErrors({ general: msg })
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  if (missingParams) {
    return (
      <div className="text-center space-y-4 py-8">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="h-8 w-8 text-red-500" />
        </div>
        <h3 className="font-bold text-gray-900 text-lg">Invalid Reset Link</h3>
        <p className="text-sm text-gray-500 max-w-xs mx-auto">
          This password reset link is invalid or has expired. Please request a new one.
        </p>
        <Button asChild className="bg-[#FF6B00] hover:bg-[#FF8C00]">
          <Link href="/forgot-password">Request New Link</Link>
        </Button>
      </div>
    )
  }

  if (success) {
    return (
      <div className="text-center space-y-4 py-8">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
          <ShieldCheck className="h-8 w-8 text-emerald-600" />
        </div>
        <h3 className="font-bold text-gray-900 text-lg">Password Updated!</h3>
        <p className="text-sm text-gray-500">Redirecting you to login…</p>
        <Button asChild className="bg-[#FF6B00] hover:bg-[#FF8C00]">
          <Link href="/login">Sign In Now</Link>
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errors.general && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700">{errors.general}</p>
        </div>
      )}

      {/* New password */}
      <div className="space-y-2">
        <Label htmlFor="new-password">New Password</Label>
        <div className="relative">
          <Input
            id="new-password"
            type={showPw ? 'text' : 'password'}
            placeholder="Min. 8 characters"
            value={password}
            onChange={e => setPassword(e.target.value)}
            disabled={loading}
            className={`pr-10 ${errors.password ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
          />
          <button
            type="button"
            onClick={() => setShowPw(!showPw)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
          >
            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.password && <p className="text-sm text-red-600">{errors.password}</p>}
      </div>

      {/* Confirm password */}
      <div className="space-y-2">
        <Label htmlFor="confirm-password">Confirm New Password</Label>
        <div className="relative">
          <Input
            id="confirm-password"
            type={showConfirm ? 'text' : 'password'}
            placeholder="Re-enter your new password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            disabled={loading}
            className={`pr-10 ${errors.confirm ? 'border-red-400 focus-visible:ring-red-400' : ''}`}
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
          >
            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {errors.confirm && <p className="text-sm text-red-600">{errors.confirm}</p>}
      </div>

      <Button
        id="reset-password-btn"
        type="submit"
        className="w-full bg-[#FF6B00] hover:bg-[#FF8C00]"
        disabled={loading}
        size="lg"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Updating password…
          </>
        ) : 'Update Password'}
      </Button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#FF6B00] to-[#FF8C00] p-12 flex-col justify-between text-white">
        <div>
          <div className="flex items-center gap-3 mb-8">
            <Trophy className="h-10 w-10" />
            <h1 className="text-3xl font-bold">Indicore</h1>
          </div>
          <div className="max-w-md">
            <h2 className="text-4xl font-bold mb-4">Create a new password</h2>
            <p className="text-lg opacity-90">
              Choose a strong password to keep your account secure and get back to practicing.
            </p>
          </div>
        </div>
        <p className="text-sm opacity-75">Secure, fast, trusted by aspirants.</p>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-2 lg:hidden mb-4">
              <Trophy className="h-8 w-8 text-[#FF6B00]" />
              <span className="text-2xl font-bold">Indicore</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#FF6B00]/10 rounded-xl flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 text-[#FF6B00]" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold">Set new password</CardTitle>
                <CardDescription>Enter and confirm your new password below</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <Suspense fallback={<div className="h-20 flex items-center justify-center"><Loader2 className="animate-spin h-5 w-5 text-gray-400" /></div>}>
              <ResetPasswordForm />
            </Suspense>
          </CardContent>

          <CardFooter className="flex justify-center">
            <p className="text-sm text-muted-foreground">
              <Link href="/login" className="font-semibold text-[#FF6B00] hover:underline">
                Back to Sign in
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
