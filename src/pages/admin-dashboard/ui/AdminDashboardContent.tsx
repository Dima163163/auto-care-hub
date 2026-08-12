import type { Cabinet } from '@/entities/cabinet'
import type { User } from '@/entities/user'

import { AdminDashboardCabinets } from './AdminDashboardCabinets'
import { AdminDashboardStats } from './AdminDashboardStats'
import { AdminDashboardUsers } from './AdminDashboardUsers'
import { AdminOperatorActionCenter } from './AdminOperatorActionCenter'

type AdminDashboardContentProps = {
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
    recentCabinets: Cabinet[]
    recentUsers: User[]
    usersCount: number
}

export function AdminDashboardContent({
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
    recentCabinets,
    recentUsers,
    usersCount,
}: AdminDashboardContentProps) {
    return (
        <div className="space-y-6">
            <AdminDashboardStats
                activeCabinetsCount={activeCabinetsCount}
                activeUsersCount={activeUsersCount}
                adminsCount={adminsCount}
                averageCabinetHourlyPrice={averageCabinetHourlyPrice}
                blockedCabinetsCount={blockedCabinetsCount}
                blockedUsersCount={blockedUsersCount}
                cabinetsCount={cabinetsCount}
                clientsCount={clientsCount}
                draftCabinetsCount={draftCabinetsCount}
                ownersCount={ownersCount}
                usersCount={usersCount}
            />

            <AdminOperatorActionCenter />

            <div className="grid gap-6 xl:grid-cols-2">
                <AdminDashboardUsers users={recentUsers} />
                <AdminDashboardCabinets cabinets={recentCabinets} />
            </div>
        </div>
    )
}
