import { Mail, Phone } from 'lucide-react'

import { useGetOwnerBookingsQuery, type OwnerBooking } from '@/entities/booking'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { useTranslation } from '@/shared/lib/useTranslation'
import { QueryRefreshError, RetryButton } from '@/shared/ui/query-refresh-error'
import { QueryRefreshStatus } from '@/shared/ui/query-refresh-status'
import { PageHeader } from '@/shared/ui/page-header'

type OwnerClient = {
    bookingCount: number
    email: string
    id: string
    lastBooking: OwnerBooking
    name: string
    phone: string | null
}

function toOwnerClients(bookings: OwnerBooking[]) {
    const byClient = new Map<string, OwnerClient>()

    for (const booking of bookings) {
        const current = byClient.get(booking.client.id)
        const isNewer = !current || new Date(booking.date) > new Date(current.lastBooking.date)

        byClient.set(booking.client.id, {
            bookingCount: (current?.bookingCount ?? 0) + 1,
            email: booking.client.email,
            id: booking.client.id,
            lastBooking: isNewer ? booking : current.lastBooking,
            name: booking.client.name,
            phone: booking.client.phone,
        })
    }

    return [...byClient.values()].sort(
        (left, right) => new Date(right.lastBooking.date).getTime() - new Date(left.lastBooking.date).getTime(),
    )
}

export function OwnerClientsPage() {
    const { t } = useTranslation()
    const {
        data: bookings = [],
        isError,
        isFetching,
        isLoading,
        error,
        refetch,
    } = useGetOwnerBookingsQuery()
    const clients = toOwnerClients(bookings)
    const hasStaleClients = clients.length > 0

    return (
        <main className="min-h-screen bg-background px-4 py-8 lg:px-8">
            <section
                className="mx-auto max-w-6xl"
                aria-busy={isLoading || isFetching}
            >
                <PageHeader
                    eyebrow={t('workspace.owner')}
                    title={t('ownerDashboard.clientListTitle')}
                    description={t('ownerDashboard.clientListDescription')}
                />

                <QueryRefreshStatus
                    isRefreshing={isFetching && !isLoading}
                    label={t('common.refreshing')}
                />

                {isLoading && <div className="rounded-xl border bg-card p-6 text-muted-foreground">{t('common.loading')}</div>}
                {isError && !hasStaleClients && (
                    <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-destructive">
                        <p>{getApiErrorMessage(error, t('common.failedToLoad'))}</p>
                        <RetryButton className="mt-5" onRetry={refetch} label={t('common.retry')} />
                    </div>
                )}

                {isError && hasStaleClients && (
                    <QueryRefreshError
                        message={getApiErrorMessage(error, t('common.failedToLoad'))}
                        onRetry={refetch}
                        retryLabel={t('common.retry')}
                    />
                )}

                {!isLoading && !isError && clients.length === 0 && (
                    <div className="rounded-xl border bg-card p-6 text-muted-foreground">{t('ownerDashboard.noClients')}</div>
                )}
                {!isLoading && (!isError || hasStaleClients) && clients.length > 0 && (
                    <div className="grid gap-4 lg:grid-cols-2">
                        {clients.map((client) => (
                            <article key={client.id} className="rounded-xl border bg-card p-6 shadow-sm">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <h3 className="font-semibold">{client.name}</h3>
                                        <p className="mt-1 text-sm text-muted-foreground">{t('ownerDashboard.visits', { count: client.bookingCount })}</p>
                                    </div>
                                    <p className="text-right text-sm text-muted-foreground">{t('ownerDashboard.lastBooking', { date: client.lastBooking.date })}</p>
                                </div>
                                <div className="mt-5 space-y-2 text-sm text-muted-foreground">
                                    <a className="flex items-center gap-2 hover:text-foreground" href={`mailto:${client.email}`}><Mail className="size-4" />{client.email}</a>
                                    {client.phone && <a className="flex items-center gap-2 hover:text-foreground" href={`tel:${client.phone}`}><Phone className="size-4" />{client.phone}</a>}
                                </div>
                                <div className="mt-5 rounded-xl bg-muted/60 p-3 text-sm text-muted-foreground">{client.lastBooking.ownerNote ?? t('ownerDashboard.noOwnerNote')}</div>
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </main>
    )
}
