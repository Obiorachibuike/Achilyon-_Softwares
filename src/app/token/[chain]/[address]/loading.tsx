import { Skeleton } from '@/components/ui/primitives'

export default function Loading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading token">
      <div className="flex items-center gap-4"><Skeleton className="h-14 w-14 rounded-full" /><div className="space-y-2"><Skeleton className="h-6 w-48" /><Skeleton className="h-4 w-32" /></div></div>
      <Skeleton className="h-16 w-full rounded-2xl" />
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]"><Skeleton className="h-[440px] rounded-2xl" /><Skeleton className="h-[440px] rounded-2xl" /></div>
    </div>
  )
}
