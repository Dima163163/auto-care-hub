import { useId } from 'react'
import { CalendarDays, Clock3, MapPin, WalletCards } from 'lucide-react'
import { Link } from 'react-router'

import { useGetMyBookingsQuery, type BookingStatus } from '@/entities/booking'
import { useGetMeQuery } from '@/features/auth'
import { ROUTES, routePaths } from '@/shared/constants/routes'
import { formatCurrency } from '@/shared/lib/formatCurrency'
import type { TranslationKey } from '@/shared/lib/i18n'
import { useTranslation } from '@/shared/lib/useTranslation'

import { getUpcomingBookingPreviewItems } from '../lib/getUpcomingBookingPreviewItems'

type UpcomingBookingsStripProps = {
    className?: string
    limit?: number
}

const statusLabelKeys = {
    pending: 'booking.pendingStatusLabel',
    confirmed: 'booking.confirmedStatusLabel',
    cancelled: 'booking.cancelledStatusLabel',
    completed: 'booking.completedStatusLabel',
} satisfies Record<BookingStatus, TranslationKey>

const statusClassNames = {
    pending: 'bg-status-warning-surface text-status-warning-foreground',
    confirmed: 'bg-status-success-surface text-status-success-foreground',
    cancelled: 'bg-status-neutral-surface text-status-neutral-foreground',
    completed: 'bg-status-info-surface text-status-info-foreground',
} satisfies Record<BookingStatus, string>

export function UpcomingBookingsStrip({
    className = '',
    limit = 2,
}: UpcomingBookingsStripProps) {
    const titleId = useId()
    const { t } = useTranslation()
    const { data: user } = useGetMeQuery()
    const isClient = user?.role === 'client'
    const { data: bookings = [] } = useGetMyBookingsQuery(undefined, {
        skip: !isClient,
    })
    const previewItems = getUpcomingBookingPreviewItems(bookings, limit)

    if (!isClient || previewItems.length === 0) {
        return null
    }

    return (
        <section className={className} aria-labelledby={titleId}>
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <CalendarDays className="size-5" />
                        </span>
                        <div>
                            <h2 id={titleId} className="text-lg font-black tracking-tight text-foreground">
                                {t('booking.upcomingStripTitle')}
                            </h2>
                            <p className="mt-1 text-[13px] font-semibold text-muted-foreground">
                                {t('booking.upcomingStripDescription')}
                            </p>
                        </div>
                    </div>
                    <Link
                        to={ROUTES.profileBookings}
                        className="text-[13px] font-extrabold text-primary transition hover:text-primary/80"
                    >
                        {t('booking.upcomingStripViewAll')}
                    </Link>
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    {previewItems.map((booking) => (
                        <Link
                            key={booking.id}
                            to={routePaths.cabinetDetails(booking.cabinet.id)}
                            className="grid gap-3 rounded-lg border border-border bg-background p-3 transition hover:border-primary/35 hover:bg-primary/5"
                        >
                            <div className="flex min-w-0 items-center justify-between gap-3">
                                <div className="flex min-w-0 items-center gap-2 text-sm font-black text-foreground">
                                    <Clock3 className="size-4 shrink-0 text-primary" />
                                    <span className="truncate">
                                        {booking.date}, {booking.startTime}–{booking.endTime}
                                    </span>
                                </div>
                                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-extrabold ${statusClassNames[booking.status]}`}>
                                    {t(statusLabelKeys[booking.status])}
                                </span>
                            </div>

                            <div className="min-w-0">
                                <p className="truncate text-sm font-extrabold text-foreground">
                                    {booking.service.title}
                                </p>
                                <p className="mt-1 truncate text-[13px] font-semibold text-muted-foreground">
                                    {booking.cabinet.title}
                                </p>
                            </div>

                            <div className="grid gap-2 text-xs font-bold text-muted-foreground sm:grid-cols-[1fr_auto]">
                                <span className="flex min-w-0 items-center gap-1.5">
                                    <MapPin className="size-3.5 shrink-0 text-primary" />
                                    <span className="truncate">
                                        {booking.cabinet.city}, {booking.cabinet.address}
                                    </span>
                                </span>
                                <span className="flex items-center gap-1.5 text-foreground">
                                    <WalletCards className="size-3.5 text-primary" />
                                    {formatCurrency(booking.service.price)}
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    )
}
