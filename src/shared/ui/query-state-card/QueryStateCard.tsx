import type { ReactNode } from 'react'

import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import type { QueryViewState } from '@/shared/api/query-view-state'
import { useTranslation } from '@/shared/lib/useTranslation'
import { RetryButton } from '@/shared/ui/query-refresh-error'
import { StateCard } from '@/shared/ui/state-card'

type QueryStateCardProps = {
    state: QueryViewState
    error?: unknown
    onRetry?: () => void | Promise<unknown>
    emptyTitle?: string
    emptyDescription?: string
    loading?: ReactNode
    className?: string
}

export function QueryStateCard({
    state,
    error,
    onRetry,
    emptyTitle,
    emptyDescription,
    loading,
    className,
}: QueryStateCardProps) {
    const { t } = useTranslation()

    if (state === 'loading' && loading) {
        return loading
    }

    if (state === 'loading') {
        return <StateCard className={className} variant="loading" description={t('common.loading')} />
    }

    if (state === 'empty') {
        return <StateCard className={className} variant="empty" title={emptyTitle} description={emptyDescription} />
    }

    if (state === 'offline') {
        return <StateCard className={className} variant="offline" title={t('pwa.offlineTitle')} description={t('pwa.offlineDescription')} action={onRetry ? <RetryButton onRetry={onRetry} label={t('common.retry')} /> : undefined} />
    }

    if (state === 'permission-denied') {
        return <StateCard className={className} variant="permission-denied" title={t('errors.FORBIDDEN')} description={t('common.tryAgainLater')} />
    }

    if (state === 'session-expired') {
        return <StateCard className={className} variant="session-expired" title={t('auth.sessionExpiredTitle')} description={t('auth.sessionExpiredDescription')} action={onRetry ? <RetryButton onRetry={onRetry} label={t('auth.signIn')} /> : undefined} />
    }

    if (state === 'suspended') {
        return <StateCard className={className} variant="suspended" title={t('auth.accountBlocked')} description={t('auth.accountBlockedDescription')} />
    }

    if (state === 'partial') {
        return <StateCard className={className} variant="partial" title={t('common.partialDataTitle')} description={t('common.partialDataDescription')} action={onRetry ? <RetryButton onRetry={onRetry} label={t('common.retry')} /> : undefined} />
    }

    const isStale = state === 'stale-error'
    return <StateCard className={className} variant={isStale ? 'stale-error' : 'error'} title={t('common.failedToLoad')} description={getApiErrorMessage(error, t('common.tryAgainLater'))} action={onRetry ? <RetryButton onRetry={onRetry} label={t('common.retry')} /> : undefined} />
}
