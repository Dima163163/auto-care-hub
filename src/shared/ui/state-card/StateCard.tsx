import { AlertTriangle, Ban, CloudOff, Inbox, LockKeyhole } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

export type StateCardVariant =
    | 'default'
    | 'error'
    | 'loading'
    | 'offline'
    | 'permission-denied'
    | 'stale'
    | 'stale-error'
    | 'empty'
    | 'suspended'

type StateCardProps = {
    title?: string
    description?: string
    variant?: StateCardVariant
    children?: ReactNode
    action?: ReactNode
    className?: string
}

export function StateCard({
  title,
  description,
  variant = 'default',
  children,
  action,
  className,
}: StateCardProps) {
    const isError = variant === 'error' || variant === 'suspended'
    const isAlert = isError || variant === 'offline' || variant === 'permission-denied' || variant === 'stale-error'
    const isLoading = variant === 'loading'
    const Icon = variant === 'offline'
        ? CloudOff
        : variant === 'permission-denied'
            ? LockKeyhole
            : variant === 'suspended'
                ? Ban
                : variant === 'empty'
                    ? Inbox
                : variant === 'stale' || variant === 'stale-error'
                        ? AlertTriangle
                        : null

    return (
        <div
            role={isAlert ? 'alert' : 'status'}
            aria-live={isAlert ? 'assertive' : 'polite'}
            aria-busy={isLoading || undefined}
            data-state={variant}
            className={cn(
                'rounded-lg border bg-card p-6 shadow-sm',
                isError && 'border-status-danger-border bg-status-danger-surface',
                variant === 'offline' && 'border-status-warning-border bg-status-warning-surface',
                variant === 'permission-denied' && 'border-status-neutral-border bg-status-neutral-surface',
                variant === 'stale' && 'border-status-warning-border bg-status-warning-surface',
                variant === 'stale-error' && 'border-status-warning-border bg-status-warning-surface',
                isLoading && 'space-y-3',
                className,
            )}
        >
            {isLoading && (
                <>
                    <span className="sr-only">{title ?? description}</span>
                    <div aria-hidden="true" className="space-y-3">
                        <Skeleton className="h-5 w-2/5" />
                        <Skeleton className="h-4 w-4/5" />
                        <Skeleton className="h-4 w-3/5" />
                    </div>
                </>
            )}

            {!isLoading && (Icon || title) && (
                <div className="flex items-start gap-3">
                    {Icon && <span aria-hidden="true" className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-primary/10 text-primary"><Icon className="size-4" /></span>}
                    {title && <p
                    className={cn(
                        'font-medium',
                        isError
                            ? 'text-status-danger-foreground'
                            : variant === 'offline' || variant === 'stale' || variant === 'stale-error'
                                ? 'text-status-warning-foreground'
                                : 'text-foreground',
                    )}
                >
                    {title}
                </p>}
                </div>
            )}

            {!isLoading && description && (
                <p
                    className={cn(
                        title && 'mt-2',
                        'text-sm',
                        isError
                            ? 'text-status-danger-foreground'
                            : variant === 'offline' || variant === 'stale' || variant === 'stale-error'
                                ? 'text-status-warning-foreground'
                                : 'text-muted-foreground',
                    )}
                >
                    {description}
                </p>
            )}

            {!isLoading && children && (
                <div className={cn((title || description) && 'mt-4')}>
                    {children}
                </div>
            )}

            {!isLoading && action && (
                <div className={cn((title || description || children) && 'mt-5')}>
                    {action}
                </div>
            )}
        </div>
    )
}
