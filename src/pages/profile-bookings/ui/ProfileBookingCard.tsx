import { CalendarDays, Clock3, ExternalLink, MapPin, ReceiptText, Repeat2, WifiOff } from 'lucide-react'
import { Link } from 'react-router'
import { useState } from 'react'

import {
    type ClientBooking,
    BookingStatusBadge,
    BookingRecoveryTimeline,
    useGetBookingStatusHistoryQuery,
    useGetMyBookingPaymentStatusQuery,
    useCreateBookingPaymentCheckoutMutation,
} from '@/entities/booking'
import { CancelClientBookingButton } from '@/features/booking/cancel-client-booking'
import { RequestBookingRescheduleButton } from '@/features/booking/request-reschedule/ui/RequestBookingRescheduleButton'
import { routePaths } from '@/shared/constants/routes'
import { formatCurrency } from '@/shared/lib/formatCurrency'
import { useTranslation } from '@/shared/lib/useTranslation'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { QueryRefreshError } from '@/shared/ui/query-refresh-error'
import { ResilientImage } from '@/shared/ui/resilient-image'
import { useOnlineStatus } from '@/features/pwa-lifecycle/lib/useOnlineStatus'
import { createCabinetDirectionsUrl } from '@/features/booking/lib/bookingSuccessLinks'
import { useRecordClientExperimentEventMutation } from '@/features/experiments/api/clientExperimentApi'

type ProfileBookingCardProps = {
    booking: ClientBooking
}

export function ProfileBookingCard({ booking }: ProfileBookingCardProps) {
    const { t } = useTranslation()
    const { cabinet, service } = booking
    const [isHistoryOpen, setIsHistoryOpen] = useState(false)
    const [paymentError, setPaymentError] = useState<unknown>(null)
    const [createPaymentCheckout, { isLoading: isPaymentLoading }] = useCreateBookingPaymentCheckoutMutation()
    const [recordExperiment] = useRecordClientExperimentEventMutation()
    const { data: statusHistory = [], isLoading: isStatusHistoryLoading, isError: isStatusHistoryError, refetch: refetchStatusHistory } = useGetBookingStatusHistoryQuery(booking.id, { skip: !isHistoryOpen })
    const { data: paymentStatus, isLoading: isPaymentStatusLoading, isError: isPaymentStatusError, refetch: refetchPaymentStatus } = useGetMyBookingPaymentStatusQuery(booking.id, { skip: !isHistoryOpen })
    const isOnline = useOnlineStatus()
    const canBookAgain = booking.status === 'completed' || booking.status === 'cancelled'
    const bookAgainHref = routePaths.cabinetDetails(cabinet.id, {
        serviceId: service.id,
        source: 'book_again',
        sourceBookingId: booking.id,
    })

    const recordBookAgainClick = () => {
        void recordExperiment({ event: 'book_again_clicked' }).unwrap().catch(() => undefined)
    }

    const openPaymentCheckout = async () => {
        setPaymentError(null)

        try {
            const result = await createPaymentCheckout(booking.id).unwrap()
            window.location.assign(result.url)
        } catch (error) {
            setPaymentError(error)
        }
    }

    return (
        <div id={`booking-${booking.id}`}>
            <article className="w-full min-w-0 overflow-hidden rounded-xl border bg-card shadow-sm md:hidden">
                <div className="flex min-w-0 items-center justify-between gap-3 border-b px-4 py-3">
                    <BookingStatusBadge status={booking.status} />
                    <span className="min-w-0 truncate text-xs font-semibold text-muted-foreground">#{booking.id}</span>
                </div>

                <div className="p-4">
                    <div className="flex gap-3">
                        <ResilientImage
                            src="/images/cabinets/cabinet-beauty-bright-01.webp"
                            alt={cabinet.title}
                            className="h-24 w-28 shrink-0 rounded-xl object-cover"
                            fallback={<div className="flex size-full items-center justify-center bg-muted text-muted-foreground">{cabinet.title.slice(0, 1)}</div>}
                        />
                        <div className="min-w-0">
                            <h2 className="truncate text-lg font-bold">{cabinet.title}</h2>
                            <p className="mt-1 truncate text-sm text-muted-foreground">{service.title}</p>
                            <p className="mt-2 text-sm font-semibold">{booking.startTime}–{booking.endTime}</p>
                        </div>
                    </div>

                    {!isOnline && (
                        <div className="mt-4 flex items-start gap-2 rounded-xl border border-status-warning-border bg-status-warning-surface px-3 py-2.5 text-sm">
                            <WifiOff className="mt-0.5 size-4 shrink-0 text-status-warning-foreground" />
                            <span className="text-status-warning-foreground">{t('booking.mobileSavedBookingDetails')}</span>
                        </div>
                    )}

                    <div className="mt-4 grid gap-3 border-b pb-4 text-sm">
                        <p className="flex items-center gap-2 text-muted-foreground"><CalendarDays className="size-4 shrink-0 text-primary" />{booking.date}</p>
                        <p className="flex items-center gap-2 text-muted-foreground"><Clock3 className="size-4 shrink-0 text-primary" />{service.durationMinutes} min · {booking.startTime}–{booking.endTime}</p>
                        <p className="flex items-center gap-2 text-muted-foreground"><MapPin className="size-4 shrink-0 text-primary" />{cabinet.city}, {cabinet.address}</p>
                    </div>

                    <div className="border-b py-4">
                        <div className="flex items-start gap-3">
                            <ReceiptText className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                            <div className="min-w-0 flex-1">
                                <p className="font-semibold">{t('booking.mobilePayment')}</p>
                                <div className="mt-1 flex min-w-0 items-center justify-between gap-3 text-sm">
                                    <span className="text-muted-foreground">{formatCurrency(service.price)}</span>
                                    <span className={booking.status === 'confirmed' ? 'truncate font-semibold text-status-success-foreground' : 'truncate font-semibold text-status-warning-foreground'}>
                                        {booking.status === 'confirmed' ? t('booking.mobilePaid') : t('booking.paymentStatusNotStarted')}
                                    </span>
                                </div>
                            </div>
                        </div>
                        {booking.status === 'pending' && (
                            <Button
                                type="button"
                                size="sm"
                                className="mt-3 min-h-11 w-full"
                                loading={isPaymentLoading}
                                onClick={() => void openPaymentCheckout()}
                            >
                                {isPaymentLoading ? t('booking.openingPayment') : t('booking.payBooking')}
                            </Button>
                        )}
                    </div>

                    <div className="py-4">
                        <div className="flex items-start gap-3">
                            <MapPin className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                            <div className="min-w-0 flex-1">
                                <p className="font-semibold">{t('booking.mobileDirections')}</p>
                                <p className="mt-1 text-sm text-muted-foreground">{isOnline ? t('booking.openDirections') : t('booking.mobileRouteUnavailable')}</p>
                            </div>
                        </div>
                        {isOnline ? (
                            <a
                                className={buttonVariants({ variant: 'outline', className: 'mt-3 flex min-h-11 w-full items-center justify-center gap-2' })}
                                href={createCabinetDirectionsUrl(cabinet)}
                                rel="noreferrer"
                                target="_blank"
                            >
                                <ExternalLink className="size-4" />
                                {t('booking.mobileOpenMaps')}
                            </a>
                        ) : (
                            <div className="mt-3 flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold text-muted-foreground" aria-disabled="true">
                                <WifiOff className="size-4" />
                                {t('booking.mobileOpenMaps')}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-2 border-t pt-4">
                        {canBookAgain && (
                            <Link
                                to={bookAgainHref}
                                className={buttonVariants({ variant: 'outline', className: 'min-h-11' })}
                                onClick={recordBookAgainClick}
                            >
                                <Repeat2 className="size-4" />
                                {t('booking.bookAgain')}
                            </Link>
                        )}
                        <CancelClientBookingButton booking={booking} />
                        <RequestBookingRescheduleButton booking={booking} />
                    </div>
                </div>
            </article>

        <article className="hidden rounded-xl border bg-card p-6 shadow-sm md:block">
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

                    {booking.status === 'pending' && (
                        <Button
                            type="button"
                            size="sm"
                            className="min-h-11"
                            loading={isPaymentLoading}
                            onClick={() => void openPaymentCheckout()}
                        >
                            {isPaymentLoading ? t('booking.openingPayment') : t('booking.payBooking')}
                        </Button>
                    )}

                    <CancelClientBookingButton booking={booking} />
                    <RequestBookingRescheduleButton booking={booking} />
                    {canBookAgain && (
                        <Link
                            to={bookAgainHref}
                            className={buttonVariants({ variant: 'outline', className: 'min-h-11' })}
                            onClick={recordBookAgainClick}
                        >
                            <Repeat2 className="size-4" />
                            {t('booking.bookAgain')}
                        </Link>
                    )}
                </div>
            </div>

            {paymentError !== null && (
                <QueryRefreshError
                    message={getApiErrorMessage(paymentError, t('booking.paymentCheckoutFailed'))}
                    onRetry={openPaymentCheckout}
                    retryLabel={t('common.retry')}
                />
            )}

            {booking.status === 'cancelled' && (
                <p className="mt-5 rounded-xl border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                    {t('booking.thisBookingWasCancelled')}
                </p>
            )}

            <div className="mt-5 grid gap-5 lg:grid-cols-2">
                <div className="rounded-xl border bg-background p-4">
                    <p className="text-sm font-medium text-muted-foreground">
                        {t('cabinet.title')}
                    </p>

                    <Link
                        to={routePaths.cabinetDetails(cabinet.id)}
                        className="mt-2 block font-semibold transition-colors hover:text-primary"
                    >
                        {cabinet.title}
                    </Link>

                    <p className="mt-1 text-sm text-muted-foreground">
                        {cabinet.city}, {cabinet.address}
                    </p>
                    <a
                        className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
                        href={createCabinetDirectionsUrl(cabinet)}
                        rel="noreferrer"
                        target="_blank"
                    >
                        {t('booking.openDirections')}
                    </a>
                </div>

                <div className="rounded-xl border bg-background p-4">
                    <p className="text-sm font-medium text-muted-foreground">
                        {t('service.title')}
                    </p>

                    <p className="mt-2 font-semibold">
                        {service.title}
                    </p>

                    <div className="mt-1 space-y-1 text-sm text-muted-foreground">
                        <p>{t('service.form.durationMinutes', {
                            count: service.durationMinutes,
                        })}</p>
                        <p>{formatCurrency(service.price)}</p>
                    </div>
                </div>
            </div>

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

            <button type="button" className={buttonVariants({ variant: 'outline', size: 'sm', className: 'mt-5 min-h-11' })} onClick={() => setIsHistoryOpen((value) => !value)}>
                {isHistoryOpen ? t('booking.hideStatusHistory') : t('booking.showStatusHistory')}
            </button>

            {isHistoryOpen && (isStatusHistoryLoading || isPaymentStatusLoading) && (
                <div className="mt-5 space-y-3 border-t pt-5" aria-label={t('common.loading')}>
                    <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-48 animate-pulse rounded bg-muted" />
                </div>
            )}

            {isHistoryOpen && (isStatusHistoryError || isPaymentStatusError) && (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                    <p className="text-sm text-muted-foreground">{t('booking.recoveryTimelineUnavailable')}</p>
                    <button
                        type="button"
                        className={buttonVariants({ variant: 'outline', size: 'sm' })}
                        onClick={() => {
                            void refetchStatusHistory()
                            void refetchPaymentStatus()
                        }}
                    >
                        {t('common.retry')}
                    </button>
                </div>
            )}

            {isHistoryOpen && !isStatusHistoryLoading && !isPaymentStatusLoading && !isStatusHistoryError && !isPaymentStatusError && (
                <BookingRecoveryTimeline
                    statusHistory={statusHistory}
                    paymentStatus={paymentStatus}
                />
            )}
        </article>
        </div>
    )
}
