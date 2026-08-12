type BookingSuccessLinkInput = {
    cabinetTitle: string
    address: string
    city: string
    serviceTitle: string
    date: string
    startTime: string
    endTime: string
}

function getCabinetLocation(input: Pick<BookingSuccessLinkInput, 'address' | 'city'>) {
    return `${input.address}, ${input.city}`
}

export function createCabinetMapUrl(input: Pick<BookingSuccessLinkInput, 'address' | 'city'>) {
    const query = encodeURIComponent(getCabinetLocation(input))

    return `https://www.google.com/maps/search/?api=1&query=${query}`
}

export function createCabinetDirectionsUrl(input: Pick<BookingSuccessLinkInput, 'address' | 'city'>) {
    const destination = encodeURIComponent(getCabinetLocation(input))

    return `https://www.google.com/maps/dir/?api=1&destination=${destination}`
}

export function createBookingCalendarUrl(input: BookingSuccessLinkInput) {
    const date = input.date.replaceAll('-', '')
    const start = input.startTime.replace(':', '')
    const end = input.endTime.replace(':', '')
    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: input.serviceTitle,
        dates: `${date}T${start}00/${date}T${end}00`,
        location: getCabinetLocation(input),
        details: input.cabinetTitle,
    })

    return `https://calendar.google.com/calendar/render?${params.toString()}`
}
