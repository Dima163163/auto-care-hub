import type { ReactNode } from 'react'

import { CarFront, Search, ShieldCheck, SlidersHorizontal, Wrench, X } from 'lucide-react'
import { useState } from 'react'

import {
    automotiveServices,
    automotiveVehicleBrands,
    getServiceLabel,
    getVehicleBrandLabel,
    getVehicleModels,
    useGetVehicleCatalogQuery,
} from '@/entities/automotive-service'
import { useTranslation } from '@/shared/lib/useTranslation'
import { FloatingSelect } from '@/shared/ui/floating-field'

import { ResultsQuickFilters } from './ResultsQuickFilters'

export type ActiveDiscoveryFilter = {
    key: 'serviceId' | 'providerName' | 'brandId' | 'radiusKm' | 'minRating' | 'minPrice' | 'maxPrice' | 'priceType' | 'availableToday' | 'verifiedOnly' | 'warrantyOnly' | 'hasBonus' | 'inclusion'
    label: string
}

type DiscoveryQuickFilters = {
    isAvailableToday: boolean
    isNearbyActive: boolean
    isPriceActive: boolean
    isRatingActive: boolean
    onToggleAvailableToday: () => void
    onToggleNearby: () => void
    onTogglePrice: () => void
    onToggleRating: () => void
}

type AutoCareDiscoveryControlsProps = {
    activeFilters: readonly ActiveDiscoveryFilter[]
    brandId: string
    filterPanel: ReactNode
    isLoading?: boolean
    onRadiusChange: (radiusKm: number) => void
    onRemoveFilter: (key: ActiveDiscoveryFilter['key']) => void
    onResetFilters: () => void
    onServiceChange: (serviceId: string) => void
    onStartSearch: () => void
    onVehicleChange: (vehicle: { brandId: string; vehicleModel: string; vehicleYear: string }) => void
    quickFilters: DiscoveryQuickFilters
    radiusKm: number
    serviceId: string
    vehicleModel: string
    vehicleYear: string
}

/**
 * The discovery controls are shared by the loaded results route and its route
 * fallback. Keeping one structure prevents loading from becoming a second,
 * visually divergent search form.
 */
export function AutoCareDiscoveryControls({
    activeFilters,
    brandId,
    filterPanel,
    isLoading = false,
    onRadiusChange,
    onRemoveFilter,
    onResetFilters,
    onServiceChange,
    onStartSearch,
    onVehicleChange,
    quickFilters,
    radiusKm,
    serviceId,
    vehicleModel,
    vehicleYear,
}: AutoCareDiscoveryControlsProps) {
    const { t } = useTranslation()
    const [isFiltersOpen, setIsFiltersOpen] = useState(false)

    return (
        <div className="rounded-[var(--radius-panel)] border border-primary-foreground/15 bg-primary-foreground/[0.07] p-3 shadow-lg shadow-black/10 sm:p-4">
            <div className="divide-y divide-primary-foreground/15">
                <SearchFormSection icon={Wrench} title={t('autocare.serviceFilterLabel')}>
                    <div className="grid gap-3 sm:grid-cols-[minmax(0,1.45fr)_minmax(9rem,0.55fr)]">
                        <ServiceSelect disabled={isLoading} serviceId={serviceId} onChange={onServiceChange} />
                        <RadiusSelect disabled={isLoading} radiusKm={radiusKm} onChange={onRadiusChange} />
                    </div>
                </SearchFormSection>
                <SearchFormSection icon={CarFront} title={t('autocare.vehicleLabel')}>
                    <VehicleSelects brandId={brandId} disabled={isLoading} vehicleModel={vehicleModel} vehicleYear={vehicleYear} onChange={onVehicleChange} />
                </SearchFormSection>
                <SearchFormSection icon={SlidersHorizontal} title={t('autocare.filtersTitle')}>
                    <ResultsQuickFilters
                        dark
                        disabled={isLoading}
                        activeCount={Math.max(0, activeFilters.length - 1)}
                        {...quickFilters}
                        onToggleFilters={() => setIsFiltersOpen((value) => !value)}
                    />
                    {isFiltersOpen && !isLoading ? <div className="mt-3 rounded-[var(--radius-card)] border border-primary-foreground/15 bg-primary-foreground/[0.04] p-3 sm:p-4">{filterPanel}</div> : null}
                </SearchFormSection>
            </div>
            <p className="mt-3 flex items-center justify-center gap-2 text-xs font-semibold text-primary-foreground/55"><ShieldCheck className="size-4 text-primary" />{t('autocare.searchPrivacy')}</p>
            <AppliedFilters disabled={isLoading} filters={activeFilters} onClear={onResetFilters} onRemove={onRemoveFilter} />
            <div className="mt-4 flex justify-end border-t border-primary-foreground/15 pt-4">
                <button type="button" disabled={isLoading} onClick={onStartSearch} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-[var(--radius-control)] bg-primary px-5 text-sm font-black text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-52"><Search className="size-4" />{t('autocare.startSearch')}</button>
            </div>
        </div>
    )
}

function SearchFormSection({ icon: Icon, title, children }: { icon: typeof Wrench; title: string; children: ReactNode }) {
    return <section className="grid grid-cols-[2.25rem_minmax(0,1fr)] gap-3 py-3.5 first:pt-0 last:pb-0 sm:grid-cols-[3rem_minmax(0,1fr)] sm:gap-4 sm:py-4" aria-label={title}>
        <span className="flex size-9 items-center justify-center rounded-full bg-primary/15 text-primary sm:size-10"><Icon className="size-4 sm:size-5" aria-hidden="true" /></span>
        <div className="min-w-0">
            <h2 className="text-sm font-black text-primary-foreground">{title}</h2>
            <div className="mt-2.5 min-w-0">{children}</div>
        </div>
    </section>
}

function VehicleSelects({ brandId, disabled, vehicleModel, vehicleYear, onChange }: { brandId: string; disabled: boolean; vehicleModel: string; vehicleYear: string; onChange: (vehicle: { brandId: string; vehicleModel: string; vehicleYear: string }) => void }) {
    if (disabled) {
        return <DisabledVehicleSelects />
    }

    return <EnabledVehicleSelects brandId={brandId} vehicleModel={vehicleModel} vehicleYear={vehicleYear} onChange={onChange} />
}

function DisabledVehicleSelects() {
    const { t } = useTranslation()

    return <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(8rem,0.55fr)]">
        <FloatingSelect floatLabelWhenEmpty label={t('autocare.vehicleMakeLabel')} tone="dark" value="" disabled><option value="">{t('autocare.anyBrand')}</option></FloatingSelect>
        <FloatingSelect floatLabelWhenEmpty label={t('autocare.vehicleModelLabel')} tone="dark" value="" disabled><option value="">{t('autocare.anyModel')}</option></FloatingSelect>
        <FloatingSelect floatLabelWhenEmpty label={t('autocare.vehicleYearLabel')} tone="dark" value="" disabled><option value="">{t('autocare.anyYear')}</option></FloatingSelect>
    </div>
}

function EnabledVehicleSelects({ brandId, vehicleModel, vehicleYear, onChange }: { brandId: string; vehicleModel: string; vehicleYear: string; onChange: (vehicle: { brandId: string; vehicleModel: string; vehicleYear: string }) => void }) {
    const { t, locale } = useTranslation()
    const { data: remoteCatalog } = useGetVehicleCatalogQuery()
    const brands = remoteCatalog ?? automotiveVehicleBrands
    const models = remoteCatalog?.find((brand) => brand.id === brandId)?.models.map((model) => model.label) ?? getVehicleModels(brandId)
    const years = Array.from({ length: 22 }, (_, index) => String(new Date().getFullYear() - index))

    return <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(8rem,0.55fr)]">
        <FloatingSelect floatLabelWhenEmpty label={t('autocare.vehicleMakeLabel')} tone="dark" value={brandId} onChange={(event) => onChange({ brandId: event.target.value, vehicleModel: '', vehicleYear: '' })}><option value="">{t('autocare.anyBrand')}</option>{brands.map((brand) => <option key={brand.id} value={brand.id}>{getVehicleBrandLabel(brand, locale)}</option>)}</FloatingSelect>
        <FloatingSelect floatLabelWhenEmpty label={t('autocare.vehicleModelLabel')} tone="dark" value={vehicleModel} disabled={!brandId} onChange={(event) => onChange({ brandId, vehicleModel: event.target.value, vehicleYear })}><option value="">{t('autocare.anyModel')}</option>{models.map((model) => <option key={model} value={model}>{model}</option>)}</FloatingSelect>
        <FloatingSelect floatLabelWhenEmpty label={t('autocare.vehicleYearLabel')} tone="dark" value={vehicleYear} disabled={!brandId} onChange={(event) => onChange({ brandId, vehicleModel, vehicleYear: event.target.value })}><option value="">{t('autocare.anyYear')}</option>{years.map((year) => <option key={year} value={year}>{year}</option>)}</FloatingSelect>
    </div>
}

function ServiceSelect({ disabled, serviceId, onChange }: { disabled: boolean; serviceId: string; onChange: (serviceId: string) => void }) {
    const { t, locale } = useTranslation()

    return <FloatingSelect floatLabelWhenEmpty label={t('autocare.serviceLabel')} tone="dark" value={serviceId} disabled={disabled} onChange={(event) => onChange(event.target.value)}><option value="">{t('autocare.servicePlaceholder')}</option>{automotiveServices.map((service) => <option key={service.id} value={service.id}>{getServiceLabel(service, locale)}</option>)}</FloatingSelect>
}

function RadiusSelect({ disabled, radiusKm, onChange }: { disabled: boolean; radiusKm: number; onChange: (radiusKm: number) => void }) {
    const { t } = useTranslation()

    return <FloatingSelect floatLabelWhenEmpty label={t('autocare.radiusLabel')} tone="dark" value={radiusKm} disabled={disabled} onChange={(event) => onChange(Number(event.target.value))}><option value="5">5 км</option><option value="10">10 км</option><option value="25">25 км</option><option value="50">50 км</option><option value="100">100 км</option></FloatingSelect>
}

function AppliedFilters({ disabled, filters, onClear, onRemove }: { disabled: boolean; filters: readonly ActiveDiscoveryFilter[]; onClear: () => void; onRemove: (key: ActiveDiscoveryFilter['key']) => void }) {
    const { t } = useTranslation()

    return <div className="mt-4 border-t border-primary-foreground/15 pt-3"><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs font-black text-primary-foreground">{t('autocare.appliedFilters')}</p>{filters.length > 0 ? <button type="button" disabled={disabled} onClick={onClear} className="text-xs font-bold text-primary-foreground hover:underline disabled:cursor-not-allowed disabled:opacity-60">{t('autocare.clearAllFilters')}</button> : null}</div><div className="mt-2 flex flex-wrap gap-2">{filters.length === 0 ? <span className="text-xs font-medium text-primary-foreground/55">{t('autocare.noActiveFilters')}</span> : filters.map((filter) => <button type="button" disabled={disabled} key={filter.key} onClick={() => onRemove(filter.key)} className="inline-flex items-center gap-1.5 rounded-full border border-primary-foreground/15 bg-primary-foreground/[0.08] px-3 py-1.5 text-xs font-bold text-primary-foreground hover:border-primary disabled:cursor-not-allowed disabled:opacity-60">{filter.label}<X className="size-3.5" /></button>)}</div></div>
}
