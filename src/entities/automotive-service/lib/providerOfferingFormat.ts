import type { ProviderOffering } from '../model/autocareMockData'
import { formatCurrency, formatDurationMinutes } from '@/shared/lib/locale-format'

type ProviderOfferingPriceLabels = {
    from: (price: string) => string
    quoteRequired: string
}

export function formatProviderOfferingPrice(
    offering: ProviderOffering,
    locale: string,
    labels: ProviderOfferingPriceLabels,
): string {
    if (offering.price === undefined || !offering.currency) return offering.priceLabel

    const price = formatCurrency(offering.price, offering.currency, locale)
    if (offering.priceType === 'fixed') return price
    if (offering.priceType === 'quote_required') return labels.quoteRequired
    if (offering.priceType === 'range' && offering.priceTo !== null && offering.priceTo !== undefined) {
        return `${price}–${formatCurrency(offering.priceTo, offering.currency, locale)}`
    }

    return labels.from(price)
}

export function formatProviderOfferingDuration(offering: ProviderOffering, locale: string): string {
    return offering.durationMinutes === undefined ? offering.duration : formatDurationMinutes(offering.durationMinutes, locale, offering.durationMinutesTo)
}
