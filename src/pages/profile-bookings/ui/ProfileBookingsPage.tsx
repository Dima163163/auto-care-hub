import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { MessageCircle, ShieldCheck } from 'lucide-react'
import { useSearchParams } from 'react-router'

import { BookingSummaryCards, getBookingOverview, useCancelMyBookingMutation, useGetMyBookingsQuery } from '@/entities/booking'

import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog'
import { StateCard } from '@/shared/ui/state-card'
import { QueryRefreshError, RetryButton } from '@/shared/ui/query-refresh-error'

import { ProfileBookingSection } from './ProfileBookingSection'
import { useTranslation } from '@/shared/lib/useTranslation'
import { PageHeader } from '@/shared/ui/page-header'
import { ProfileNavigation } from '@/widgets/profile-navigation/ui/ProfileNavigation'
import { Link } from 'react-router'
import { buttonVariants } from '@/components/ui/button-variants'
import { ROUTES } from '@/shared/constants/routes'
import { QueryRefreshStatus } from '@/shared/ui/query-refresh-status'
export function ProfileBookingsPage() {
    const { t } = useTranslation()
    const [searchParams, setSearchParams] = useSearchParams()
    const [bookingIdToCancel, setBookingIdToCancel] = useState<string | null>(null)
    const [cancellationReason, setCancellationReason] = useState('')

    const {
        data: bookings = [],
        isFetching: isBookingsFetching,
        isLoading: isBookingsLoading,
        isError: isBookingsError,
        error,
        refetch,
    } = useGetMyBookingsQuery()


    const [cancelMyBooking, { isLoading: isCancelLoading }] =
        useCancelMyBookingMutation()

    const isLoading = isBookingsLoading
    const isError = isBookingsError
    const hasStaleBookings = bookings.length > 0

    const bookingToCancel = bookings.find(
        (booking) => booking.id === bookingIdToCancel,
    )
    useEffect(() => {
        if (!searchParams.has('payment') && !searchParams.has('booking_id')) return
        const nextSearchParams = new URLSearchParams(searchParams)
        nextSearchParams.delete('payment')
        nextSearchParams.delete('booking_id')
        setSearchParams(nextSearchParams, { replace: true })
    }, [searchParams, setSearchParams])

    const {
        upcomingBookings,
        cancelledBookings,
        completedBookings,
        totalBookingsCount,
        upcomingBookingsCount,
        cancelledBookingsCount,
        completedBookingsCount,
    } = getBookingOverview(bookings)

    const handleConfirmCancelBooking = async () => {
        if (!bookingIdToCancel) {
            return
        }

        try {
            await cancelMyBooking({ id: bookingIdToCancel, reason: cancellationReason }).unwrap()

            toast.success(t('booking.bookingCancelledSuccessfully'))
            setBookingIdToCancel(null)
            setCancellationReason('')
        } catch (error) {
            const message = getApiErrorMessage(
                error,
                t('booking.failedToCancelBooking'),
            )

            toast.error(message)
        }
    }

    if (isLoading) {
        return (
            <section className="space-y-6">
                <ProfileNavigation />
                <PageHeader
                    eyebrow={t('workspace.client')}
                    title={t('booking.myBookings')}
                />

                <StateCard variant="loading" description={t('booking.loadingBookings')} />
            </section>
        )
    }

    if (isError && !hasStaleBookings) {
        return (
            <section className="space-y-6">
                <ProfileNavigation />
                <PageHeader
                    eyebrow={t('workspace.client')}
                    title={t('booking.myBookings')}
                    description={t('booking.myBookingsDescription')}
                />

                <StateCard
                    title={t('booking.failedToLoadBookings')}
                    variant="error"
                    action={
                        <RetryButton onRetry={refetch} label={t('common.retry')} />
                    }
                />
            </section>
        )
    }

    return (
            <section
                className="mx-auto max-w-[var(--layout-operational-max)] space-y-8 px-[var(--layout-gutter)] py-7 lg:py-10"
                aria-busy={isBookingsFetching}
            >
                <ProfileNavigation />
                <QueryRefreshStatus
                    isRefreshing={isBookingsFetching}
                    label={t('common.refreshing')}
                />
                <div className="rounded-[var(--radius-panel)] bg-hero-overlay p-5 text-primary-foreground shadow-sm sm:p-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-primary-foreground/60">{t('workspace.client')}</p><h1 className="mt-2 text-3xl font-black tracking-tight">{t('booking.myBookings')}</h1><p className="mt-2 max-w-2xl text-sm font-medium text-primary-foreground/70">{t('booking.myBookingsDescription')}</p></div><div className="flex gap-2"><span className="inline-flex items-center gap-2 rounded-[var(--radius-control)] border border-primary-foreground/15 bg-primary-foreground/10 px-3 py-2 text-xs font-bold"><ShieldCheck className="size-4 text-status-success-foreground" />{t('autocare.trustedBadge')}</span><span className="inline-flex items-center gap-2 rounded-[var(--radius-control)] border border-primary-foreground/15 bg-primary-foreground/10 px-3 py-2 text-xs font-bold"><MessageCircle className="size-4 text-primary" />{t('autocare.messageAction')}</span></div></div></div>
            <div>
                {isError && hasStaleBookings && (
                    <QueryRefreshError
                        message={getApiErrorMessage(error, t('common.tryAgainLater'))}
                        onRetry={refetch}
                        retryLabel={t('common.retry')}
                    />
                )}

                <BookingSummaryCards
                    totalBookingsCount={totalBookingsCount}
                    upcomingBookingsCount={upcomingBookingsCount}
                    cancelledBookingsCount={cancelledBookingsCount}
                    completedBookingsCount={completedBookingsCount}
                />

                {bookings.length === 0 ? (
                    <StateCard
                        title={t('booking.noBookingsYet')}
                        description={t('booking.futureBookingsDescription')}
                        action={
                            <Link to={ROUTES.cabinets} className={buttonVariants()}>
                                {t('favorites.openCatalog')}
                            </Link>
                        }
                    />
                ) : (
                    <div className="space-y-10">
                        <ProfileBookingSection
                            title={t('booking.upcoming')}
                            description={t('booking.upcomingDescription')}
                            emptyMessage={t('booking.noUpcomingBookings')}
                            bookings={upcomingBookings}
                            emptyAction={
                                <Link to={ROUTES.cabinets} className={buttonVariants()}>
                                    {t('favorites.openCatalog')}
                                </Link>
                            }
                        />

                        <ProfileBookingSection
                            title={t('booking.cancelled')}
                            description={t('booking.cancelledDescription')}
                            emptyMessage={t('booking.noCancelledBookings')}
                            bookings={cancelledBookings}
                        />

                        <ProfileBookingSection
                            title={t('booking.completed')}
                            description={t('booking.completedDescription')}
                            emptyMessage={t('booking.noCompletedBookings')}
                            bookings={completedBookings}

                        />
                    </div>
                )}
            </div>

            <ConfirmDialog
                isOpen={Boolean(bookingToCancel)}
                eyebrow={t('booking.confirmCancellation')}
                title={t('booking.cancelThisBooking')}
                description={t('booking.cancelBookingDescription')}
                cancelLabel={t('booking.keepBooking')}
                confirmLabel={t('booking.confirmCancellationAction')}
                loadingLabel={t('booking.cancelling')}
                isLoading={isCancelLoading}
                confirmVariant="destructive"
                onCancel={() => {
                    setBookingIdToCancel(null)
                    setCancellationReason('')
                }}
                onConfirm={() => void handleConfirmCancelBooking()}
            >
                {bookingToCancel && (
                    <>
                        <p className="font-medium">
                            {bookingToCancel.date}
                        </p>

                        <p className="mt-1 text-muted-foreground">
                            {bookingToCancel.startTime}–{bookingToCancel.endTime}
                        </p>
                        <label className="mt-4 block text-sm font-medium" htmlFor="profile-cancellation-reason">
                            {t('booking.cancellationReason')}
                            <textarea
                                id="profile-cancellation-reason"
                                value={cancellationReason}
                                onChange={(event) => setCancellationReason(event.target.value)}
                                className="mt-2 min-h-20 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                                placeholder={t('booking.cancellationReasonPlaceholder')}
                            />
                        </label>
                    </>
                )}
            </ConfirmDialog>
        </section>
    )
}
