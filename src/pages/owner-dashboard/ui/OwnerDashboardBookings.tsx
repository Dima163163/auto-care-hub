import { BookingStatusBadge, type Booking } from '@/entities/booking'
import { ROUTES } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'

import { OwnerDashboardSectionHeader } from './OwnerDashboardSectionHeader'

type OwnerDashboardBookingsProps = {
    bookings: Booking[]
}

export function OwnerDashboardBookings({
    bookings,
}: OwnerDashboardBookingsProps) {
    const { t } = useTranslation()

    return (
        <div className="rounded-xl border bg-card p-6 shadow-sm">
            <OwnerDashboardSectionHeader
                description={t('ownerDashboard.upcomingBookingsDescription')}
                linkLabel={t('ownerDashboard.viewAll')}
                title={t('ownerDashboard.upcomingBookings')}
                to={ROUTES.ownerBookings}
            />

            {bookings.length === 0 && (
                <p className="text-sm text-muted-foreground">
                    {t('ownerDashboard.noUpcomingBookings')}
                </p>
            )}

            {bookings.length > 0 && (
                <div className="space-y-3">
                    {bookings.map((booking) => (
                        <div
                            key={booking.id}
                            className="rounded-xl border bg-background p-4"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="font-medium">
                                        {booking.date} · {booking.startTime}–{booking.endTime}
                                    </p>

                                    <p className="mt-1 text-sm text-muted-foreground">
                                        {t('ownerDashboard.bookingMeta', {
                                            cabinetId: booking.cabinetId,
                                            serviceId: booking.serviceId,
                                        })}
                                    </p>
                                </div>

                                <BookingStatusBadge status={booking.status} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
