import type { ReactNode } from 'react'

import { Check, ChevronDown } from 'lucide-react'

import { AutoCareDiscoveryControls } from '@/features/autocare-search/ui/AutoCareDiscoveryControls'
import type { ActiveDiscoveryFilter } from '@/features/autocare-search/ui/AutoCareDiscoveryControls'
import { useTranslation } from '@/shared/lib/useTranslation'

type ResultsToolbarProps = {
    selectedCount: number
    providerCount: number
    isLoading?: boolean
    serviceId: string
    serviceLabel: string
    providerName: string
    brandId: string
    vehicleModel: string
    vehicleYear: string
    radiusKm: number
    filterPanel: ReactNode
    onClear: () => void
    onStartSearch: () => void
    onRadiusChange: (radiusKm: number) => void
    onServiceChange: (serviceId: string) => void
    onVehicleChange: (vehicle: { brandId: string; vehicleModel: string; vehicleYear: string }) => void
    sort: 'recommended' | 'price_asc' | 'rating_desc' | 'distance_asc'
    onSortChange: (sort: ResultsToolbarProps['sort']) => void
    onResetFilters: () => void
    activeFilters: readonly ActiveFilter[]
    onRemoveFilter: (key: ActiveFilter['key']) => void
    quickFilters: {
        isAvailableToday: boolean
        isNearbyActive: boolean
        isPriceActive: boolean
        isRatingActive: boolean
        onToggleAvailableToday: () => void
        onToggleNearby: () => void
        onTogglePrice: () => void
        onToggleRating: () => void
    }
}

export type ActiveFilter = ActiveDiscoveryFilter

export function ResultsToolbar({ selectedCount, providerCount, isLoading = false, serviceId, serviceLabel, providerName, brandId, vehicleModel, vehicleYear, radiusKm, filterPanel, onClear, onStartSearch, onRadiusChange, onServiceChange, onVehicleChange, sort, onSortChange, onResetFilters, activeFilters, onRemoveFilter, quickFilters }: ResultsToolbarProps) {
    const { t } = useTranslation()

    return <div className="-mx-[var(--layout-public-gutter)] -mt-6 sm:-mt-10">
        <section className="relative left-1/2 w-screen -translate-x-1/2 bg-hero-overlay text-primary-foreground">
            <div className="mx-auto max-w-[var(--layout-public-wide-max)] px-[var(--layout-public-gutter)] py-5 sm:py-6">
                <AutoCareDiscoveryControls
                    activeFilters={activeFilters}
                    brandId={brandId}
                    filterPanel={filterPanel}
                    isLoading={isLoading}
                    radiusKm={radiusKm}
                    serviceId={serviceId}
                    vehicleModel={vehicleModel}
                    vehicleYear={vehicleYear}
                    onRadiusChange={onRadiusChange}
                    onRemoveFilter={onRemoveFilter}
                    onResetFilters={onResetFilters}
                    onServiceChange={onServiceChange}
                    onStartSearch={onStartSearch}
                    onVehicleChange={onVehicleChange}
                    quickFilters={quickFilters}
                />
            </div>
        </section>

        <div className="mx-auto max-w-[var(--layout-public-wide-max)] px-[var(--layout-public-gutter)] pt-7 sm:pt-9">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <p className="text-sm font-semibold text-muted-foreground">{t('autocare.resultsEyebrow')}</p>
                    <h1 className="autocare-results-heading mt-1 text-2xl font-black text-foreground sm:text-3xl">{t('autocare.resultsTitle')}</h1>
                    <p className="mt-2 text-sm font-medium text-muted-foreground">{providerName ? `${t('autocare.providerLabel')}: ${providerName}` : serviceLabel} <span className="px-1 text-border">·</span> {t('autocare.resultCount', { count: providerCount })} <span className="px-1 text-border">·</span> {vehicleModel || vehicleYear ? [vehicleModel, vehicleYear].filter(Boolean).join(', ') : t('autocare.anyBrand')}</p>
                </div>
                <div className="flex items-center gap-2">
                    {selectedCount > 0 && <button type="button" onClick={onClear} className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-control)] border border-primary bg-primary/10 px-3 text-xs font-black text-primary"><Check className="size-4" />{t('autocare.compareSelected', { count: selectedCount })}</button>}
                    <label className="relative"><span className="sr-only">{t('autocare.sortLabel')}</span><select value={sort} onChange={(event) => onSortChange(event.target.value as ResultsToolbarProps['sort'])} className="select-with-icon h-10 appearance-none rounded-[var(--radius-control)] border border-border bg-card py-0 pl-3 pr-9 text-xs font-bold text-foreground outline-none focus:border-primary"><option value="recommended">{t('autocare.recommendedSort')}</option><option value="price_asc">{t('autocare.priceSort')}</option><option value="rating_desc">{t('autocare.ratingSort')}</option><option value="distance_asc">{t('autocare.distanceSort')}</option></select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /></label>
                </div>
            </div>
        </div>
    </div>
}
