import { motion } from 'framer-motion'
import { type LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  description?: string
  trend?: number
  trendLabel?: string
  className?: string
  iconClassName?: string
  delay?: number
}

export function StatCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  trendLabel,
  className,
  iconClassName,
  delay = 0,
}: StatCardProps) {
  const getTrendIcon = () => {
    if (trend === undefined || trend === 0) return Minus
    return trend > 0 ? TrendingUp : TrendingDown
  }

  const getTrendColor = () => {
    if (trend === undefined || trend === 0) return 'text-muted-foreground'
    return trend > 0 ? 'text-success' : 'text-destructive'
  }

  const TrendIcon = getTrendIcon()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: delay * 0.1 }}
    >
      <Card className={cn('relative overflow-hidden', className)} hover>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground mb-1">
                {title}
              </p>
              <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
              {description && (
                <p className="text-xs text-muted-foreground mt-1">
                  {description}
                </p>
              )}
              {trend !== undefined && (
                <div className={cn('flex items-center gap-1 mt-2', getTrendColor())}>
                  <TrendIcon className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">
                    {Math.abs(trend).toFixed(1)}%
                  </span>
                  {trendLabel && (
                    <span className="text-xs text-muted-foreground">
                      {trendLabel}
                    </span>
                  )}
                </div>
              )}
            </div>
            <div
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary',
                iconClassName
              )}
            >
              <Icon className="h-6 w-6" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
