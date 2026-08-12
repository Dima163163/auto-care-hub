import { formatCurrency } from '@/shared/lib/formatCurrency'
import { useTranslation } from '@/shared/lib/useTranslation'
import { StatCard } from '@/shared/ui/stat-card'

type AdminDashboardStatsProps = {
    activeCabinetsCount: number
    activeUsersCount: number
    adminsCount: number
    averageCabinetHourlyPrice: number
    blockedCabinetsCount: number
    blockedUsersCount: number
    cabinetsCount: number
    clientsCount: number
    draftCabinetsCount: number
    ownersCount: number
    usersCount: number
}

export function AdminDashboardStats({
    activeCabinetsCount,
    activeUsersCount,
    adminsCount,
    averageCabinetHourlyPrice,
    blockedCabinetsCount,
    blockedUsersCount,
    cabinetsCount,
    clientsCount,
    draftCabinetsCount,
    ownersCount,
    usersCount,
}: AdminDashboardStatsProps) {
    const { t } = useTranslation()
    const moderationCount =
        draftCabinetsCount + blockedCabinetsCount + blockedUsersCount

    return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
                description={t('adminDashboard.userRoleCounts', {
                    clients: clientsCount,
                    owners: ownersCount,
                    admins: adminsCount,
                })}
                secondaryDescription={t('adminDashboard.userStatusCounts', {
                    active: activeUsersCount,
                    blocked: blockedUsersCount,
                })}
                label={t('adminDashboard.users')}
                value={usersCount}
            />

            <StatCard
                description={t('adminDashboard.activeCount', {
                    count: activeCabinetsCount,
                })}
                label={t('cabinet.cabinets')}
                value={cabinetsCount}
            />

            <StatCard
                description={t('adminDashboard.moderationBreakdown', {
                    draftCabinets: draftCabinetsCount,
                    blockedCabinets: blockedCabinetsCount,
                    blockedUsers: blockedUsersCount,
                })}
                label={t('adminDashboard.moderation')}
                value={moderationCount}
            />

            <StatCard
                description={t('adminDashboard.perHour')}
                label={t('adminDashboard.averageCabinetPrice')}
                value={formatCurrency(averageCabinetHourlyPrice)}
            />
        </div>
    )
}
