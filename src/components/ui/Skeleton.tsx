import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
}

/**
 * Reusable skeleton primitive — use className for sizing.
 * Example: <Skeleton className="h-4 w-32 rounded" />
 *
 * Colors are calibrated to both light (slate-200) and dark (slate-700) themes.
 */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded bg-slate-200 dark:bg-slate-700',
        className
      )}
    />
  )
}
