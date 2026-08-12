import { MessageCircle, ShieldCheck } from 'lucide-react'
import {
    BookingSummaryCards,
    getBookingOverview,
    useGetOwnerBookingsQuery,
} from '@/entities/booking'
import { useGetOwnerCabinetsQuery } from '@/entities/cabinet'
import { useGetOwnerServicesQuery } from '@/entities/service'
import { useGetOwnerClientsQuery } from '@/entities/user'
import { CreateOwnerBookingForm } from '@/features/booking/create-owner-booking'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { StateCard } from '@/shared/ui/state-card'
import { QueryRefreshError, RetryButton } from '@/shared/ui/query-refresh-error'
import { QueryRefreshStatus } from '@/shared/ui/query-refresh-status'
import { OwnerBookingSection } from './OwnerBookingSection'
import { useTranslation } from '@/shared/lib/useTranslation'
import { Link } from 'react-router'
import { buttonVariants } from '@/components/ui/button-variants'
import { ROUTES } from '@/shared/constants/routes'


export function OwnerBookingsPage() {
    const { t } = useTranslation()
    const {
        data: bookings = [],
        isLoading: isBookingsLoading,
        isFetching: isBookingsFetching,
        isError: isBookingsError,
        error,
        refetch: refetchBookings,
    } = useGetOwnerBookingsQuery()

    const {
        data: cabinets = [],
        isLoading: isCabinetsLoading,
        isFetching: isCabinetsFetching,
        isError: isCabinetsError,
        error: cabinetsError,
        refetch: refetchCabinets,
    } = useGetOwnerCabinetsQuery()

    const {
        data: services = [],
        isLoading: isServicesLoading,
        isFetching: isServicesFetching,
        isError: isServicesError,
        error: servicesError,
        refetch: refetchServices,
    } = useGetOwnerServicesQuery()

    const {
        data: clients = [],
        isLoading: isClientsLoading,
        isFetching: isClientsFetching,
        isError: isClientsError,
        error: clientsError,
        refetch: refetchClients,
    } = useGetOwnerClientsQuery()

    const isLoading =
        isBookingsLoading ||
        isClientsLoading ||
        isCabinetsLoading ||
        isServicesLoading

    const isError =
        isBookingsError ||
        isClientsError ||
        isCabinetsError ||
        isServicesError

    const isFetching =
        isBookingsFetching ||
        isCabinetsFetching ||
        isServicesFetching ||
        isClientsFetching
    const hasStaleBookings = bookings.length > 0
    const hasStaleData =
        hasStaleBookings ||
        cabinets.length > 0 ||
        services.length > 0 ||
        clients.length > 0
    const refreshError = error ?? cabinetsError ?? servicesError ?? clientsError

    const {
        upcomingBookings,
        cancelledBookings,
        completedBookings,
        totalBookingsCount,
        upcomingBookingsCount,
        cancelledBookingsCount,
        completedBookingsCount,
    } = getBookingOverview(bookings)

    return (
        <main className="min-h-full bg-background px-[var(--layout-gutter)] py-7 lg:py-10">
            <section
                className="mx-auto max-w-6xl"
                aria-busy={isLoading || isFetching}
            >
                <div className="rounded-[var(--radius-panel)] bg-hero-overlay p-5 text-primary-foreground shadow-sm sm:p-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-primary-foreground/60">{t('workspace.owner')}</p><h1 className="mt-2 text-3xl font-black tracking-tight">{t('booking.title')}</h1><p className="mt-2 max-w-2xl text-sm font-medium text-primary-foreground/70">{t('booking.ownerBookingsDescription')}</p></div><div className="flex gap-2"><span className="inline-flex items-center gap-2 rounded-[var(--radius-control)] border border-primary-foreground/15 bg-primary-foreground/10 px-3 py-2 text-xs font-bold"><ShieldCheck className="size-4 text-status-success-foreground" />{t('autocare.trustedBadge')}</span><span className="inline-flex items-center gap-2 rounded-[var(--radius-control)] border border-primary-foreground/15 bg-primary-foreground/10 px-3 py-2 text-xs font-bold"><MessageCircle className="size-4 text-primary" />{t('autocare.messageAction')}</span></div></div></div>

                <QueryRefreshStatus
                    isRefreshing={isFetching && !isLoading}
                    label={t('common.refreshing')}
                />

                {!isLoading && (!isError || hasStaleData) && (
                    <BookingSummaryCards
                        totalBookingsCount={totalBookingsCount}
                        upcomingBookingsCount={upcomingBookingsCount}
                        cancelledBookingsCount={cancelledBookingsCount}
                        completedBookingsCount={completedBookingsCount}
                    />
                )}

                <CreateOwnerBookingForm
                    clients={clients}
                    cabinets={cabinets}
                    services={services}
                    isClientsLoading={isClientsLoading}
                    isCabinetsLoading={isCabinetsLoading}
                    isServicesLoading={isServicesLoading}
                />

                {isLoading && (
                    <StateCard variant="loading" description={t('booking.loadingBookings')} />
                )}

                {isError && !hasStaleData && (
                    <StateCard
                        title={t('booking.failedToLoadBookings')}
                        description={getApiErrorMessage(
                            error,
                            t('common.tryAgainLater'),
                        )}
                        variant="error"
                        action={
                            <RetryButton
                                onRetry={() => Promise.all([
                                    refetchBookings(),
                                    refetchCabinets(),
                                    refetchServices(),
                                    refetchClients(),
                                ])}
                                label={t('common.retry')}
                            />
                        }
                    />
                )}

                {isError && hasStaleData && (
                    <QueryRefreshError
                        message={getApiErrorMessage(refreshError, t('common.tryAgainLater'))}
                        onRetry={() => Promise.all([
                            refetchBookings(),
                            refetchCabinets(),
                            refetchServices(),
                            refetchClients(),
                        ])}
                        retryLabel={t('common.retry')}
                    />
                )}

                {!isLoading && !isError && bookings.length === 0 && (
                    <StateCard
                        title={t('booking.noBookingsYet')}
                        description={t('booking.ownerBookingsEmptyDescription')}
                        action={
                            <Link to={ROUTES.ownerCabinets} className={buttonVariants()}>
                                {t('navigation.ownerCabinets')}
                            </Link>
                        }
                    />
                )}

                {!isLoading && (!isError || hasStaleBookings) && bookings.length > 0 && (
                    <div className="space-y-10">
                        <OwnerBookingSection
                            title={t('booking.upcoming')}
                            description={t('booking.upcomingDescription')}
                            emptyMessage={t('booking.noUpcomingBookings')}
                            bookings={upcomingBookings}
                            clients={clients}
                            cabinets={cabinets}
                            services={services}
                        />

                        <OwnerBookingSection
                            title={t('booking.cancelled')}
                            description={t('booking.cancelledDescription')}
                            emptyMessage={t('booking.noCancelledBookings')}
                            bookings={cancelledBookings}
                            clients={clients}
                            cabinets={cabinets}
                            services={services}
                        />

                        <OwnerBookingSection
                            title={t('booking.completed')}
                            description={t('booking.completedDescription')}
                            emptyMessage={t('booking.noCompletedBookings')}
                            bookings={completedBookings}
                            clients={clients}
                            cabinets={cabinets}
                            services={services}
                        />
                    </div>
                )}
            </section>
        </main>
    )
}
