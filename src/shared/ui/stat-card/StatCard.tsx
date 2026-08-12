import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type StatCardProps = {
    description: ReactNode
    label: ReactNode
    value: ReactNode
    secondaryDescription?: ReactNode
    className?: string
}

export function StatCard({
    description,
    label,
    value,
    secondaryDescription,
    className,
}: StatCardProps) {
    return (
        <div className={cn('rounded-lg border bg-card p-6 shadow-sm', className)}>
            <p className="text-sm text-muted-foreground">{label}</p>

            <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>

            <p className="mt-2 text-sm text-muted-foreground">{description}</p>

            {secondaryDescription && (
                <p className="mt-1 text-sm text-muted-foreground">
                    {secondaryDescription}
                </p>
            )}
        </div>
    )
}
