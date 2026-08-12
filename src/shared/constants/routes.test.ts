import { describe, expect, it } from 'vitest'

import { routePaths } from './routes'

describe('cabinet routes', () => {
    it('preserves availability search parameters in the catalog URL', () => {
        expect(routePaths.cabinets({
            city: 'Berlin',
            service: 'massage',
            date: '2026-08-05',
            duration: 90,
            availableToday: true,
        })).toBe('/cabinets?city=Berlin&service=massage&date=2026-08-05&duration=90&availableToday=true')
    })

    it('does not emit empty availability parameters', () => {
        expect(routePaths.cabinets({ city: '  ', service: '', date: '', duration: '' }))
            .toBe('/cabinets')
    })

    it('reopens a cabinet with only the prior service hint for Book again', () => {
        expect(routePaths.cabinetDetails('cabinet-1', { serviceId: 'service-1' }))
            .toBe('/cabinets/cabinet-1?serviceId=service-1')
        expect(routePaths.cabinetDetails('cabinet-1', { serviceId: 'service-1', source: 'book_again' }))
            .toBe('/cabinets/cabinet-1?serviceId=service-1&source=book_again')
        expect(routePaths.cabinetDetails('cabinet-1', {
            serviceId: 'service-1',
            source: 'book_again',
            sourceBookingId: 'booking-1',
        })).toBe('/cabinets/cabinet-1?serviceId=service-1&source=book_again&sourceBookingId=booking-1')
        expect(routePaths.cabinetDetails('cabinet-1', { from: 'filtered-catalog' }))
            .toBe('/cabinets/cabinet-1?from=filtered-catalog')
        expect(routePaths.cabinetDetails('cabinet-1')).toBe('/cabinets/cabinet-1')
    })
})
