import { Link } from 'react-router'
import { useState } from 'react'

import {
    BookingStatusBadge,
    useGetBookingStatusHistoryQuery,
    useGetOwnerPendingRescheduleRequestsQuery,
    type OwnerBooking,
} from '@/entities/booking'
import type { Cabinet } from '@/entities/cabinet'
import type { Service } from '@/entities/service'
import type { OwnerClient } from '@/entities/user'
import { BookingStatusSelect } from '@/features/booking/update-booking-status'
import { formatCurrency } from '@/shared/lib/formatCurrency'
import { routePaths } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'
import { formatDateTime } from '@/shared/lib/formatDateTime'
import { buttonVariants } from '@/components/ui/button-variants'
import { OwnerBookingNote } from './OwnerBookingNote'
import { ResolveBookingRescheduleActions } from '@/features/booking/resolve-reschedule/ui/ResolveBookingRescheduleActions'
import type { TranslationKey } from '@/shared/lib/i18n'

type OwnerBookingCardProps = {
    booking: OwnerBooking
    client?: OwnerClient | undefined
    cabinet?: Cabinet | undefined
    service?: Service | undefined
}

const paymentStatusLabels = {
    pending: 'booking.paymentStatusPending',
    paid: 'booking.paymentStatusPaid',
    failed: 'booking.paymentStatusFailed',
    partially_refunded: 'booking.paymentStatusPartiallyRefunded',
    refunded: 'booking.paymentStatusRefunded',
} satisfies Record<NonNullable<OwnerBooking['paymentLedger']>['status'], TranslationKey>

export function OwnerBookingCard({
    booking,
    client,
    cabinet,
    service,
}: OwnerBookingCardProps) {
    const { t } = useTranslation()
    const [isHistoryOpen, setIsHistoryOpen] = useState(false)
    const { data: rescheduleRequests = [] } = useGetOwnerPendingRescheduleRequestsQuery()
    const rescheduleRequest = rescheduleRequests.find((request) => request.bookingId === booking.id)
    const { data: statusHistory = [], isLoading: isStatusHistoryLoading, isError: isStatusHistoryError, refetch: refetchStatusHistory } = useGetBookingStatusHistoryQuery(booking.id, { skip: !isHistoryOpen })

    return (
        <article className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="flex flex-col justify-between gap-4 border-b pb-5 md:flex-row md:items-start">
                <div>
                    <p className="text-sm font-medium text-muted-foreground">
                        {booking.date}
                    </p>

                    <h2 className="mt-1 text-xl font-semibold tracking-tight">
                        {booking.startTime}–{booking.endTime}
                    </h2>
                </div>

                <div className="flex flex-col items-start gap-3 md:items-end">
                    <BookingStatusBadge status={booking.status} />

                    <BookingStatusSelect
                        bookingId={booking.id}
                        status={booking.status}
                    />
                </div>
            </div>

            <div className="mt-5 grid gap-5 lg:grid-cols-3">
                <div className="rounded-xl border bg-background p-4">
                    <p className="text-sm font-medium text-muted-foreground">
                        {t('cabinet.title')}
                    </p>

                    {cabinet ? (
                        <Link
                            to={routePaths.cabinetDetails(cabinet.id)}
                            className="mt-2 block font-semibold transition-colors hover:text-primary"
                        >
                            {cabinet.title}
                        </Link>
                    ) : (
                        <p className="mt-2 font-semibold">
                            {t('cabinet.unknownCabinet')}
                        </p>
                    )}

                    {cabinet && (
                        <p className="mt-1 text-sm text-muted-foreground">
                            {cabinet.city}, {cabinet.address}
                        </p>
                    )}
                </div>

                <div className="rounded-xl border bg-background p-4">
                    <p className="text-sm font-medium text-muted-foreground">
                        {t('service.title')}
                    </p>

                    <p className="mt-2 font-semibold">
                        {service?.title ?? t('service.unknownService')}
                    </p>

                    {service ? (
                        <div className="mt-1 space-y-1 text-sm text-muted-foreground">
                            <p>{service.durationMinutes} min</p>
                            <p>{formatCurrency(service.price)}</p>
                        </div>
                    ) : (
                        <p className="mt-1 text-sm text-muted-foreground">
                            {t('service.unknownPrice')}
                        </p>
                    )}
                </div>

                <div className="rounded-xl border bg-background p-4">
                    <p className="text-sm font-medium text-muted-foreground">
                        {t('user.client')}
                    </p>

                    <p className="mt-2 font-semibold">
                        {client?.name ?? t('user.unknownClient')}
                    </p>

                    {client && (
                        <div className="mt-1 space-y-1 text-sm text-muted-foreground">
                            <p>{client.email}</p>
                            <p>{client.phone ?? t('common.notProvided')}</p>
                        </div>
                    )}
                </div>
            </div>

            {booking.paymentLedger && (
                <section
                    className="mt-5 rounded-xl border bg-muted/20 p-4"
                    aria-label={t('booking.ownerPaymentLedgerTitle')}
                >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-foreground">
                            {t('booking.ownerPaymentLedgerTitle')}
                        </p>
                        <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                            {t(paymentStatusLabels[booking.paymentLedger.status])}
                        </span>
                    </div>
                    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-5">
                        {[
                            [t('booking.ownerGrossAmount'), formatCurrency(booking.paymentLedger.grossAmount, booking.paymentLedger.currency)],
                            [t('booking.ownerCommissionAmount'), formatCurrency(booking.paymentLedger.commissionAmount, booking.paymentLedger.currency)],
                            [t('booking.ownerPayoutAmount'), formatCurrency(booking.paymentLedger.ownerPayoutAmount, booking.paymentLedger.currency)],
                            [t('booking.ownerRefundedAmount'), formatCurrency(booking.paymentLedger.refundedAmountMinor / 100, booking.paymentLedger.currency)],
                            [t('booking.ownerRemainingAmount'), formatCurrency(booking.paymentLedger.remainingAmountMinor / 100, booking.paymentLedger.currency)],
                        ].map(([label, value]) => (
                            <div key={label}>
                                <dt className="text-muted-foreground">{label}</dt>
                                <dd className="font-medium">{value}</dd>
                            </div>
                        ))}
                    </dl>
                </section>
            )}

            {booking.comment && (
                <div className="mt-5 rounded-xl border bg-muted/40 px-4 py-3">
                    <p className="text-sm font-medium text-foreground">
                        {t('booking.comment')}
                    </p>

                    <p className="mt-1 text-sm text-muted-foreground">
                        {booking.comment}
                    </p>
                </div>
            )}

            {booking.cancellationReason && (
                <div className="mt-3 rounded-xl border border-status-warning-border bg-status-warning-surface px-4 py-3">
                    <p className="text-sm font-medium text-status-warning-foreground">
                        {t('booking.cancellationReason')}
                    </p>
                    <p className="mt-1 text-sm text-status-warning-foreground">
                        {booking.cancellationReason}
                    </p>
                </div>
            )}

            <OwnerBookingNote
                bookingId={booking.id}
                initialNote={booking.ownerNote}
            />

            {rescheduleRequest && <ResolveBookingRescheduleActions request={rescheduleRequest} />}

            <button type="button" className={buttonVariants({ variant: 'outline', size: 'sm', className: 'mt-5 min-h-11' })} onClick={() => setIsHistoryOpen((value) => !value)}>
                {isHistoryOpen ? t('booking.hideStatusHistory') : t('booking.showStatusHistory')}
            </button>

            {isHistoryOpen && isStatusHistoryLoading && (
                <div className="mt-5 space-y-3 border-t pt-5" aria-label={t('common.loading')}>
                    <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-48 animate-pulse rounded bg-muted" />
                </div>
            )}

            {isHistoryOpen && statusHistory.length > 0 && !isStatusHistoryLoading && (
                <div className="mt-5 border-t pt-5">
                    <p className="text-sm font-medium text-foreground">
                        {t('booking.statusHistory')}
                    </p>
                    <div className="mt-3 max-h-48 space-y-3 overflow-y-auto pr-1">
                        {statusHistory.map((entry) => (
                            <div key={entry.id} className="flex items-start gap-3 text-sm">
                                <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
                                <div>
                                    <p className="font-medium">{t(`booking.${entry.status}StatusLabel`)}</p>
                                    <p className="text-muted-foreground">
                                        {formatDateTime(entry.createdAt)}
                                    </p>
                                    {entry.reason && <p className="mt-1 text-muted-foreground">{entry.reason}</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {isHistoryOpen && isStatusHistoryError && (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                    <p className="text-sm text-muted-foreground">{t('booking.statusHistoryUnavailable')}</p>
                    <button type="button" className={buttonVariants({ variant: 'outline', size: 'sm', className: 'min-h-11' })} onClick={() => void refetchStatusHistory()}>
                        {t('common.retry')}
                    </button>
                </div>
            )}
        </article>
    )
}
