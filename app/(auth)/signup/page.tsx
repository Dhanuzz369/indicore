'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { signUp, signInWithGoogle } from '@/lib/appwrite/auth'
import { createProfile, createUserStats } from '@/lib/appwrite/queries'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, Eye, EyeOff, Trophy } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────
// VALIDATION SCHEMA
// ─────────────────────────────────────────────────────────────────
const signupSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

type SignupFormData = z.infer<typeof signupSchema>

export default function SignupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // ─────────────────────────────────────────────────────────────────
  // REACT HOOK FORM SETUP
  // ─────────────────────────────────────────────────────────────────
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  })

  // ─────────────────────────────────────────────────────────────────
  // EMAIL/PASSWORD SIGNUP HANDLER
  // ─────────────────────────────────────────────────────────────────
  const onSubmit = async (data: SignupFormData) => {
    setLoading(true)

    try {
      // Step 1: Create Appwrite account and session
      const user = await signUp(data.email, data.password, data.fullName)
      
      // Step 2: Create user profile in database
      await createProfile(user.$id, data.fullName)
      
      // Step 3: Initialize user statistics
      await createUserStats(user.$id)
      
      toast.success('Account created successfully!')
      
      // Step 4: Redirect to onboarding
      router.push('/onboarding')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create account. Please try again.')
      setLoading(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // GOOGLE OAUTH HANDLER
  // ─────────────────────────────────────────────────────────────────
  const handleGoogleSignup = () => {
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
            <h2 className="text-4xl font-bold mb-4">Start Your Journey</h2>
            <p className="text-lg opacity-90">
              Join thousands of UPSC aspirants preparing with Indicore. Practice with previous year questions and track your progress.
            </p>
          </div>
        </div>
        <div className="space-y-3 text-sm opacity-75">
          <p>✓ 10,000+ previous year questions</p>
          <p>✓ Instant answer validation</p>
          <p>✓ Detailed performance analytics</p>
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
            <CardTitle className="text-2xl font-bold">Create your account</CardTitle>
            <CardDescription>
              Start your exam preparation journey today
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* ─────────────────────────────────────────────────────────────
                SIGNUP FORM
                ───────────────────────────────────────────────────────────── */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Full Name Field */}
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  {...register('fullName')}
                  disabled={loading}
                  className={errors.fullName ? 'border-red-500 focus-visible:ring-red-500' : ''}
                />
                {errors.fullName && (
                  <p className="text-sm text-red-600">{errors.fullName.message}</p>
                )}
              </div>

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
                <Label htmlFor="password">Password</Label>
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

              {/* Confirm Password Field with Toggle */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    {...register('confirmPassword')}
                    disabled={loading}
                    className={errors.confirmPassword ? 'border-red-500 focus-visible:ring-red-500 pr-10' : 'pr-10'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    disabled={loading}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>
                )}
              </div>

              {/* Sign Up Button */}
              <Button 
                type="submit" 
                className="w-full bg-[#FF6B00] hover:bg-[#FF8C00]" 
                disabled={loading}
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Sign Up'
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
                <span className="bg-card px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            {/* ─────────────────────────────────────────────────────────────
                GOOGLE OAUTH BUTTON
                ───────────────────────────────────────────────────────────── */}
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogleSignup}
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
              Sign up with Google
            </Button>
          </CardContent>

          {/* ─────────────────────────────────────────────────────────────
              FOOTER LINK
              ───────────────────────────────────────────────────────────── */}
          <CardFooter className="flex justify-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-[#FF6B00] hover:underline">
                Log in
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
