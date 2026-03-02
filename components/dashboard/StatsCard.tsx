import { Card, CardContent } from '@/components/ui/card'
import type { LucideIcon } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: string | number
  subtitle: string
  icon: LucideIcon
  color: string
}

export function StatsCard({ title, value, subtitle, icon: Icon, color }: StatsCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
          <Icon className={`h-8 w-8 ${color}`} />
        </div>
      </CardContent>
    </Card>
  )
}
