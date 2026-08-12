import { formatCurrency } from '@/shared/lib/formatCurrency'
import { useTranslation } from '@/shared/lib/useTranslation'
import { StatCard } from '@/shared/ui/stat-card'

type OwnerDashboardStatsProps = {
    activeCabinetsCount: number
    activeServicesCount: number
    averageCabinetHourlyPrice: number
    bookingsCount: number
    cabinetsCount: number
    confirmedBookingsCount: number
    pendingBookingsCount: number
    servicesCount: number
}

export function OwnerDashboardStats({
    activeCabinetsCount,
    activeServicesCount,
    averageCabinetHourlyPrice,
    bookingsCount,
    cabinetsCount,
    confirmedBookingsCount,
    pendingBookingsCount,
    servicesCount,
}: OwnerDashboardStatsProps) {
    const { t } = useTranslation()

    return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
                description={t('ownerDashboard.activeCount', {
                    count: activeCabinetsCount,
                })}
                label={t('cabinet.cabinets')}
                value={cabinetsCount}
            />

            <StatCard
                description={t('ownerDashboard.activeCount', {
                    count: activeServicesCount,
                })}
                label={t('service.services')}
                value={servicesCount}
            />

            <StatCard
                description={t('ownerDashboard.bookingStatusCounts', {
                    pending: pendingBookingsCount,
                    confirmed: confirmedBookingsCount,
                })}
                label={t('booking.title')}
                value={bookingsCount}
            />

            <StatCard
                description={t('ownerDashboard.perHour')}
                label={t('ownerDashboard.averageCabinetPrice')}
                value={formatCurrency(averageCabinetHourlyPrice)}
            />
        </div>
    )
}
