import { Card, Skeleton } from '@/components/ui/primitives'

export function MarketListSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading markets">
      <div className="space-y-2"><Skeleton className="h-7 w-48" /><Skeleton className="h-4 w-80 max-w-full" /></div>
      <Skeleton className="h-9 w-full max-w-xl" />
      <Card className="space-y-3 p-4">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-10 w-full" />)}</Card>
    </div>
  )
}
