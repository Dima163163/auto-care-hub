import { useTranslation } from '@/shared/lib/useTranslation'
import { Skeleton } from '@/components/ui/skeleton'
import { RetryButton } from '@/shared/ui/query-refresh-error'

type AdminCabinetsStateCardProps = {
    description?: string
    onRetry?: () => void | Promise<unknown>
    state: 'loading' | 'error' | 'empty'
}

export function AdminCabinetsStateCard({
    description,
    onRetry,
    state,
}: AdminCabinetsStateCardProps) {
    const { t } = useTranslation()

    if (state === 'loading') {
        return (
            <div role="status" className="rounded-xl border bg-card p-8 shadow-sm">
                <span className="sr-only">{t('adminCabinets.loading')}</span>
                <div className="space-y-3">
                    <Skeleton className="h-5 w-2/5" />
                    <Skeleton className="h-4 w-3/5" />
                    <Skeleton className="h-11 w-full" />
                </div>
            </div>
        )
    }

    if (state === 'error') {
        return (
            <div role="alert" className="rounded-xl border bg-card p-8 shadow-sm">
                <p className="font-medium text-destructive">
                    {t('adminCabinets.failedToLoad')}
                </p>

                <p className="mt-2 text-sm text-muted-foreground">
                    {description}
                </p>
                {onRetry && (
                    <RetryButton className="mt-5" onRetry={onRetry} label={t('common.retry')} />
                )}
            </div>
        )
    }

    return (
        <div role="status" className="rounded-xl border bg-card p-8 shadow-sm">
            <p className="font-medium">
                {t('adminCabinets.emptyTitle')}
            </p>

            <p className="mt-2 text-sm text-muted-foreground">
                {t('adminCabinets.emptyDescription')}
            </p>
        </div>
    )
}
