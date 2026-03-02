'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowRight } from 'lucide-react'
import type { Subject } from '@/types'

interface SubjectGridProps {
  subjects: Subject[]
}

export function SubjectGrid({ subjects }: SubjectGridProps) {
  const router = useRouter()

  // Handle empty subjects
  if (!subjects || subjects.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No subjects available yet.</p>
        <p className="text-sm mt-2">Check back later for practice materials.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {subjects.map((subject) => (
        <Card
          key={subject.$id}
          className="hover:shadow-md transition-shadow duration-200 cursor-pointer group"
          onClick={() => router.push(`/quiz?subject=${subject.slug}`)}
        >
          <CardContent className="p-4">
            {/* Left colored border */}
            <div
              className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
              style={{ backgroundColor: subject.color || '#FF6B00' }}
            />
            
            <div className="space-y-2">
              <h3 className="font-semibold text-base">{subject.name}</h3>
              
              <div className="flex items-center text-sm text-[#FF6B00] group-hover:translate-x-1 transition-transform">
                <span>Practice</span>
                <ArrowRight className="h-4 w-4 ml-1" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
