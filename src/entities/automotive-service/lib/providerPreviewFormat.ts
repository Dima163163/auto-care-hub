import type { ProviderPreview } from '../model/autocareMockData'
import { formatCurrency } from '@/shared/lib/locale-format'

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
