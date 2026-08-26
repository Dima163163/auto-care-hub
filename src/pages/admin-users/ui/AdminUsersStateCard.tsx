import { useTranslation } from '@/shared/lib/useTranslation'
import { Skeleton } from '@/components/ui/skeleton'
import { RetryButton } from '@/shared/ui/query-refresh-error'

type AdminUsersStateCardProps = {
    description?: string
    onRetry?: () => void | Promise<unknown>
    state: 'loading' | 'error' | 'empty' | 'offline' | 'permission-denied' | 'session-expired'
}

export function AdminUsersStateCard({
    description,
    onRetry,
    state,
}: AdminUsersStateCardProps) {
    const { t } = useTranslation()

    if (state === 'loading') {
        return (
            <div role="status" className="rounded-xl border bg-card p-8 shadow-sm">
                <span className="sr-only">{t('adminUsers.loading')}</span>
                <div className="space-y-3">
                    <Skeleton className="h-5 w-2/5" />
                    <Skeleton className="h-4 w-3/5" />
                    <Skeleton className="h-11 w-full" />
                </div>
            </div>
        )
    }

    if (state === 'error' || state === 'offline' || state === 'permission-denied' || state === 'session-expired') {
        return (
            <div role="alert" className="rounded-xl border bg-card p-8 shadow-sm">
                <p className="font-medium text-destructive">
                    {state === 'permission-denied'
                        ? t('errors.FORBIDDEN')
                        : state === 'session-expired'
                            ? t('auth.sessionExpiredTitle')
                        : state === 'offline'
                            ? t('pwa.offlineTitle')
                            : t('adminUsers.failedToLoad')}
                </p>

                <p className="mt-2 text-sm text-muted-foreground">
                    {state === 'offline'
                        ? t('pwa.offlineDescription')
                        : state === 'session-expired'
                            ? t('auth.sessionExpiredDescription')
                            : description}
                </p>
                {onRetry && state !== 'permission-denied' && (
                    <RetryButton className="mt-5" onRetry={onRetry} label={state === 'session-expired' ? t('auth.signIn') : t('common.retry')} />
                )}
            </div>
        )
    }

    return (
        <div role="status" className="rounded-xl border bg-card p-8 shadow-sm">
            <p className="font-medium">
                {t('adminUsers.emptyTitle')}
            </p>

            <p className="mt-2 text-sm text-muted-foreground">
                {t('adminUsers.emptyDescription')}
            </p>
        </div>
    )
}
