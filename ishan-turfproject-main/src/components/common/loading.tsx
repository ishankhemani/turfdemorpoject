import { motion } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface LoadingStateProps {
  type?: 'card' | 'table' | 'list' | 'chart'
  count?: number
  className?: string
}

export function LoadingState({ type = 'card', count = 4, className }: LoadingStateProps) {
  if (type === 'card') {
    return (
      <div className={cn('grid gap-4 md:grid-cols-2 lg:grid-cols-4', className)}>
        {Array.from({ length: count }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-12 w-12 rounded-xl" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (type === 'table') {
    return (
      <div className={cn('space-y-3', className)}>
        <div className="flex gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex gap-4">
            {Array.from({ length: 5 }).map((_, j) => (
              <Skeleton key={j} className="h-12 flex-1" />
            ))}
          </div>
        ))}
      </div>
    )
  }

  if (type === 'list') {
    return (
      <div className={cn('space-y-3', className)}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (type === 'chart') {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <Skeleton className="h-4 w-32 mb-4" />
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    )
  }

  return null
}

export function PageLoadingState() {
  return (
    <div className="flex h-[50vh] items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4"
      >
        <div className="relative">
          <div className="h-12 w-12 rounded-full border-4 border-primary/30" />
          <motion.div
            className="absolute inset-0 h-12 w-12 rounded-full border-4 border-primary border-t-transparent"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
        </div>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </motion.div>
    </div>
  )
}
