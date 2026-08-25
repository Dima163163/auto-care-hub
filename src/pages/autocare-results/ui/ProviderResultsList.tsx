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
    const bestValueProviderId = providers.find((provider) => provider.id === 'proservice-moscow' || provider.id === 'api-proservice-moscow')?.id
    const highestRatingProviderId = providers
        .filter((provider) => provider.id !== bestValueProviderId)
        .reduce<ProviderPreview | null>((highest, provider) => !highest || provider.rating > highest.rating ? provider : highest, null)
        ?.id

    return (
        <div className="grid gap-4" aria-label={t('autocare.providersTitle')}>
            {providers.map((provider) => (
                <ProviderResultCard
                    key={provider.id}
                    provider={provider}
                    selected={selectedIds.includes(provider.id)}
                    highlight={provider.id === bestValueProviderId ? 'best-value' : provider.id === highestRatingProviderId ? 'highest-rating' : null}
                    onToggle={() => onToggle(provider.id)}
                    onFocus={() => onFocus(provider.id)}
                />
            ))}
        </div>
    )
}
