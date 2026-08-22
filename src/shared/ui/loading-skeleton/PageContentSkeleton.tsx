import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

import { LoadingRegion, SkeletonText } from './SkeletonPrimitives'

type PageContentSkeletonProps = {
    label: string
    tone?: 'public' | 'workspace' | 'auth'
}

export function PageContentSkeleton({ label, tone = 'public' }: PageContentSkeletonProps) {
    return (
        <LoadingRegion
            label={label}
            className={cn(
                'min-h-[min(720px,calc(100vh-9rem))] px-[var(--layout-gutter)] py-7 lg:py-10',
                tone === 'auth' && 'flex min-h-[520px] items-center justify-center',
            )}
        >
            <div className={cn('mx-auto w-full max-w-[var(--layout-operational-max)] space-y-6', tone === 'auth' && 'max-w-md')}>
                <div className="space-y-3">
                    <Skeleton className="h-3 w-36" />
                    <Skeleton className="h-10 w-2/3 max-w-xl" />
                    <Skeleton className="h-4 w-full max-w-2xl" />
                </div>
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)]">
                    <div className="grid gap-5">
                        <SkeletonCardPlaceholder />
                        <SkeletonCardPlaceholder lines={5} />
                    </div>
                    <SkeletonCardPlaceholder lines={6} />
                </div>
            </div>
        </LoadingRegion>
    )
}

function SkeletonCardPlaceholder({ lines = 4 }: { lines?: number }) {
    return (
        <div className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm">
            <Skeleton className="h-6 w-44" />
            <SkeletonText lines={lines} className="mt-5" />
            <Skeleton className="mt-6 h-10 w-36 rounded-[var(--radius-control)]" />
        </div>
    )
}
