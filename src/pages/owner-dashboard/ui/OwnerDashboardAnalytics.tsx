import { Download } from 'lucide-react'

import type { OwnerBooking } from '@/entities/booking'
import type { Service } from '@/entities/service'
import { formatCurrency } from '@/shared/lib/formatCurrency'
import { useTranslation } from '@/shared/lib/useTranslation'
import { Button } from '@/components/ui/button'

import { buildOwnerAnalyticsCsv } from '../lib/buildOwnerAnalyticsCsv'

type OwnerDashboardAnalyticsProps = {
    bookings: OwnerBooking[]
    services: Service[]
}

const DAY_MS = 24 * 60 * 60 * 1000

function getDurationMinutes(booking: OwnerBooking) {
    const [startHoursText = '', startMinutesText = ''] = booking.startTime.split(':')
    const [endHoursText = '', endMinutesText = ''] = booking.endTime.split(':')
    const startHours = Number(startHoursText)
    const startMinutes = Number(startMinutesText)
    const endHours = Number(endHoursText)
    const endMinutes = Number(endMinutesText)

    if (
        !Number.isFinite(startHours)
        || !Number.isFinite(startMinutes)
        || !Number.isFinite(endHours)
        || !Number.isFinite(endMinutes)
    ) {
        return 0
    }

    return Math.max(0, endHours * 60 + endMinutes - startHours * 60 - startMinutes)
}

export function OwnerDashboardAnalytics({ bookings, services }: OwnerDashboardAnalyticsProps) {
    const { t } = useTranslation()
    const serviceById = new Map(services.map((service) => [service.id, service]))
    const today = new Date()
    const endDate = new Date(today.getTime() + 30 * DAY_MS)
    const scheduledBookings = bookings.filter((booking) => {
        const bookingDate = new Date(`${booking.date}T${booking.startTime}`)

        return (
            (booking.status === 'pending' || booking.status === 'confirmed') &&
            bookingDate >= today &&
            bookingDate <= endDate
        )
    })
    const bookedMinutes = scheduledBookings.reduce(
        (total, booking) => total + getDurationMinutes(booking),
        0,
    )
    const revenue = scheduledBookings.reduce(
        (total, booking) => total + (serviceById.get(booking.serviceId)?.price ?? 0),
        0,
    )
    const serviceCounts = scheduledBookings.reduce<Map<string, number>>((counts, booking) => {
        counts.set(booking.serviceId, (counts.get(booking.serviceId) ?? 0) + 1)
        return counts
    }, new Map())
    const popularServices = [...serviceCounts.entries()]
        .sort(([, leftCount], [, rightCount]) => rightCount - leftCount)
        .slice(0, 3)
    const downloadAnalytics = () => {
        const csv = buildOwnerAnalyticsCsv(scheduledBookings, {
            date: t('booking.date'),
            time: t('adminAuditLogs.timestamp'),
            status: t('common.status'),
            cabinet: t('navigation.cabinets'),
            service: t('service.services'),
            city: t('cabinet.publicList.cityLabel'),
            durationMinutes: t('service.form.durationLabel'),
            price: t('service.form.priceLabel'),
        })
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
        const link = document.createElement('a')
        link.href = url
        link.download = `autocarehub-owner-analytics-${new Date().toISOString().slice(0, 10)}.csv`
        link.click()
        link.remove()
        URL.revokeObjectURL(url)
    }

    return (
        <section className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="text-lg font-semibold tracking-tight">{t('ownerDashboard.analyticsTitle')}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{t('ownerDashboard.analyticsDescription')}</p>
                </div>
                {scheduledBookings.length > 0 && (
                    <Button type="button" variant="outline" size="sm" onClick={downloadAnalytics}>
                        <Download aria-hidden="true" className="size-4" />
                        {t('adminAuditLogs.export')}
                    </Button>
                )}
            </div>

            {scheduledBookings.length === 0 ? (
                <p className="mt-5 text-sm text-muted-foreground">{t('ownerDashboard.noBookingData')}</p>
            ) : (
                <div className="mt-5 grid gap-4 lg:grid-cols-[repeat(3,minmax(0,1fr))_1.2fr]">
                    <Metric label={t('ownerDashboard.projectedRevenue')} value={formatCurrency(revenue)} />
                    <Metric label={t('ownerDashboard.bookedHours')} value={(bookedMinutes / 60).toFixed(1)} />
                    <Metric
                        label={t('ownerDashboard.bookingLoad')}
                        value={`${Math.min(100, Math.round((bookedMinutes / (30 * 8 * 60)) * 100))}%`}
                    />
                    <div className="rounded-xl border bg-background p-4">
                        <p className="text-sm text-muted-foreground">{t('ownerDashboard.popularServices')}</p>
                        <div className="mt-3 space-y-2">
                            {popularServices.map(([serviceId, count]) => (
                                <p key={serviceId} className="flex justify-between gap-3 text-sm">
                                    <span className="truncate font-medium">{serviceById.get(serviceId)?.title ?? serviceId}</span>
                                    <span className="text-muted-foreground">{count}</span>
                                </p>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </section>
    )
}

function Metric({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl border bg-background p-4">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
        </div>
    )
}
