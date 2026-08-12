import type { OwnerBooking } from '@/entities/booking'
import type { Service } from '@/entities/service'

import { OwnerDashboardAnalytics } from './OwnerDashboardAnalytics'
import { OwnerDashboardBookings } from './OwnerDashboardBookings'
import { OwnerDashboardServices } from './OwnerDashboardServices'
import { OwnerDashboardStats } from './OwnerDashboardStats'
import { OwnerGrowthPanel } from './OwnerGrowthPanel'

type OwnerDashboardContentProps = {
    activeCabinetsCount: number
    activeServices: Service[]
    activeServicesCount: number
    averageCabinetHourlyPrice: number
    bookingsCount: number
    cabinetsCount: number
    confirmedBookingsCount: number
    hasServices: boolean
    pendingBookingsCount: number
    servicesCount: number
    upcomingBookings: OwnerBooking[]
    allBookings: OwnerBooking[]
    allServices: Service[]
}

export function OwnerDashboardContent({
    activeCabinetsCount,
    activeServices,
    activeServicesCount,
    averageCabinetHourlyPrice,
    bookingsCount,
    cabinetsCount,
    confirmedBookingsCount,
    hasServices,
    pendingBookingsCount,
    servicesCount,
    upcomingBookings,
    allBookings,
    allServices,
}: OwnerDashboardContentProps) {
    return (
        <div className="space-y-6">
            <OwnerDashboardStats
                activeCabinetsCount={activeCabinetsCount}
                activeServicesCount={activeServicesCount}
                averageCabinetHourlyPrice={averageCabinetHourlyPrice}
                bookingsCount={bookingsCount}
                cabinetsCount={cabinetsCount}
                confirmedBookingsCount={confirmedBookingsCount}
                pendingBookingsCount={pendingBookingsCount}
                servicesCount={servicesCount}
            />

            <OwnerGrowthPanel />

            <OwnerDashboardAnalytics bookings={allBookings} services={allServices} />

            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <OwnerDashboardBookings bookings={upcomingBookings} />
                <OwnerDashboardServices
                    hasServices={hasServices}
                    services={activeServices}
                />
            </div>
        </div>
    )
}
