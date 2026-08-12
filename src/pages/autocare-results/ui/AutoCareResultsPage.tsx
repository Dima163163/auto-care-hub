import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'

import { mapAutoCareDiscoveryItem, useGetAutoCareDiscoveryQuery } from '@/entities/automotive-service'
import { useTranslation } from '@/shared/lib/useTranslation'

import { ComparisonTray } from './ComparisonTray'
import { AutoCareMapPreview } from './AutoCareMapPreview'
import { ProviderResultCard } from './ProviderResultCard'
import { ResultsToolbar } from './ResultsToolbar'
import { AutoCareResultsFilters } from './AutoCareResultsFilters'
import { getAutoCareResultFilters, writeAutoCareResultFilters, type AutoCareResultFilters } from '../lib/autocareResultFilters'

export function AutoCareResultsPage() {
    const { t } = useTranslation()
    const [searchParams, setSearchParams] = useSearchParams()
    const filters = useMemo(() => getAutoCareResultFilters(searchParams), [searchParams])
    const { data, isLoading, isError } = useGetAutoCareDiscoveryQuery({ serviceId: filters.serviceId || undefined, marketId: filters.marketId, radiusKm: filters.radiusKm, sort: filters.sort, minRating: filters.minRating ? Number(filters.minRating) : undefined, minPrice: filters.minPrice ? Number(filters.minPrice) : undefined, maxPrice: filters.maxPrice ? Number(filters.maxPrice) : undefined, availableToday: filters.availableToday, priceType: filters.priceType || undefined, verifiedOnly: filters.verifiedOnly, warrantyOnly: filters.warrantyOnly, hasBonus: filters.hasBonus, inclusion: filters.inclusion || undefined })
    const providers = useMemo(() => data?.items.map(mapAutoCareDiscoveryItem) ?? [], [data])
    const [selectedIds, setSelectedIds] = useState<readonly string[]>([])
    const [focusedProviderId, setFocusedProviderId] = useState<string | null>(null)
    const selectedProviders = useMemo(() => providers.filter((provider) => selectedIds.includes(provider.id)), [providers, selectedIds])
    const toggleProvider = (id: string) => setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length < 4 ? [...current, id] : current)
    const activeFocusedProviderId = providers.some((provider) => provider.id === focusedProviderId) ? focusedProviderId : null
    const compareSelected = () => {
        document.getElementById('comparison-map')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }

    const updateFilters = (patch: Partial<AutoCareResultFilters>) => setSearchParams((current) => writeAutoCareResultFilters(current, patch), { replace: true })
    const resetFilters = () => setSearchParams((current) => writeAutoCareResultFilters(current, { radiusKm: 25, sort: 'recommended', minPrice: '', maxPrice: '', minRating: '', priceType: '', availableToday: false, verifiedOnly: false, warrantyOnly: false, hasBonus: false, inclusion: '' }), { replace: true })

    return <main className="min-h-full bg-background"><div className="mx-auto max-w-[var(--layout-operational-max)] px-[var(--layout-gutter)] py-6 sm:py-10"><ResultsToolbar selectedCount={selectedIds.length} onClear={() => setSelectedIds([])} sort={filters.sort} onSortChange={(sort) => updateFilters({ sort })} onResetFilters={resetFilters} /><div className="mt-4"><AutoCareResultsFilters filters={filters} onChange={updateFilters} onReset={resetFilters} /></div><div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.04fr)_minmax(360px,0.76fr)]"><section className="grid content-start gap-4"><div className="flex items-center justify-between gap-3"><p className="text-sm font-bold text-foreground">{t('autocare.resultCount', { count: providers.length })}</p><span className="text-xs font-semibold text-muted-foreground">{t('autocare.compareDescription')}</span></div>{isLoading && <p className="rounded-[var(--radius-card)] border border-border bg-card p-6 text-sm font-semibold text-muted-foreground">Loading available providers…</p>}{isError && <p className="rounded-[var(--radius-card)] border border-status-danger-border bg-status-danger-surface p-6 text-sm font-semibold text-status-danger-foreground">Provider search is temporarily unavailable.</p>}{!isLoading && !isError && providers.length === 0 && <p className="rounded-[var(--radius-card)] border border-border bg-card p-6 text-sm font-semibold text-muted-foreground">No providers match this search yet.</p>}{providers.map((provider) => <ProviderResultCard key={provider.id} provider={provider} selected={selectedIds.includes(provider.id)} onToggle={() => toggleProvider(provider.id)} onFocus={() => setFocusedProviderId(provider.id)} />)}<ComparisonTray providers={selectedProviders} onRemove={toggleProvider} onCompare={compareSelected} /></section><div id="comparison-map"><AutoCareMapPreview providers={providers} selectedProviders={selectedProviders} focusedProviderId={activeFocusedProviderId} onFocusProvider={setFocusedProviderId} onRemove={toggleProvider} /></div></div></div></main>
}
