import type { OwnerBooking } from '@/entities/booking'

export type OwnerAnalyticsCsvLabels = {
    date: string
    time: string
    status: string
    cabinet: string
    service: string
    city: string
    durationMinutes: string
    price: string
    currency: string
    paymentStatus: string
}

function escapeCsvCell(value: string | number | null | undefined) {
    const normalized = String(value ?? '')

    return /[",\n\r]/.test(normalized)
        ? `"${normalized.replace(/"/g, '""')}"`
        : normalized
}

function getDurationMinutes(booking: OwnerBooking) {
    const [startHoursText = '', startMinutesText = ''] = booking.startTime.split(':')
    const [endHoursText = '', endMinutesText = ''] = booking.endTime.split(':')
    const start = Number(startHoursText) * 60 + Number(startMinutesText)
    const end = Number(endHoursText) * 60 + Number(endMinutesText)

    return Number.isFinite(start) && Number.isFinite(end)
        ? Math.max(0, end - start)
        : 0
}

export function buildOwnerAnalyticsCsv(
    bookings: readonly OwnerBooking[],
    labels: OwnerAnalyticsCsvLabels,
) {
    const header = [
        labels.date,
        labels.time,
        labels.status,
        labels.cabinet,
        labels.service,
        labels.city,
        labels.durationMinutes,
        labels.price,
        labels.currency,
        labels.paymentStatus,
    ]
    const rows = bookings.map((booking) => [
        booking.date,
        `${booking.startTime}-${booking.endTime}`,
        booking.status,
        booking.cabinet.title,
        booking.service.title,
        booking.cabinet.city,
        getDurationMinutes(booking),
        booking.service.price,
        booking.paymentLedger?.currency ?? '',
        booking.paymentLedger?.status ?? '',
    ])

    return [header, ...rows]
        .map((row) => row.map(escapeCsvCell).join(','))
        .join('\r\n')
}
