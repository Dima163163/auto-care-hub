import { Building2, CalendarDays, Check, Clock3, Plus, Users, WifiOff, X } from 'lucide-react'
import { Link } from 'react-router'
import { useState } from 'react'
import { toast } from 'sonner'

import { type OwnerBooking, useGetOwnerBookingsQuery, useGetOwnerPendingRescheduleRequestsQuery, useUpdateBookingStatusMutation } from '@/entities/booking'
import { useGetOwnerCabinetsQuery } from '@/entities/cabinet'
import { useGetOwnerReadinessQuery } from '@/entities/payment'
import { useGetOwnerServicesQuery } from '@/entities/service'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { formatCurrency } from '@/shared/lib/formatCurrency'
import { useOnlineStatus } from '@/features/pwa-lifecycle/lib/useOnlineStatus'
import { ResilientImage } from '@/shared/ui/resilient-image'
import { ROUTES } from '@/shared/constants/routes'
import { resolveQueryViewState } from '@/shared/api/query-view-state'
import { useTranslation } from '@/shared/lib/useTranslation'
import { QueryRefreshError } from '@/shared/ui/query-refresh-error'
import { QueryRefreshStatus } from '@/shared/ui/query-refresh-status'
import { Button } from '@/components/ui/button'

import { buildOwnerActionSummary } from '../lib/buildOwnerActionSummary'
import { OwnerDashboardContent } from './OwnerDashboardContent'
import { OwnerDashboardHeader } from './OwnerDashboardHeader'
import { OwnerDashboardStateCard } from './OwnerDashboardStateCard'
import { OwnerActionCenter } from './OwnerActionCenter'

type OwnerMobileDashboardProps = {
    bookings: OwnerBooking[]
    cabinetsCount: number
    confirmedBookingsCount: number
    pendingBookingsCount: number
    upcomingBookings: OwnerBooking[]
}

function OwnerMobileDashboard({
    bookings,
    cabinetsCount,
    confirmedBookingsCount,
    pendingBookingsCount,
    upcomingBookings,
}: OwnerMobileDashboardProps) {
    const { t } = useTranslation()
    const isOnline = useOnlineStatus()
    const [updateBookingStatus, { isLoading: isUpdatingBooking }] = useUpdateBookingStatusMutation()
    const [updatingBookingStatus, setUpdatingBookingStatus] = useState<'confirmed' | 'cancelled' | null>(null)
    const pendingBooking = upcomingBookings.find((booking) => booking.status === 'pending')
    const todayKey = new Date().toISOString().slice(0, 10)
    const todayRevenue = bookings
        .filter((booking) => booking.date.slice(0, 10) === todayKey && booking.status !== 'cancelled')
        .reduce((total, booking) => total + booking.service.price, 0)
    const occupancy = cabinetsCount > 0
        ? Math.min(100, Math.round((confirmedBookingsCount / Math.max(cabinetsCount * 4, 1)) * 100))
        : 0
    const dateLabel = new Intl.DateTimeFormat(undefined, {
        day: 'numeric',
        month: 'long',
        weekday: 'long',
    }).format(new Date())
    const handleBookingStatus = async (status: 'confirmed' | 'cancelled') => {
        if (!pendingBooking || isUpdatingBooking) {
            return
        }

        setUpdatingBookingStatus(status)
        try {
            await updateBookingStatus({ id: pendingBooking.id, status }).unwrap()
            toast.success(t('booking.statusUpdatedSuccessfully'))
        } catch (error) {
            toast.error(getApiErrorMessage(error, t('booking.failedToUpdateStatus')))
        } finally {
            setUpdatingBookingStatus(null)
        }
    }

    return (
        <div className="space-y-5 md:hidden">
            <div>
                <p className="text-sm font-medium text-muted-foreground">{dateLabel}</p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight">{t('ownerDashboard.title')}</h1>
            </div>

            <section className="grid grid-cols-3 divide-x rounded-xl border bg-card p-4 shadow-sm" aria-label={t('ownerDashboard.title')}>
                <div className="px-2 text-center first:pl-0 last:pr-0">
                    <p className="text-2xl font-bold tabular-nums">{pendingBookingsCount}</p>
                    <p className="mt-1 text-xs leading-tight text-muted-foreground">{t('booking.title')} {t('ownerDashboard.mobileToday').toLowerCase()}</p>
                </div>
                <div className="px-2 text-center first:pl-0 last:pr-0">
                    <p className="text-2xl font-bold tabular-nums">{formatCurrency(todayRevenue)}</p>
                    <p className="mt-1 text-xs leading-tight text-muted-foreground">{t('ownerDashboard.mobileRevenue')} {t('ownerDashboard.mobileToday').toLowerCase()}</p>
                </div>
                <div className="px-2 text-center first:pl-0 last:pr-0">
                    <p className="text-2xl font-bold tabular-nums">{occupancy}%</p>
                    <p className="mt-1 text-xs leading-tight text-muted-foreground">{t('ownerDashboard.mobileOccupancy')} {t('ownerDashboard.mobileToday').toLowerCase()}</p>
                </div>
            </section>

            {pendingBooking && (
                <article className="overflow-hidden rounded-xl border border-status-warning-border bg-card shadow-sm">
                    <div className="flex items-center justify-between border-b border-status-warning-border bg-status-warning-surface px-4 py-3">
                        <span className="rounded-full bg-status-warning-surface px-2.5 py-1 text-xs font-bold text-status-warning-foreground">
                            {t('booking.pendingStatusLabel')}
                        </span>
                        <span className="text-xs font-semibold text-muted-foreground">#{pendingBooking.id}</span>
                    </div>
                    <div className="p-4">
                        <div className="flex gap-3">
                            <ResilientImage
                                src="/images/cabinets/cabinet-beauty-bright-01.webp"
                                alt={pendingBooking.cabinet.title}
                                className="size-16 shrink-0 rounded-xl object-cover"
                                fallback={<Building2 className="size-6 text-muted-foreground" />}
                            />
                            <div className="min-w-0">
                                <h2 className="truncate font-bold">{pendingBooking.cabinet.title}</h2>
                                <p className="mt-1 truncate text-sm text-muted-foreground">{pendingBooking.service.title}</p>
                                <p className="mt-1 text-xs text-muted-foreground">{pendingBooking.client.name}</p>
                            </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                            <p className="flex items-center gap-2 text-muted-foreground"><CalendarDays className="size-4 shrink-0 text-primary" />{pendingBooking.date}</p>
                            <p className="flex items-center gap-2 text-muted-foreground"><Clock3 className="size-4 shrink-0 text-primary" />{pendingBooking.startTime}–{pendingBooking.endTime}</p>
                            <p className="flex items-center gap-2 text-muted-foreground"><Users className="size-4 shrink-0 text-primary" />{pendingBooking.client.name}</p>
                            <p className="truncate text-muted-foreground">{pendingBooking.cabinet.city}</p>
                        </div>

                        <p className="mt-4 text-sm font-semibold text-foreground">{t('ownerDashboard.mobileAwaitingResponse')}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{t('ownerDashboard.mobileBookingExpires')}</p>
                        <div className="mt-4 grid grid-cols-2 gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                loading={updatingBookingStatus === 'cancelled'}
                                disabled={isUpdatingBooking && updatingBookingStatus !== 'cancelled'}
                                className="min-h-11 border-destructive/30 px-3 text-sm font-semibold text-destructive hover:bg-destructive/10"
                                onClick={() => void handleBookingStatus('cancelled')}
                            >
                                {updatingBookingStatus !== 'cancelled' && <X className="mr-1.5 size-4" />}
                                {t('ownerDashboard.mobileDecline')}
                            </Button>
                            <Button
                                type="button"
                                loading={updatingBookingStatus === 'confirmed'}
                                disabled={isUpdatingBooking && updatingBookingStatus !== 'confirmed'}
                                className="min-h-11 px-3 text-sm font-semibold"
                                onClick={() => void handleBookingStatus('confirmed')}
                            >
                                {updatingBookingStatus !== 'confirmed' && <Check className="mr-1.5 size-4" />}
                                {t('ownerDashboard.mobileConfirm')}
                            </Button>
                        </div>
                    </div>
                </article>
            )}

            <section aria-labelledby="owner-mobile-upcoming-title">
                <div className="flex items-center justify-between gap-3">
                    <h2 id="owner-mobile-upcoming-title" className="text-lg font-bold">{t('ownerDashboard.mobileUpcomingToday')}</h2>
                    <Link to={ROUTES.ownerBookings} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                        {t('ownerDashboard.mobileViewCalendar')} <span aria-hidden="true">→</span>
                    </Link>
                </div>
                <div className="mt-3 space-y-2">
                    {upcomingBookings.slice(0, 3).map((booking) => (
                        <Link
                            key={booking.id}
                            to={ROUTES.ownerBookings}
                            className="flex items-center gap-3 rounded-xl border bg-card px-3 py-3 shadow-sm transition-colors hover:border-primary/40"
                        >
                            <span className="w-16 shrink-0 text-sm font-bold tabular-nums">{booking.startTime}</span>
                            <span className="min-w-0 flex-1 border-l pl-3">
                                <span className="block truncate text-sm font-semibold">{booking.cabinet.title}</span>
                                <span className="mt-0.5 block truncate text-xs text-muted-foreground">{booking.service.title} · {booking.client.name}</span>
                            </span>
                            <span className={booking.status === 'pending' ? 'text-xs font-semibold text-status-warning-foreground' : 'text-xs font-semibold text-status-success-foreground'}>
                                {booking.status === 'pending' ? t('booking.pendingStatusLabel') : t('booking.confirmedStatusLabel')}
                            </span>
                        </Link>
                    ))}
                    {upcomingBookings.length === 0 && (
                        <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">{t('ownerDashboard.noUpcomingBookings')}</p>
                    )}
                </div>
            </section>

            {!isOnline && (
                <div className="flex items-start gap-3 rounded-xl border border-status-warning-border bg-status-warning-surface px-3 py-3 text-sm">
                    <WifiOff className="mt-0.5 size-4 shrink-0 text-status-warning-foreground" />
                    <div>
                        <p className="font-semibold text-status-warning-foreground">{t('pwa.offlineTitle')}</p>
                        <p className="mt-0.5 text-xs text-status-warning-foreground">{t('ownerDashboard.mobileOfflineDraft')}</p>
                    </div>
                </div>
            )}

            <Link to={ROUTES.ownerCabinetCreate} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90">
                <Plus className="size-4" />
                {t('ownerDashboard.mobileAddSpace')}
            </Link>
        </div>
    )
}

export function OwnerDashboardPage() {
    const { t } = useTranslation()
    const {
        data: cabinetsData,
        isFetching: isCabinetsFetching,
        isLoading: isCabinetsLoading,
        isError: isCabinetsError,
        error: cabinetsError,
        refetch: refetchCabinets,
    } = useGetOwnerCabinetsQuery()

    const {
        data: servicesData,
        isFetching: isServicesFetching,
        isLoading: isServicesLoading,
        isError: isServicesError,
        error: servicesError,
        refetch: refetchServices,
    } = useGetOwnerServicesQuery()

    const {
        data: bookingsData,
        isFetching: isBookingsFetching,
        isLoading: isBookingsLoading,
        isError: isBookingsError,
        error: bookingsError,
        refetch: refetchBookings,
    } = useGetOwnerBookingsQuery()

    const {
        data: rescheduleRequestsData,
        isFetching: isRescheduleRequestsFetching,
        isLoading: isRescheduleRequestsLoading,
        isError: isRescheduleRequestsError,
        error: rescheduleRequestsError,
        refetch: refetchRescheduleRequests,
    } = useGetOwnerPendingRescheduleRequestsQuery()

    const {
        data: readinessData,
        isFetching: isReadinessFetching,
        isLoading: isReadinessLoading,
        isError: isReadinessError,
        error: readinessError,
        refetch: refetchReadiness,
    } = useGetOwnerReadinessQuery()

    const isOnline = useOnlineStatus()
    const cabinets = cabinetsData ?? []
    const services = servicesData ?? []
    const bookings = bookingsData ?? []
    const rescheduleRequests = rescheduleRequestsData ?? []
    const isLoading = isCabinetsLoading || isServicesLoading || isBookingsLoading || isRescheduleRequestsLoading || isReadinessLoading
    const isError = isCabinetsError || isServicesError || isBookingsError || isRescheduleRequestsError || isReadinessError
    const isFetching =
        isCabinetsFetching || isServicesFetching || isBookingsFetching || isRescheduleRequestsFetching || isReadinessFetching
    const queryState = resolveQueryViewState({
        isLoading,
        isFetching,
        isError,
        hasData: cabinetsData !== undefined || servicesData !== undefined || bookingsData !== undefined || rescheduleRequestsData !== undefined || readinessData !== undefined,
        hasResults: cabinets.length > 0 || services.length > 0 || bookings.length > 0 || readinessData !== undefined,
        isOffline: !isOnline,
    })
    const queryError = bookingsError ?? cabinetsError ?? servicesError ?? rescheduleRequestsError ?? readinessError

    const activeCabinetsCount = cabinets.filter(
        (cabinet) => cabinet.status === 'active',
    ).length

    const activeServicesCount = services.filter(
        (service) => service.isActive,
    ).length

    const pendingBookingsCount = bookings.filter(
        (booking) => booking.status === 'pending',
    ).length

    const confirmedBookingsCount = bookings.filter(
        (booking) => booking.status === 'confirmed',
    ).length

    const totalCabinetHourlyPrice = cabinets.reduce(
        (sum, cabinet) => sum + cabinet.pricePerHour,
        0,
    )

    const activeServices = services.filter((service) => service.isActive)
    const visibleActiveServices = activeServices.slice(0, 4)

    const averageCabinetHourlyPrice =
        cabinets.length > 0
            ? Math.round(totalCabinetHourlyPrice / cabinets.length)
            : 0

    const upcomingBookings = bookings
        .filter((booking) => booking.status === 'pending' || booking.status === 'confirmed')
        .slice(0, 3)
    const actionSummary = buildOwnerActionSummary({
        bookings,
        rescheduleRequests,
        cabinets,
        readiness: readinessData ?? null,
    })

    const retryOwnerDashboard = () => Promise.all([
        refetchCabinets(),
        refetchServices(),
        refetchBookings(),
        refetchRescheduleRequests(),
        refetchReadiness(),
    ])

    return (
        <main className="relative z-0 min-h-full bg-background px-4 py-5 md:py-8 lg:px-8">
            <section
                className="mx-auto max-w-6xl"
                aria-busy={isLoading || isFetching}
            >
                <div className="hidden md:block">
                    <OwnerDashboardHeader />

                    <QueryRefreshStatus
                        isRefreshing={queryState === 'refreshing'}
                        label={t('common.refreshing')}
                    />
                </div>

                {queryState === 'loading' && <OwnerDashboardStateCard state="loading" />}

                {queryState === 'error' && (
                    <OwnerDashboardStateCard
                        onRetry={retryOwnerDashboard}
                        state="error"
                    />
                )}

                {queryState === 'offline' && (
                    <OwnerDashboardStateCard
                        onRetry={retryOwnerDashboard}
                        state="offline"
                    />
                )}

                {queryState === 'stale-error' && (
                    <QueryRefreshError
                        message={getApiErrorMessage(queryError, t('common.tryAgainLater'))}
                        onRetry={retryOwnerDashboard}
                        retryLabel={t('common.retry')}
                    />
                )}

                {queryState !== 'loading' && queryState !== 'error' && (
                    <>
                        <OwnerMobileDashboard
                            bookings={bookings}
                            cabinetsCount={cabinets.length}
                            confirmedBookingsCount={confirmedBookingsCount}
                            pendingBookingsCount={pendingBookingsCount}
                            upcomingBookings={upcomingBookings}
                        />
                        <OwnerActionCenter summary={actionSummary} />
                        <div className="hidden md:block">
                            <OwnerDashboardContent
                                activeCabinetsCount={activeCabinetsCount}
                                activeServices={visibleActiveServices}
                                activeServicesCount={activeServicesCount}
                                averageCabinetHourlyPrice={averageCabinetHourlyPrice}
                                bookingsCount={bookings.length}
                                cabinetsCount={cabinets.length}
                                confirmedBookingsCount={confirmedBookingsCount}
                                hasServices={services.length > 0}
                                pendingBookingsCount={pendingBookingsCount}
                                servicesCount={services.length}
                                upcomingBookings={upcomingBookings}
                                allBookings={bookings}
                                allServices={services}
                            />
                        </div>
                    </>
                )}
            </section>
        </main>
    )
}
