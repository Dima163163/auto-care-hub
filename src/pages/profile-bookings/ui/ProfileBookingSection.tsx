import type { ClientBooking } from '@/entities/booking'
import type { ReactNode } from 'react'

import { StateCard } from '@/shared/ui/state-card'

import { ProfileBookingCard } from './ProfileBookingCard'

type ProfileBookingSectionProps = {
    title: string
    description: string
    emptyMessage: string
    bookings: ClientBooking[]
    emptyAction?: ReactNode
}

export function ProfileBookingSection({
  title,
  description,
  emptyMessage,
  bookings,
  emptyAction,
}: ProfileBookingSectionProps) {
    const bookingsCount = bookings.length

    return (
        <section className="space-y-4">
            <div>
                <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-semibold tracking-tight">
                        {title}
                    </h2>

                    <span className="rounded-full border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                        {bookingsCount}
                    </span>
                </div>

                <p className="mt-2 text-sm text-muted-foreground">
                    {description}
                </p>
            </div>

            {bookings.length === 0 ? (
                <StateCard description={emptyMessage} action={emptyAction} />
            ) : (
                <div className="autocarehub-motion-fade-in grid min-w-0 gap-4 overflow-x-hidden"
                >
                    {bookings.map((booking) => (
                        <div
                            key={booking.id}
                            className="autocarehub-motion-list-item"
                        >
                            <ProfileBookingCard booking={booking} />
                        </div>
                    ))}
                </div>
            )}
        </section>
    )
}
