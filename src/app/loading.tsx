import { Skeleton } from '@/components/ui/primitives'

export default function Loading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <div className="grid gap-4 sm:grid-cols-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
      <Skeleton className="h-80 w-full rounded-2xl" />
    </div>
  )
}
