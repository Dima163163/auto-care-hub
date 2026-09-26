import type { ProviderPreview } from '@/entities/automotive-service'
import { useTranslation } from '@/shared/lib/useTranslation'

import { ProviderResultCard } from './ProviderResultCard'

type ProviderListProps = {
    providers: readonly ProviderPreview[]
    selectedIds: readonly string[]
    onToggle: (id: string) => void
    onFocus: (id: string) => void
}

export function ProviderResultsList({ providers, selectedIds, onToggle, onFocus }: ProviderListProps) {
    const { t } = useTranslation()
    const ratedProviders = providers.filter((provider) => provider.reviewCount > 0)
    const highestRating = ratedProviders.reduce<number | null>((highest, provider) => highest === null || provider.rating > highest ? provider.rating : highest, null)
    const highestRatedProviders = highestRating === null ? [] : ratedProviders.filter((provider) => provider.rating === highestRating)
    const highestRatingProviderId = highestRatedProviders.length === 1 ? highestRatedProviders[0]?.id : undefined

    return (
        <div className="grid gap-4" aria-label={t('autocare.providersTitle')}>
            {providers.map((provider) => (
                <ProviderResultCard
                    key={provider.id}
                    provider={provider}
                    selected={selectedIds.includes(provider.id)}
                    highlight={provider.id === highestRatingProviderId ? 'highest-rating' : null}
                    onToggle={() => onToggle(provider.id)}
                    onFocus={() => onFocus(provider.id)}
                />
            ))}
        </div>
    )
}
