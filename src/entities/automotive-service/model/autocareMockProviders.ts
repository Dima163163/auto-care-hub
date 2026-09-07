import { generatedProviderPreviews } from './autocareGeneratedProviders'
import type { ProviderPreview } from './autocareMockData'

const featuredProviderPreviews: readonly ProviderPreview[] = [
    {
        id: 'proservice-moscow', name: 'ProService', rating: 4.7, reviewCount: 256,
        distance: '2.1 km', distanceKm: 2.1, price: 2900, currency: 'RUB', nextSlot: 'Today, 14:30',
        image: '/images/autocare/providers/proservice.webp', logoUrl: '/images/autocare/providers/logos/proservice.svg', bonus: '5% back', verified: true, mapPosition: [55.758, 37.594],
        serviceIds: ['oil-change', 'diagnostics', 'brakes', 'mobile-diagnostics', 'electric', 'battery-service', 'wheel-alignment'],
        brandSpecializations: ['bmw', 'mercedes-benz', 'audi'], isMultibrand: false,
    },
    {
        id: 'autolux-moscow', name: 'AutoLux', rating: 4.9, reviewCount: 412,
        distance: '3.4 km', distanceKm: 3.4, price: 3200, currency: 'RUB', nextSlot: 'Today, 15:00',
        image: '/images/autocare/providers/detailing.webp', logoUrl: '/images/autocare/providers/logos/autolux.svg', verified: true, mapPosition: [55.741, 37.603],
        serviceIds: ['detailing', 'car-wash', 'body-paint', 'windshield-repair', 'oil-change'],
        brandSpecializations: ['toyota', 'volkswagen', 'skoda'], isMultibrand: false,
    },
    {
        id: 'formula-moscow', name: 'Formula Motion', rating: 4.6, reviewCount: 189,
        distance: '4.2 km', distanceKm: 4.2, price: 2800, currency: 'RUB', nextSlot: 'Today, 16:00',
        image: null, bonus: 'Free check', verified: false, mapPosition: [55.749, 37.626],
        serviceIds: ['engine', 'suspension', 'roadside-assistance', 'oil-change', 'diagnostics'],
        brandSpecializations: [], isMultibrand: true,
    },
] as const

export const providerPreviews: readonly ProviderPreview[] = [...featuredProviderPreviews, ...generatedProviderPreviews]
