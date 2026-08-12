import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export type StatusBadgeVariant =
    | 'danger'
    | 'info'
    | 'neutral'
    | 'success'
    | 'warning'

type StatusBadgeProps = {
    children: ReactNode
    variant: StatusBadgeVariant
    className?: string
}

const variantClassNames: Record<StatusBadgeVariant, string> = {
    danger: 'border-status-danger-border bg-status-danger-surface text-status-danger-foreground',
    info: 'border-status-info-border bg-status-info-surface text-status-info-foreground',
    neutral: 'border-status-neutral-border bg-status-neutral-surface text-status-neutral-foreground',
    success: 'border-status-success-border bg-status-success-surface text-status-success-foreground',
    warning: 'border-status-warning-border bg-status-warning-surface text-status-warning-foreground',
}

export function StatusBadge({ children, variant, className }: StatusBadgeProps) {
    return (
        <span
            className={cn(
                'inline-flex rounded-full border px-2.5 py-1 text-xs font-medium',
                variantClassNames[variant],
                className,
            )}
        >
            {children}
        </span>
    )
}
