import type { ReactNode } from 'react'

import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface LoadingRegionProps {
    label: string
    children: ReactNode
    className?: string
}

interface SkeletonTextProps {
    lines?: number
    className?: string
}

export function LoadingRegion({ label, children, className }: LoadingRegionProps) {
    return (
        <section
            role="status"
            aria-label={label}
            aria-busy="true"
            className={cn('animate-in fade-in-0 duration-200', className)}
        >
            <div aria-hidden="true">{children}</div>
        </section>
    )
}

export function SkeletonText({ lines = 3, className }: SkeletonTextProps) {
    return (
        <div className={cn('grid gap-2', className)}>
            {Array.from({ length: lines }, (_, index) => (
                <Skeleton
                    key={index}
                    className={cn(
                        'h-3.5',
                        index === lines - 1 ? 'w-3/5' : index === 0 ? 'w-4/5' : 'w-full',
                    )}
                />
            ))}
        </div>
    )
}

export function SkeletonCard({ children, className }: { children: ReactNode; className?: string }) {
    return <div className={cn('rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm', className)}>{children}</div>
}

export function SkeletonAvatar() {
    return <Skeleton className="size-10 shrink-0 rounded-full" />
}
