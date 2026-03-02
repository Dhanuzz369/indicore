'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { signIn, signInWithGoogle } from '@/lib/appwrite/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, Eye, EyeOff, Trophy } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────
// VALIDATION SCHEMA
// ─────────────────────────────────────────────────────────────────
const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // ─────────────────────────────────────────────────────────────────
  // REACT HOOK FORM SETUP
  // ─────────────────────────────────────────────────────────────────
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  // ─────────────────────────────────────────────────────────────────
  // EMAIL/PASSWORD LOGIN HANDLER
  // ─────────────────────────────────────────────────────────────────
  const onSubmit = async (data: LoginFormData) => {
    setLoading(true)

    try {
      await signIn(data.email, data.password)
      toast.success('Welcome back!')
      
      // Small delay to ensure session cookie is set
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Force a hard navigation to ensure middleware picks up the session
      window.location.href = '/dashboard'
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Invalid credentials. Please try again.')
      setLoading(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // GOOGLE OAUTH HANDLER
  // ─────────────────────────────────────────────────────────────────
  const handleGoogleLogin = () => {
    setGoogleLoading(true)
    signInWithGoogle()
  }

  return (
    <div className="min-h-screen flex">
      {/* ─────────────────────────────────────────────────────────────────
          LEFT DECORATIVE PANEL (Hidden on mobile)
          ───────────────────────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#FF6B00] to-[#FF8C00] p-12 flex-col justify-between text-white">
        <div>
          <div className="flex items-center gap-3 mb-8">
            <Trophy className="h-10 w-10" />
            <h1 className="text-3xl font-bold">Indicore</h1>
          </div>
          <div className="max-w-md">
            <h2 className="text-4xl font-bold mb-4">Master UPSC & PSC Prelims</h2>
            <p className="text-lg opacity-90">
              Practice with 10,000+ previous year questions. Get instant explanations. Track your progress. Ace your exam.
            </p>
          </div>
        </div>
        <div className="text-sm opacity-75">
          <p>Join thousands of aspirants preparing with Indicore</p>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────
          RIGHT FORM PANEL
          ───────────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-2 lg:hidden mb-4">
              <Trophy className="h-8 w-8 text-[#FF6B00]" />
              <span className="text-2xl font-bold">Indicore</span>
            </div>
            <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
            <CardDescription>
              Sign in to continue your exam preparation
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* ─────────────────────────────────────────────────────────────
                EMAIL/PASSWORD FORM
                ───────────────────────────────────────────────────────────── */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  {...register('email')}
                  disabled={loading}
                  className={errors.email ? 'border-red-500 focus-visible:ring-red-500' : ''}
                />
                {errors.email && (
                  <p className="text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              {/* Password Field with Toggle */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link 
                    href="#" 
                    className="text-sm text-[#FF6B00] hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    {...register('password')}
                    disabled={loading}
                    className={errors.password ? 'border-red-500 focus-visible:ring-red-500 pr-10' : 'pr-10'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>

              {/* Login Button */}
              <Button 
                type="submit" 
                className="w-full bg-[#FF6B00] hover:bg-[#FF8C00]" 
                disabled={loading}
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            {/* ─────────────────────────────────────────────────────────────
                DIVIDER
                ───────────────────────────────────────────────────────────── */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            {/* ─────────────────────────────────────────────────────────────
                GOOGLE OAUTH BUTTON
                ───────────────────────────────────────────────────────────── */}
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogleLogin}
              disabled={loading || googleLoading}
              size="lg"
            >
              {googleLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
              )}
              Continue with Google
            </Button>
          </CardContent>

          {/* ─────────────────────────────────────────────────────────────
              FOOTER LINK
              ───────────────────────────────────────────────────────────── */}
          <CardFooter className="flex justify-center">
            <p className="text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="font-medium text-[#FF6B00] hover:underline">
                Sign up
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
