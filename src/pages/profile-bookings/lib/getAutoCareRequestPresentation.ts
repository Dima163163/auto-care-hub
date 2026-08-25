import type { ClientBooking } from '@/entities/booking'
import { getProviderProfile } from '@/entities/automotive-service'

const providerIdsByStatus = {
    pending: 'autolux-moscow',
    confirmed: 'proservice-moscow',
    completed: 'formula-moscow',
    cancelled: 'autolux-moscow',
} as const

export function getAutoCareRequestPresentation(booking: ClientBooking) {
    const provider = getProviderProfile(providerIdsByStatus[booking.status]) ?? getProviderProfile('proservice-moscow')

    if (!provider) return null

    return {
        provider,
        offering: provider.offerings[booking.status === 'completed' ? 1 : 0],
        requestNumber: `AC-${booking.id.slice(-6).toUpperCase()}`,
    }
}
