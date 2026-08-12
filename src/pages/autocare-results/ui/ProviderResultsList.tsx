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

    return (
        <div className="grid gap-4" aria-label={t('autocare.providersTitle')}>
            {providers.map((provider) => (
                <ProviderResultCard
                    key={provider.id}
                    provider={provider}
                    selected={selectedIds.includes(provider.id)}
                    onToggle={() => onToggle(provider.id)}
                    onFocus={() => onFocus(provider.id)}
                />
            ))}
        </div>
    )
}
