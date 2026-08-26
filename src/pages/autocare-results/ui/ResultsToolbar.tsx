import type { ReactNode } from 'react'

import { Check, ChevronDown, Search, ShieldCheck, X } from 'lucide-react'
import { useState } from 'react'

import { automotiveServices, automotiveVehicleBrands, getServiceLabel, getVehicleBrandLabel, getVehicleModels, useGetVehicleCatalogQuery } from '@/entities/automotive-service'
import { useTranslation } from '@/shared/lib/useTranslation'
import { FloatingSelect } from '@/shared/ui/floating-field'

import { ResultsQuickFilters } from './ResultsQuickFilters'

type ResultsToolbarProps = {
    selectedCount: number
    providerCount: number
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

export type ActiveFilter = { key: 'serviceId' | 'providerName' | 'brandId' | 'radiusKm' | 'minRating' | 'minPrice' | 'maxPrice' | 'priceType' | 'availableToday' | 'verifiedOnly' | 'warrantyOnly' | 'hasBonus' | 'inclusion'; label: string }

export function ResultsToolbar({ selectedCount, providerCount, serviceId, serviceLabel, providerName, brandId, vehicleModel, vehicleYear, radiusKm, filterPanel, onClear, onStartSearch, onRadiusChange, onServiceChange, onVehicleChange, sort, onSortChange, onResetFilters, activeFilters, onRemoveFilter, quickFilters }: ResultsToolbarProps) {
    const { t } = useTranslation()
    const [isFiltersOpen, setIsFiltersOpen] = useState(false)

    return <div className="-mx-[var(--layout-gutter)] -mt-6 sm:-mt-10">
        <section className="relative left-1/2 w-screen -translate-x-1/2 bg-hero-overlay text-primary-foreground">
            <div className="mx-auto max-w-[var(--layout-operational-max)] px-[var(--layout-gutter)] py-5 sm:py-6">
                <div className="rounded-[var(--radius-panel)] border border-primary-foreground/15 bg-primary-foreground/[0.07] p-3 shadow-lg shadow-black/10 sm:p-4">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-12">
                        <ServiceSelect serviceId={serviceId} onChange={onServiceChange} />
                        <VehicleSelects brandId={brandId} vehicleModel={vehicleModel} vehicleYear={vehicleYear} onChange={onVehicleChange} />
                        <RadiusSelect radiusKm={radiusKm} onChange={onRadiusChange} />
                    </div>
                    <p className="mt-3 flex items-center justify-center gap-2 text-xs font-semibold text-primary-foreground/55"><ShieldCheck className="size-4 text-primary" />{t('autocare.searchPrivacy')}</p>
                    <div className="mt-4 border-t border-primary-foreground/15 pt-4">
                        <ResultsQuickFilters dark activeCount={Math.max(0, activeFilters.length - 1)} {...quickFilters} onToggleFilters={() => setIsFiltersOpen((value) => !value)} />
                    </div>
                    {isFiltersOpen && <div className="mt-4 border-t border-primary-foreground/15 pt-4">{filterPanel}</div>}
                    <AppliedFilters filters={activeFilters} onClear={onResetFilters} onRemove={onRemoveFilter} />
                    <div className="mt-4 flex justify-end border-t border-primary-foreground/15 pt-4">
                        <button type="button" onClick={onStartSearch} className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-[var(--radius-control)] bg-primary px-4 text-xs font-black text-primary-foreground transition hover:bg-primary/90 sm:w-auto"><Search className="size-3.5" />{t('autocare.startSearch')}</button>
                    </div>
                </div>
            </div>
        </section>

        <div className="mx-auto max-w-[var(--layout-operational-max)] px-[var(--layout-gutter)] pt-7 sm:pt-9">
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

function VehicleSelects({ brandId, vehicleModel, vehicleYear, onChange }: { brandId: string; vehicleModel: string; vehicleYear: string; onChange: (vehicle: { brandId: string; vehicleModel: string; vehicleYear: string }) => void }) {
    const { t, locale } = useTranslation()
    const { data: remoteCatalog } = useGetVehicleCatalogQuery()
    const brands = remoteCatalog ?? automotiveVehicleBrands
    const models = remoteCatalog?.find((brand) => brand.id === brandId)?.models.map((model) => model.label) ?? getVehicleModels(brandId)
    const years = Array.from({ length: 22 }, (_, index) => String(new Date().getFullYear() - index))
    return <>
        <FloatingSelect floatLabelWhenEmpty label={t('autocare.vehicleMakeLabel')} tone="dark" value={brandId} onChange={(event) => onChange({ brandId: event.target.value, vehicleModel: '', vehicleYear: '' })} wrapperClassName="lg:col-span-4"><option value="">{t('autocare.anyBrand')}</option>{brands.map((brand) => <option key={brand.id} value={brand.id}>{getVehicleBrandLabel(brand, locale)}</option>)}</FloatingSelect>
        <FloatingSelect floatLabelWhenEmpty label={t('autocare.vehicleModelLabel')} tone="dark" value={vehicleModel} disabled={!brandId} onChange={(event) => onChange({ brandId, vehicleModel: event.target.value, vehicleYear })} wrapperClassName="lg:col-span-4"><option value="">{t('autocare.anyModel')}</option>{models.map((model) => <option key={model} value={model}>{model}</option>)}</FloatingSelect>
        <FloatingSelect floatLabelWhenEmpty label={t('autocare.vehicleYearLabel')} tone="dark" value={vehicleYear} disabled={!brandId} onChange={(event) => onChange({ brandId, vehicleModel, vehicleYear: event.target.value })} wrapperClassName="lg:col-span-2"><option value="">{t('autocare.anyYear')}</option>{years.map((year) => <option key={year} value={year}>{year}</option>)}</FloatingSelect>
    </>
}

function ServiceSelect({ serviceId, onChange }: { serviceId: string; onChange: (serviceId: string) => void }) {
    const { t, locale } = useTranslation()

    return <FloatingSelect floatLabelWhenEmpty label={t('autocare.serviceLabel')} tone="dark" value={serviceId} onChange={(event) => onChange(event.target.value)} wrapperClassName="sm:col-span-2 lg:col-span-12"><option value="">{t('autocare.servicePlaceholder')}</option>{automotiveServices.map((service) => <option key={service.id} value={service.id}>{getServiceLabel(service, locale)}</option>)}</FloatingSelect>
}

function RadiusSelect({ radiusKm, onChange }: { radiusKm: number; onChange: (radiusKm: number) => void }) {
    const { t } = useTranslation()

    return <FloatingSelect floatLabelWhenEmpty label={t('autocare.radiusLabel')} tone="dark" value={radiusKm} onChange={(event) => onChange(Number(event.target.value))} wrapperClassName="lg:col-span-2"><option value="5">5 км</option><option value="10">10 км</option><option value="25">25 км</option><option value="50">50 км</option><option value="100">100 км</option></FloatingSelect>
}

function AppliedFilters({ filters, onClear, onRemove }: { filters: readonly ActiveFilter[]; onClear: () => void; onRemove: (key: ActiveFilter['key']) => void }) {
    const { t } = useTranslation()
    return <div className="mt-4 border-t border-primary-foreground/15 pt-3"><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs font-black text-primary-foreground">{t('autocare.appliedFilters')}</p>{filters.length > 0 && <button type="button" onClick={onClear} className="text-xs font-bold text-primary-foreground hover:underline">{t('autocare.clearAllFilters')}</button>}</div><div className="mt-2 flex flex-wrap gap-2">{filters.length === 0 ? <span className="text-xs font-medium text-primary-foreground/55">{t('autocare.noActiveFilters')}</span> : filters.map((filter) => <button type="button" key={filter.key} onClick={() => onRemove(filter.key)} className="inline-flex items-center gap-1.5 rounded-full border border-primary-foreground/15 bg-primary-foreground/[0.08] px-3 py-1.5 text-xs font-bold text-primary-foreground hover:border-primary">{filter.label}<X className="size-3.5" /></button>)}</div></div>
}
