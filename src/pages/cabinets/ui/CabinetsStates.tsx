import { Loader2, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { useTranslation } from '@/shared/lib/useTranslation'
import { QueryRefreshError, RetryButton } from '@/shared/ui/query-refresh-error'

export function CabinetsLoading() {
    const { t } = useTranslation()

    return (
        <div role="status" className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 mb-8">
            <span className="sr-only">{t('cabinet.publicList.loading')}</span>
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-4 rounded-xl border bg-card/60 p-5 shadow-sm">
                    <Skeleton className="h-48 w-full rounded-xl" />
                    <div className="space-y-3">
                        <Skeleton className="h-6 w-3/4 rounded-lg" />
                        <Skeleton className="h-4 w-1/2 rounded-lg" />
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                        <Skeleton className="h-8 w-1/3 rounded-lg" />
                        <Skeleton className="h-10 w-24 rounded-xl" />
                    </div>
                </div>
            ))}
        </div>
    )
}

type CabinetsErrorProps = {
    error: unknown
    onRetry: () => void | Promise<unknown>
}

export function CabinetsError({ error, onRetry }: CabinetsErrorProps) {
    const { t } = useTranslation()

    return (
        <div role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 p-8 shadow-sm">
            <p className="font-semibold text-destructive text-lg">
                {t('cabinet.publicList.failedToLoad')}
            </p>

            <p className="mt-2 text-muted-foreground">
                {getApiErrorMessage(
                    error,
                    t('common.tryAgainLater'),
                )}
            </p>

            <RetryButton className="mt-5" onRetry={onRetry} label={t('common.retry')} />
        </div>
    )
}

export function CabinetsStaleError({ error, onRetry }: CabinetsErrorProps) {
    const { t } = useTranslation()

    return (
        <QueryRefreshError
            message={getApiErrorMessage(error, t('common.tryAgainLater'))}
            onRetry={onRetry}
            retryLabel={t('common.retry')}
        />
    )
}

type CabinetsEmptyProps = {
    hasActiveFilters: boolean
    onClearFilters: () => void
}

export function CabinetsEmpty({
    hasActiveFilters,
    onClearFilters,
}: CabinetsEmptyProps) {
    const { t } = useTranslation()

    return (
        <div className="flex flex-col items-center justify-center rounded-xl border bg-card/50 py-20 text-center shadow-sm">
            <p className="text-xl font-bold">
                {t('cabinet.publicList.emptyTitle')}
            </p>

            <p className="mt-3 text-muted-foreground">
                {t('cabinet.publicList.emptyDescription')}
            </p>

            {hasActiveFilters && (
                <Button type="button" variant="outline" className="mt-6" onClick={onClearFilters}>
                    <RotateCcw aria-hidden="true" className="size-4" />
                    {t('cabinet.publicList.clearFilters')}
                </Button>
            )}
        </div>
    )
}

export function CabinetsFetchingNext() {
    const { t } = useTranslation()

    return (
        <div role="status" aria-live="polite" className="flex flex-col items-center justify-center gap-3">
            <Loader2 className="size-6 animate-spin text-primary" />
            <p className="text-sm font-medium text-muted-foreground animate-pulse">
                {t('common.loading')}
            </p>
        </div>
    )
}
