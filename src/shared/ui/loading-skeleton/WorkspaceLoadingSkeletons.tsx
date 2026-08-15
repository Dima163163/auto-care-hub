import { Skeleton } from '@/components/ui/skeleton'

import { LoadingRegion, SkeletonAvatar, SkeletonCard, SkeletonText } from './SkeletonPrimitives'

interface GridSkeletonProps {
    label: string
    count?: number
    columns?: 'two' | 'three'
}

export function CardsGridSkeleton({ label, count = 4, columns = 'two' }: GridSkeletonProps) {
    return (
        <LoadingRegion label={label} className={`grid gap-4 ${columns === 'three' ? 'md:grid-cols-3' : 'lg:grid-cols-2'}`}>
            {Array.from({ length: count }, (_, index) => <ContentCardSkeleton key={index} />)}
        </LoadingRegion>
    )
}

export function DashboardSkeleton({ label }: { label: string }) {
    return (
        <LoadingRegion label={label} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <SkeletonCard key={index}><Skeleton className="h-4 w-24" /><Skeleton className="mt-4 h-9 w-14" /><Skeleton className="mt-3 h-3 w-4/5" /></SkeletonCard>)}</div>
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(340px,0.75fr)]"><SkeletonCard className="min-h-80"><Skeleton className="h-6 w-52" /><SkeletonText lines={7} className="mt-6" /></SkeletonCard><SkeletonCard className="min-h-80"><Skeleton className="h-6 w-40" /><SkeletonText lines={6} className="mt-6" /></SkeletonCard></div>
        </LoadingRegion>
    )
}

export function ReviewsSkeleton({ label, count = 3 }: { label: string; count?: number }) {
    return (
        <LoadingRegion label={label} className="space-y-5">
            <SkeletonCard><div className="grid gap-4 lg:grid-cols-[180px_minmax(0,1fr)]"><Skeleton className="h-36 w-full rounded-[var(--radius-card)]" /><div><Skeleton className="h-5 w-44" /><SkeletonText lines={5} className="mt-5" /></div></div></SkeletonCard>
            <div className="grid gap-4 lg:grid-cols-2">{Array.from({ length: count }, (_, index) => <ReviewCardSkeleton key={index} />)}</div>
        </LoadingRegion>
    )
}

export function SplitListSkeleton({ label }: { label: string }) {
    return (
        <LoadingRegion label={label} className="grid gap-5 lg:grid-cols-[minmax(270px,0.7fr)_minmax(0,1.3fr)]">
            <SkeletonCard className="min-h-96"><Skeleton className="h-6 w-36" /><SkeletonText lines={8} className="mt-6" /></SkeletonCard>
            <SkeletonCard className="min-h-96"><Skeleton className="h-6 w-52" /><SkeletonText lines={9} className="mt-6" /></SkeletonCard>
        </LoadingRegion>
    )
}

function ContentCardSkeleton() {
    return <SkeletonCard><div className="flex items-start gap-3"><SkeletonAvatar /><div className="min-w-0 flex-1"><Skeleton className="h-5 w-2/5" /><Skeleton className="mt-2 h-3 w-3/5" /></div></div><SkeletonText lines={3} className="mt-5" /><Skeleton className="mt-5 h-10 w-32 rounded-[var(--radius-control)]" /></SkeletonCard>
}

function ReviewCardSkeleton() {
    return <SkeletonCard className="min-h-56"><div className="flex items-center gap-3"><SkeletonAvatar /><div><Skeleton className="h-4 w-28" /><Skeleton className="mt-2 h-3 w-20" /></div></div><Skeleton className="mt-4 h-4 w-24" /><SkeletonText lines={4} className="mt-4" /></SkeletonCard>
}
