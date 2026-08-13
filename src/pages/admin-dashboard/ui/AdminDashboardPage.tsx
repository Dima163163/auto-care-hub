import { useGetAdminCabinetsQuery } from '@/entities/cabinet'
import { useGetAdminUsersQuery } from '@/entities/user'
import { useTranslation } from '@/shared/lib/useTranslation'
import { QueryRefreshStatus } from '@/shared/ui/query-refresh-status'

import { AdminDashboardContent } from './AdminDashboardContent'
import { AdminDashboardHeader } from './AdminDashboardHeader'
import { AdminDashboardStateCard } from './AdminDashboardStateCard'

export function AdminDashboardPage() {
    const { t } = useTranslation()
    const {
        data: users = [],
        isFetching: isUsersFetching,
        isLoading: isUsersLoading,
        isError: isUsersError,
        refetch: refetchUsers,
    } = useGetAdminUsersQuery()

    const {
        data: cabinets = [],
        isFetching: isCabinetsFetching,
        isLoading: isCabinetsLoading,
        isError: isCabinetsError,
        refetch: refetchCabinets,
    } = useGetAdminCabinetsQuery()

    const isLoading = isUsersLoading || isCabinetsLoading
    const isError = isUsersError || isCabinetsError
    const isFetching = isUsersFetching || isCabinetsFetching

    const clientsCount = users.filter((user) => user.role === 'client').length
    const ownersCount = users.filter((user) => user.role === 'owner').length
    const adminsCount = users.filter(
        (user) => user.role === 'admin' || user.role === 'super_admin'
    ).length

    const activeUsersCount = users.filter((user) => user.status === 'active').length

    const blockedUsersCount = users.filter(
        (user) => user.status === 'blocked'
    ).length

    const activeCabinetsCount = cabinets.filter(
        (cabinet) => cabinet.status === 'active',
    ).length

    const draftCabinetsCount = cabinets.filter(
        (cabinet) => cabinet.status === 'draft',
    ).length

    const blockedCabinetsCount = cabinets.filter(
        (cabinet) => cabinet.status === 'blocked',
    ).length

    const totalCabinetHourlyPrice = cabinets.reduce(
        (sum, cabinet) => sum + cabinet.pricePerHour,
        0,
    )

    const averageCabinetHourlyPrice =
        cabinets.length > 0
            ? Math.round(totalCabinetHourlyPrice / cabinets.length)
            : 0

    const recentUsers = users.slice(0, 4)
    const recentCabinets = cabinets.slice(0, 4)

    return (
        <main className="relative z-0 min-h-full bg-background px-4 py-8 lg:px-8">
            <section
                className="mx-auto max-w-6xl"
                aria-busy={isLoading || isFetching}
            >
                <AdminDashboardHeader />

                <QueryRefreshStatus
                    isRefreshing={isFetching && !isLoading}
                    label={t('common.refreshing')}
                />

                {isLoading && <AdminDashboardStateCard state="loading" />}

                {isError && (
                    <AdminDashboardStateCard
                        onRetry={() => void Promise.all([refetchUsers(), refetchCabinets()])}
                        state="error"
                    />
                )}

                {!isLoading && !isError && (
                    <AdminDashboardContent
                        activeCabinetsCount={activeCabinetsCount}
                        activeUsersCount={activeUsersCount}
                        adminsCount={adminsCount}
                        averageCabinetHourlyPrice={averageCabinetHourlyPrice}
                        blockedCabinetsCount={blockedCabinetsCount}
                        blockedUsersCount={blockedUsersCount}
                        cabinetsCount={cabinets.length}
                        clientsCount={clientsCount}
                        draftCabinetsCount={draftCabinetsCount}
                        ownersCount={ownersCount}
                        recentCabinets={recentCabinets}
                        recentUsers={recentUsers}
                        usersCount={users.length}
                    />
                )}
            </section>
        </main>
    )
}
