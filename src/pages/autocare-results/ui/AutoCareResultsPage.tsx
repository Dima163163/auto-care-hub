import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'

import { automotiveServices, automotiveVehicleBrands, getServiceLabel, getVehicleBrandLabel, mapAutoCareDiscoveryItem, useGetAutoCareDiscoveryQuery } from '@/entities/automotive-service'
import { useTranslation } from '@/shared/lib/useTranslation'

import { getAutoCareResultFilters, writeAutoCareResultFilters, type AutoCareResultFilters } from '../lib/autocareResultFilters'
import { AutoCareMapPreview } from './AutoCareMapPreview'
import { AutoCareResultsFilters } from './AutoCareResultsFilters'
import { ComparisonTray } from './ComparisonTray'
import { ResultsToolbar } from './ResultsToolbar'
import type { ActiveFilter } from './ResultsToolbar'
import { ProviderResultsList } from './ProviderResultsList'
import { ResultsPagination } from './ResultsPagination'

const RESULTS_PAGE_SIZE = 8

export function AutoCareResultsPage() {
    const { t, locale } = useTranslation()
    const [searchParams, setSearchParams] = useSearchParams()
    const filters = useMemo(() => getAutoCareResultFilters(searchParams), [searchParams])
    const { data, isLoading, isError } = useGetAutoCareDiscoveryQuery({
        serviceId: filters.serviceId || undefined,
        marketId: filters.marketId,
        radiusKm: filters.radiusKm,
        sort: filters.sort,
        minRating: filters.minRating ? Number(filters.minRating) : undefined,
        minPrice: filters.minPrice ? Number(filters.minPrice) : undefined,
        maxPrice: filters.maxPrice ? Number(filters.maxPrice) : undefined,
        availableToday: filters.availableToday,
        priceType: filters.priceType || undefined,
        verifiedOnly: filters.verifiedOnly,
        warrantyOnly: filters.warrantyOnly,
        hasBonus: filters.hasBonus,
        inclusion: filters.inclusion || undefined,
        brandId: filters.brandId || undefined,
    })
    const providers = useMemo(() => data?.items.map(mapAutoCareDiscoveryItem) ?? [], [data])
    const [selectedIds, setSelectedIds] = useState<readonly string[]>([])
    const [focusedProviderId, setFocusedProviderId] = useState<string | null>(null)
    const [page, setPage] = useState(1)
    const selectedProviders = useMemo(
        () => providers.filter((provider) => selectedIds.includes(provider.id)),
        [providers, selectedIds],
    )

    const toggleProvider = (id: string) => setSelectedIds((current) => (
        current.includes(id)
            ? current.filter((item) => item !== id)
            : current.length < 4
                ? [...current, id]
                : current
    ))
    const activeFocusedProviderId = providers.some((provider) => provider.id === focusedProviderId)
        ? focusedProviderId
        : null
    const updateFilters = (patch: Partial<AutoCareResultFilters>) => {
        setPage(1)
        setSearchParams((current) => writeAutoCareResultFilters(current, patch), { replace: true })
    }
    const resetFilters = () => updateFilters({
        radiusKm: 25,
        sort: 'recommended',
        minPrice: '',
        maxPrice: '',
        minRating: '',
        priceType: '',
        availableToday: false,
        verifiedOnly: false,
        warrantyOnly: false,
        hasBonus: false,
        inclusion: '',
        brandId: '',
    })
    const removeFilter = (key: ActiveFilter['key']) => updateFilters({ [key]: key === 'radiusKm' ? 25 : key === 'availableToday' || key === 'verifiedOnly' || key === 'warrantyOnly' || key === 'hasBonus' ? false : '' } as Partial<AutoCareResultFilters>)
    const startSearch = () => document.getElementById('search-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    const compareSelected = () => document.getElementById('comparison-map')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    const totalPages = Math.max(1, Math.ceil(providers.length / RESULTS_PAGE_SIZE))
    const currentPage = Math.min(page, totalPages)
    const pagedProviders = providers.slice((currentPage - 1) * RESULTS_PAGE_SIZE, currentPage * RESULTS_PAGE_SIZE)
    const serviceLabel = getServiceLabel(automotiveServices.find((service) => service.id === filters.serviceId) ?? automotiveServices[0]!, locale)
    const brandLabel = filters.brandId ? getVehicleBrandLabel(automotiveVehicleBrands.find((brand) => brand.id === filters.brandId) ?? automotiveVehicleBrands[0]!, locale) : t('autocare.anyBrand')
    const activeFilters = useMemo<readonly ActiveFilter[]>(() => [
        { key: 'serviceId', label: serviceLabel },
        filters.brandId ? { key: 'brandId', label: brandLabel } : null,
        filters.radiusKm !== 25 ? { key: 'radiusKm', label: `${filters.radiusKm} km` } : null,
        filters.minRating ? { key: 'minRating', label: `${filters.minRating}+ ★` } : null,
        filters.minPrice ? { key: 'minPrice', label: `от ${filters.minPrice}` } : null,
        filters.maxPrice ? { key: 'maxPrice', label: `до ${filters.maxPrice}` } : null,
        filters.priceType ? { key: 'priceType', label: filters.priceType } : null,
        filters.availableToday ? { key: 'availableToday', label: t('autocare.availableTodayLabel') } : null,
        filters.verifiedOnly ? { key: 'verifiedOnly', label: t('autocare.verifiedFilter') } : null,
        filters.warrantyOnly ? { key: 'warrantyOnly', label: t('autocare.warrantyFilter') } : null,
        filters.hasBonus ? { key: 'hasBonus', label: t('autocare.bonusFilter') } : null,
        filters.inclusion ? { key: 'inclusion', label: filters.inclusion } : null,
    ].filter((filter): filter is ActiveFilter => Boolean(filter)), [brandLabel, filters, serviceLabel, t])
    const changePage = (nextPage: number) => {
        setPage(nextPage)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    return (
        <main>
            <div className="mx-auto flex max-w-[var(--layout-operational-max)] flex-col px-[var(--layout-gutter)] py-6 sm:py-10">
                <div className="shrink-0">
                    <ResultsToolbar
                        selectedCount={selectedIds.length}
                        providerCount={providers.length}
                        serviceLabel={serviceLabel}
                        brandLabel={brandLabel}
                        filterPanel={<AutoCareResultsFilters variant="dark" filters={filters} onChange={updateFilters} onReset={resetFilters} />}
                        onClear={() => setSelectedIds([])}
                        onStartSearch={startSearch}
                        activeFilters={activeFilters}
                        onRemoveFilter={removeFilter}
                        sort={filters.sort}
                        onSortChange={(sort) => updateFilters({ sort })}
                        onResetFilters={resetFilters}
                        quickFilters={{
                            isAvailableToday: filters.availableToday,
                            isNearbyActive: filters.radiusKm === 10,
                            isPriceActive: filters.sort === 'price_asc',
                            isRatingActive: filters.minRating === '4.5',
                            onToggleAvailableToday: () => updateFilters({ availableToday: !filters.availableToday }),
                            onToggleNearby: () => updateFilters({ radiusKm: filters.radiusKm === 10 ? 25 : 10 }),
                            onTogglePrice: () => updateFilters({ sort: filters.sort === 'price_asc' ? 'recommended' : 'price_asc' }),
                            onToggleRating: () => updateFilters({ minRating: filters.minRating === '4.5' ? '' : '4.5' }),
                        }}
                    />
                </div>

                <div id="search-results" className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.04fr)_minmax(360px,0.76fr)]">
                    <section className="flex flex-col gap-4">
                        <div className="flex shrink-0 items-center justify-between gap-3">
                            <p className="text-sm font-bold text-foreground">{t('autocare.resultCount', { count: providers.length })}</p>
                            <span className="text-xs font-semibold text-muted-foreground">{t('autocare.compareDescription')}</span>
                        </div>
                        {isLoading && <p className="shrink-0 rounded-[var(--radius-card)] border border-border bg-card p-6 text-sm font-semibold text-muted-foreground">Loading available providers…</p>}
                        {isError && <p className="shrink-0 rounded-[var(--radius-card)] border border-status-danger-border bg-status-danger-surface p-6 text-sm font-semibold text-status-danger-foreground">Provider search is temporarily unavailable.</p>}
                        {!isLoading && !isError && providers.length === 0 && <p className="shrink-0 rounded-[var(--radius-card)] border border-border bg-card p-6 text-sm font-semibold text-muted-foreground">No providers match this search yet.</p>}
                        {!isLoading && !isError && providers.length > 0 && (
                            <ProviderResultsList
                                key={searchParams.toString()}
                                providers={pagedProviders}
                                selectedIds={selectedIds}
                                onToggle={toggleProvider}
                                onFocus={setFocusedProviderId}
                            />
                        )}
                        <ResultsPagination page={currentPage} totalPages={totalPages} onChange={changePage} />
                        <ComparisonTray providers={selectedProviders} onRemove={toggleProvider} onCompare={compareSelected} />
                    </section>

                    <div id="comparison-map" className="min-h-0 lg:h-[min(70vh,720px)] lg:self-start">
                        <AutoCareMapPreview
                            providers={pagedProviders}
                            serviceId={filters.serviceId}
                            selectedProviders={selectedProviders}
                            focusedProviderId={pagedProviders.some((provider) => provider.id === activeFocusedProviderId) ? activeFocusedProviderId : null}
                            onFocusProvider={setFocusedProviderId}
                            onRemove={toggleProvider}
                        />
                    </div>
                </div>
                <TrustStrip />
            </div>
        </main>
    )
}

function TrustStrip() {
    const { t } = useTranslation()
    const items = [
        ['✓', t('autocare.verifiedTrust'), t('autocare.trustVerifiedText')],
        ['▱', t('autocare.trustStandardTitle'), t('autocare.trustStandardText')],
        ['☆', t('autocare.realReviewsTrust'), t('autocare.trustReviewsText')],
        ['▣', t('autocare.trustPaymentTitle'), t('autocare.trustPaymentText')],
    ]
    return <section className="mt-8 grid gap-4 rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4">{items.map(([icon, title, text]) => <div key={title} className="flex gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-black text-primary">{icon}</span><div><p className="text-xs font-black text-foreground">{title}</p><p className="mt-1 text-[11px] font-medium leading-4 text-muted-foreground">{text}</p></div></div>)}</section>
}
