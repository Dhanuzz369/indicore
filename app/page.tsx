import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-white">
      <div className="text-center space-y-8 px-6 max-w-2xl">
        {/* Logo/Title */}
        <h1 className="text-6xl font-bold text-saffron">
          Indicore
        </h1>

        {/* Tagline */}
        <p className="text-xl text-gray-600 max-w-lg mx-auto">
          Master UPSC & PSC Prelims with Previous Year Questions
        </p>

        {/* CTA Buttons */}
        <div className="flex gap-4 justify-center pt-4">
          <Link href="/signup">
            <Button size="lg" className="bg-saffron hover:bg-[#FF8C00] text-white px-8">
              Get Started
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="px-8 border-saffron text-saffron hover:bg-orange-50">
              Login
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
