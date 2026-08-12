import { useTranslation } from '@/shared/lib/useTranslation'

type BookingSummaryCardsProps = {
    totalBookingsCount: number
    upcomingBookingsCount: number
    cancelledBookingsCount: number
    completedBookingsCount: number
}

export function BookingSummaryCards({
    totalBookingsCount,
    upcomingBookingsCount,
    cancelledBookingsCount,
    completedBookingsCount,
}: BookingSummaryCardsProps) {
    const { t } = useTranslation()
    const cards = [
        {
            title: t('booking.totalBookings'),
            value: totalBookingsCount,
            description: t('booking.totalBookingsDescription'),
        },
        {
            title: t('booking.upcoming'),
            value: upcomingBookingsCount,
            description: t('booking.upcomingDescription'),
        },
        {
            title: t('booking.cancelled'),
            value: cancelledBookingsCount,
            description: t('booking.cancelledDescription'),
        },
        {
            title: t('booking.completed'),
            value: completedBookingsCount,
            description: t('booking.completedDescription'),
        },
    ]

    return (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((card) => (
                <article
                    key={card.title}
                    className="rounded-lg border bg-card p-5 shadow-sm"
                >
                    <p className="text-sm font-medium text-muted-foreground">
                        {card.title}
                    </p>

                    <p className="mt-3 text-3xl font-semibold tracking-tight">
                        {card.value}
                    </p>

                    <p className="mt-2 text-sm text-muted-foreground">
                        {card.description}
                    </p>
                </article>
            ))}
        </div>
    )
}
