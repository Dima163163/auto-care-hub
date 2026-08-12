import { useTranslation } from '@/shared/lib/useTranslation'
import { Skeleton } from '@/components/ui/skeleton'
import { RetryButton } from '@/shared/ui/query-refresh-error'

type OwnerDashboardStateCardProps = {
    state: 'loading' | 'error' | 'offline'
    onRetry?: () => void | Promise<unknown>
}

export function OwnerDashboardStateCard({
    state,
    onRetry,
}: OwnerDashboardStateCardProps) {
    const { t } = useTranslation()

    if (state === 'loading') {
        return (
            <div role="status" className="rounded-xl border bg-card p-8 shadow-sm">
                <span className="sr-only">{t('ownerDashboard.loading')}</span>
                <div className="space-y-3">
                    <Skeleton className="h-5 w-2/5" />
                    <Skeleton className="h-4 w-3/5" />
                    <Skeleton className="h-11 w-full" />
                </div>
            </div>
        )
    }

    return (
        <div role="alert" className="rounded-xl border bg-card p-8 shadow-sm">
            <p className="font-medium text-destructive">
                {state === 'offline' ? t('pwa.offlineTitle') : t('ownerDashboard.failedToLoad')}
            </p>

            <p className="mt-2 text-sm text-muted-foreground">
                {state === 'offline' ? t('pwa.offlineDescription') : t('common.tryAgainLater')}
            </p>
            {onRetry && (
                <RetryButton className="mt-5" onRetry={onRetry} label={t('common.retry')} />
            )}
        </div>
    )
}
