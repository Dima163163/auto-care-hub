import type { TranslationKey } from '@/shared/lib/i18n'
import { formatDateTime } from '@/shared/lib/formatDateTime'
import { formatCurrency } from '@/shared/lib/formatCurrency'
import { useTranslation } from '@/shared/lib/useTranslation'

import {
    mergeBookingRecoveryTimeline,
} from '../lib/mergeBookingRecoveryTimeline'
import type {
    BookingPaymentStatusResponse,
    BookingStatusHistory,
} from '../model/types'

const bookingStatusLabels = {
    pending: 'booking.pendingStatusLabel',
    confirmed: 'booking.confirmedStatusLabel',
    cancelled: 'booking.cancelledStatusLabel',
    completed: 'booking.completedStatusLabel',
} satisfies Record<'pending' | 'confirmed' | 'cancelled' | 'completed', TranslationKey>

const paymentAttemptLabels = {
    creating: 'booking.paymentAttemptCreating',
    created: 'booking.paymentAttemptCreated',
    failed: 'booking.paymentAttemptFailed',
    paid: 'booking.paymentAttemptPaid',
    expired: 'booking.paymentAttemptExpired',
} satisfies Record<'creating' | 'created' | 'failed' | 'paid' | 'expired', TranslationKey>

const paymentStatusLabels = {
    pending: 'booking.paymentStatusPending',
    paid: 'booking.paymentStatusPaid',
    failed: 'booking.paymentStatusFailed',
    partially_refunded: 'booking.paymentStatusPartiallyRefunded',
    refunded: 'booking.paymentStatusRefunded',
} satisfies Record<'pending' | 'paid' | 'failed' | 'partially_refunded' | 'refunded', TranslationKey>

const invoiceStatusLabels = {
    open: 'booking.receiptStatusOpen',
    paid: 'booking.receiptStatusPaid',
    void: 'booking.receiptStatusVoid',
} satisfies Record<'open' | 'paid' | 'void', TranslationKey>

type BookingRecoveryTimelineProps = {
    statusHistory: BookingStatusHistory[]
    paymentStatus?: BookingPaymentStatusResponse | undefined
}

export function BookingRecoveryTimeline({
    statusHistory,
    paymentStatus,
}: BookingRecoveryTimelineProps) {
    const { t } = useTranslation()
    const timeline = mergeBookingRecoveryTimeline(statusHistory, paymentStatus)

    return (
        <div className="mt-5 border-t pt-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">
                    {t('booking.recoveryTimeline')}
                </p>
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                    {paymentStatus?.status
                        ? t(paymentStatusLabels[paymentStatus.status])
                        : t('booking.paymentStatusNotStarted')}
                </span>
            </div>

            {paymentStatus?.invoice && (
                <section className="mt-4 rounded-lg border bg-background p-4" aria-label={t('booking.receiptTitle')}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <p className="text-sm font-semibold">{t('booking.receiptTitle')}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                {t('booking.invoiceNumber')}: {paymentStatus.invoice.invoiceId}
                            </p>
                        </div>
                        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                            {t(invoiceStatusLabels[paymentStatus.invoice.status])}
                        </span>
                    </div>
                    <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                        <div>
                            <dt className="text-muted-foreground">{t('booking.receiptIssuedAt')}</dt>
                            <dd className="font-medium">{formatDateTime(paymentStatus.invoice.issuedAt)}</dd>
                        </div>
                        <div>
                            <dt className="text-muted-foreground">{t('booking.receiptOriginalAmount')}</dt>
                            <dd className="font-medium">{formatCurrency(paymentStatus.invoice.amount, paymentStatus.invoice.currency)}</dd>
                        </div>
                        {paymentStatus.refundedAmountMinor > 0 && (
                            <div>
                                <dt className="text-muted-foreground">{t('booking.receiptRefundedAmount')}</dt>
                                <dd className="font-medium">{formatCurrency(paymentStatus.refundedAmountMinor / 100, paymentStatus.invoice.currency)}</dd>
                            </div>
                        )}
                        {paymentStatus.remainingAmountMinor !== null && (
                            <div>
                                <dt className="text-muted-foreground">{t('booking.receiptRemainingAmount')}</dt>
                                <dd className="font-medium">{formatCurrency(paymentStatus.remainingAmountMinor / 100, paymentStatus.invoice.currency)}</dd>
                            </div>
                        )}
                    </dl>
                </section>
            )}

            {timeline.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                    {t('booking.recoveryTimelineEmpty')}
                </p>
            ) : (
                <ol className="mt-3 space-y-3">
                    {timeline.map((event) => (
                        <li key={event.id} className="flex items-start gap-3 text-sm">
                            <span className={event.kind === 'payment'
                                ? 'mt-1 size-2 shrink-0 rounded-full bg-status-warning-foreground'
                                : 'mt-1 size-2 shrink-0 rounded-full bg-primary'}
                            />
                            <div className="min-w-0">
                                <p className="font-medium">
                                    {event.kind === 'payment'
                                        ? t(paymentAttemptLabels[event.status], { attempt: event.attemptNumber })
                                        : t(bookingStatusLabels[event.status])}
                                </p>
                                <time className="text-muted-foreground" dateTime={event.createdAt}>
                                    {formatDateTime(event.createdAt)}
                                </time>
                                {event.kind === 'booking' && event.reason && (
                                    <p className="mt-1 text-muted-foreground">{event.reason}</p>
                                )}
                            </div>
                        </li>
                    ))}
                </ol>
            )}
        </div>
    )
}
