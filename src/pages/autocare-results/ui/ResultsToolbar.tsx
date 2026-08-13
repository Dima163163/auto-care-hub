import type { ReactNode } from 'react'
import { Check, ChevronDown, LocateFixed, Search, ShieldCheck, X } from 'lucide-react'
import { useState } from 'react'

import { automotiveVehicleBrands, getVehicleBrandLabel, getVehicleModels } from '@/entities/automotive-service'
import { useTranslation } from '@/shared/lib/useTranslation'

import { ResultsQuickFilters } from './ResultsQuickFilters'

type ResultsToolbarProps = {
    selectedCount: number
    providerCount: number
    serviceLabel: string
    brandId: string
    vehicleModel: string
    vehicleYear: string
    radiusKm: number
    filterPanel: ReactNode
    onClear: () => void
    onStartSearch: () => void
    onRadiusChange: (radiusKm: number) => void
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

export type ActiveFilter = { key: 'serviceId' | 'brandId' | 'radiusKm' | 'minRating' | 'minPrice' | 'maxPrice' | 'priceType' | 'availableToday' | 'verifiedOnly' | 'warrantyOnly' | 'hasBonus' | 'inclusion'; label: string }

export function ResultsToolbar({ selectedCount, providerCount, serviceLabel, brandId, vehicleModel, vehicleYear, radiusKm, filterPanel, onClear, onStartSearch, onRadiusChange, onVehicleChange, sort, onSortChange, onResetFilters, activeFilters, onRemoveFilter, quickFilters }: ResultsToolbarProps) {
    const { t } = useTranslation()
    const [isFiltersOpen, setIsFiltersOpen] = useState(false)

    return <div className="-mx-[var(--layout-gutter)] -mt-6 sm:-mt-10">
        <section className="bg-hero-overlay text-primary-foreground">
            <div className="mx-auto max-w-[var(--layout-operational-max)] px-[var(--layout-gutter)] py-5 sm:py-6">
                <div className="grid gap-3 rounded-[var(--radius-panel)] border border-primary-foreground/15 bg-primary-foreground/[0.07] p-3 shadow-lg shadow-black/10 sm:grid-cols-2 lg:grid-cols-12 lg:p-4">
                    <SearchSummary className="lg:col-span-6" icon={<Search className="size-4" />} label={t('autocare.serviceLabel')} value={serviceLabel} />
                    <SearchSummary className="lg:col-span-6" icon={<LocateFixed className="size-4" />} label={t('autocare.searchPointLabel')} value={t('autocare.currentLocation')} />
                    <VehicleSelects brandId={brandId} vehicleModel={vehicleModel} vehicleYear={vehicleYear} onChange={onVehicleChange} />
                    <RadiusSelect radiusKm={radiusKm} onChange={onRadiusChange} />
                    <button type="button" onClick={onStartSearch} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-[var(--radius-control)] bg-primary px-3.5 text-xs font-black text-primary-foreground transition hover:bg-primary/90 lg:col-span-2"><Search className="size-3.5" />{t('autocare.startSearch')}</button>
                </div>
                <p className="mt-3 flex items-center justify-center gap-2 text-xs font-semibold text-primary-foreground/55"><ShieldCheck className="size-4 text-primary" />{t('autocare.searchPrivacy')}</p>
                <div className="mt-4 border-t border-primary-foreground/15 pt-4">
                    <ResultsQuickFilters dark activeCount={Math.max(0, activeFilters.length - 1)} {...quickFilters} onToggleFilters={() => setIsFiltersOpen((value) => !value)} />
                </div>
                {isFiltersOpen && <div className="mt-4">{filterPanel}</div>}
                <AppliedFilters filters={activeFilters} onClear={onResetFilters} onRemove={onRemoveFilter} />
            </div>
        </section>

        <div className="mx-auto max-w-[var(--layout-operational-max)] px-[var(--layout-gutter)] pt-7 sm:pt-9">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <p className="text-sm font-semibold text-muted-foreground">{t('autocare.resultsEyebrow')}</p>
                    <h1 className="autocare-results-heading mt-1 text-2xl font-black text-foreground sm:text-3xl">{t('autocare.resultsTitle')}</h1>
                    <p className="mt-2 text-sm font-medium text-muted-foreground">{serviceLabel} <span className="px-1 text-border">·</span> {t('autocare.resultCount', { count: providerCount })} <span className="px-1 text-border">·</span> {vehicleModel || vehicleYear ? [vehicleModel, vehicleYear].filter(Boolean).join(', ') : t('autocare.anyBrand')}</p>
                </div>
                <div className="flex items-center gap-2">
                    {selectedCount > 0 && <button type="button" onClick={onClear} className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-control)] border border-primary bg-primary/10 px-3 text-xs font-black text-primary"><Check className="size-4" />{t('autocare.compareSelected', { count: selectedCount })}</button>}
                    <label><span className="sr-only">{t('autocare.sortLabel')}</span><select value={sort} onChange={(event) => onSortChange(event.target.value as ResultsToolbarProps['sort'])} className="h-10 rounded-[var(--radius-control)] border border-border bg-card py-0 pl-3 pr-9 text-xs font-bold text-foreground outline-none focus:border-primary"><option value="recommended">{t('autocare.recommendedSort')}</option><option value="price_asc">{t('autocare.priceSort')}</option><option value="rating_desc">{t('autocare.ratingSort')}</option><option value="distance_asc">{t('autocare.distanceSort')}</option></select></label>
                </div>
            </div>
        </div>
    </div>
}

function VehicleSelects({ brandId, vehicleModel, vehicleYear, onChange }: { brandId: string; vehicleModel: string; vehicleYear: string; onChange: (vehicle: { brandId: string; vehicleModel: string; vehicleYear: string }) => void }) {
    const { t, locale } = useTranslation()
    const models = getVehicleModels(brandId)
    const years = Array.from({ length: 22 }, (_, index) => String(new Date().getFullYear() - index))
    const selectClass = 'autocare-toolbar-select h-5 w-full bg-transparent pr-4 text-sm font-black text-primary-foreground outline-none disabled:cursor-not-allowed disabled:opacity-50 [&>option]:bg-hero-overlay [&>option]:text-primary-foreground'

    return <><label className="relative grid min-w-0 gap-1 rounded-[var(--radius-control)] border border-primary-foreground/10 bg-primary-foreground/[0.04] px-3 py-2.5 lg:col-span-3"><span className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary-foreground/50">{t('autocare.vehicleMakeLabel')}</span><select value={brandId} onChange={(event) => onChange({ brandId: event.target.value, vehicleModel: '', vehicleYear: '' })} className={selectClass}><option value="">{t('autocare.anyBrand')}</option>{automotiveVehicleBrands.map((brand) => <option key={brand.id} value={brand.id}>{getVehicleBrandLabel(brand, locale)}</option>)}</select><ChevronDown className="pointer-events-none absolute bottom-3 right-3 size-3.5 text-primary-foreground/70" /></label><label className="relative grid min-w-0 gap-1 rounded-[var(--radius-control)] border border-primary-foreground/10 bg-primary-foreground/[0.04] px-3 py-2.5 lg:col-span-3"><span className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary-foreground/50">{t('autocare.vehicleModelLabel')}</span><select value={vehicleModel} disabled={!brandId} onChange={(event) => onChange({ brandId, vehicleModel: event.target.value, vehicleYear })} className={selectClass}><option value="">{t('autocare.anyModel')}</option>{models.map((model) => <option key={model} value={model}>{model}</option>)}</select><ChevronDown className="pointer-events-none absolute bottom-3 right-3 size-3.5 text-primary-foreground/70" /></label><label className="relative grid min-w-0 gap-1 rounded-[var(--radius-control)] border border-primary-foreground/10 bg-primary-foreground/[0.04] px-3 py-2.5 lg:col-span-2"><span className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary-foreground/50">{t('autocare.vehicleYearLabel')}</span><select value={vehicleYear} disabled={!brandId} onChange={(event) => onChange({ brandId, vehicleModel, vehicleYear: event.target.value })} className={selectClass}><option value="">{t('autocare.anyYear')}</option>{years.map((year) => <option key={year} value={year}>{year}</option>)}</select><ChevronDown className="pointer-events-none absolute bottom-3 right-3 size-3.5 text-primary-foreground/70" /></label></>
}

function RadiusSelect({ radiusKm, onChange }: { radiusKm: number; onChange: (radiusKm: number) => void }) {
    const { t } = useTranslation()

    return <label className="relative grid min-w-0 gap-1 rounded-[var(--radius-control)] border border-primary-foreground/10 bg-primary-foreground/[0.04] px-3 py-2.5 lg:col-span-2"><span className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary-foreground/50">{t('autocare.radiusLabel')}</span><select value={radiusKm} onChange={(event) => onChange(Number(event.target.value))} className="autocare-toolbar-select h-5 w-full bg-transparent pr-4 text-sm font-black text-primary-foreground outline-none [&>option]:bg-hero-overlay [&>option]:text-primary-foreground"><option value="5">5 км</option><option value="10">10 км</option><option value="25">25 км</option><option value="50">50 км</option><option value="100">100 км</option></select><ChevronDown className="pointer-events-none absolute bottom-3 right-3 size-3.5 text-primary-foreground/70" /></label>
}

function AppliedFilters({ filters, onClear, onRemove }: { filters: readonly ActiveFilter[]; onClear: () => void; onRemove: (key: ActiveFilter['key']) => void }) {
    const { t } = useTranslation()
    return <div className="mt-4 border-t border-primary-foreground/15 pt-3"><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs font-black text-primary-foreground">{t('autocare.appliedFilters')}</p>{filters.length > 0 && <button type="button" onClick={onClear} className="text-xs font-bold text-primary hover:underline">{t('autocare.clearAllFilters')}</button>}</div><div className="mt-2 flex flex-wrap gap-2">{filters.length === 0 ? <span className="text-xs font-medium text-primary-foreground/55">{t('autocare.noActiveFilters')}</span> : filters.map((filter) => <button type="button" key={filter.key} onClick={() => onRemove(filter.key)} className="inline-flex items-center gap-1.5 rounded-full border border-primary-foreground/15 bg-primary-foreground/[0.08] px-3 py-1.5 text-xs font-bold text-primary-foreground hover:border-primary">{filter.label}<X className="size-3.5" /></button>)}</div></div>
}

function SearchSummary({ className = '', icon, label, value }: { className?: string; icon: ReactNode; label: string; value: string }) {
    return <div className={`min-w-0 rounded-[var(--radius-control)] border border-primary-foreground/10 bg-primary-foreground/[0.04] px-3 py-2.5 ${className}`}><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary-foreground/50">{label}</p><div className="mt-1 flex items-center gap-2 truncate text-sm font-black">{icon}<span className="truncate">{value}</span></div></div>
}
