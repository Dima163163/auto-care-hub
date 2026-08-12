import type { Service } from '@/entities/service'
import { formatCurrency } from '@/shared/lib/formatCurrency'
import { useTranslation } from '@/shared/lib/useTranslation'
import { Skeleton } from '@/components/ui/skeleton'
import { RetryButton } from '@/shared/ui/query-refresh-error'

type CabinetDetailsServicesProps = {
    isError: boolean
    isLoading: boolean
    onRetry: () => void | Promise<unknown>
    services: Service[]
}

export function CabinetDetailsServices({
    isError,
    isLoading,
    onRetry,
    services,
}: CabinetDetailsServicesProps) {
    const { t } = useTranslation()

    return (
        <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="text-xl font-semibold tracking-tight">
                {t('cabinet.details.services')}
            </h2>

            {isLoading && (
                <div role="status" className="mt-5 space-y-3">
                    <span className="sr-only">{t('cabinet.details.loadingServices')}</span>
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                </div>
            )}

            {!isLoading && isError && (
                <div role="alert" className="mt-5 rounded-xl bg-destructive/5 p-4">
                    <p className="font-medium text-destructive">{t('common.failedToLoad')}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{t('common.tryAgainLater')}</p>
                    <RetryButton className="mt-3" onRetry={onRetry} label={t('common.retry')} />
                </div>
            )}

            {!isLoading && !isError && services.length === 0 && (
                <p className="mt-5 text-sm text-muted-foreground">
                    {t('cabinet.details.noServices')}
                </p>
            )}

            {!isLoading && !isError && services.length > 0 && (
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                    {services.map((service) => (
                        <div
                            key={service.id}
                            className="rounded-xl border bg-background p-4"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h3 className="font-medium">
                                        {service.title}
                                    </h3>

                                    {service.description && (
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            {service.description}
                                        </p>
                                    )}
                                </div>

                                <p className="shrink-0 text-sm font-semibold">
                                    {formatCurrency(service.price)}
                                </p>
                            </div>

                            <p className="mt-3 text-sm text-muted-foreground">
                                {t('cabinet.details.serviceDurationMinutes', {
                                    count: service.durationMinutes,
                                })}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
