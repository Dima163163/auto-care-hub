import type { ProviderPreview } from '../model/autocareMockData'
import { formatAutoCareSlot, formatCurrency } from '@/shared/lib/locale-format'

export function formatProviderPreviewPrice(
    provider: Pick<ProviderPreview, 'price' | 'priceTo' | 'priceType' | 'currency'>,
    locale: string,
    labels: { from: (price: string) => string; quoteRequired: string },
) {
    if (provider.priceType === 'quote_required') return labels.quoteRequired
    const price = formatCurrency(provider.price, provider.currency, locale)
    if (provider.priceType === 'fixed') return price
    if (provider.priceType === 'range' && provider.priceTo != null) {
        return `${price}–${formatCurrency(provider.priceTo, provider.currency, locale)}`
    }
    return labels.from(price)
}

export function formatProviderPreviewAvailability(
    provider: Pick<ProviderPreview, 'bookingMode' | 'nextSlot' | 'priceType'>,
    locale: string,
    onRequestLabel: string,
): string {
    if (provider.bookingMode === 'request' || provider.priceType === 'quote_required' || !provider.nextSlot) return onRequestLabel
    return formatAutoCareSlot(provider.nextSlot, locale)
}

export function formatProviderPreviewWarranty(
    provider: Pick<ProviderPreview, 'warrantyMonths' | 'warrantyText'>,
    monthsLabel: (count: number) => string,
): string | null {
    const warrantyText = provider.warrantyText?.trim()
    if (warrantyText) return warrantyText
    return provider.warrantyMonths ? monthsLabel(provider.warrantyMonths) : null
}
