import type { OwnerBooking } from '@/entities/booking'
import type { Cabinet } from '@/entities/cabinet'
import type { Service } from '@/entities/service'
import type { OwnerClient } from '@/entities/user'

import { OwnerBookingCard } from './OwnerBookingCard'

type OwnerBookingSectionProps = {
    title: string
    description: string
    emptyMessage: string
    bookings: OwnerBooking[]
    clients: OwnerClient[]
    cabinets: Cabinet[]
    services: Service[]
}

export function OwnerBookingSection({
    title,
    description,
    emptyMessage,
    bookings,
    clients,
    cabinets,
    services,
}: OwnerBookingSectionProps) {
    const bookingsCount = bookings.length

    return (
        <section className="space-y-4">
            <div>
                <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-semibold tracking-tight">
                        {title}
                    </h2>

                    <span className="rounded-md border bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">
                        {bookingsCount}
                    </span>
                </div>

                <p className="mt-2 text-sm text-muted-foreground">
                    {description}
                </p>
            </div>

            {bookings.length === 0 ? (
                <div className="rounded-xl border bg-card p-6 shadow-sm">
                    <p className="text-sm text-muted-foreground">
                        {emptyMessage}
                    </p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {bookings.map((booking) => {
                        const client = clients.find(
                            (item) => item.id === booking.clientId,
                        )

                        const cabinet = cabinets.find(
                            (item) => item.id === booking.cabinetId,
                        )

                        const service = services.find(
                            (item) => item.id === booking.serviceId,
                        )

                        return (
                            <OwnerBookingCard
                                key={booking.id}
                                booking={booking}
                                client={client}
                                cabinet={cabinet}
                                service={service}
                            />
                        )
                    })}
                </div>
            )}
        </section>
    )
}
