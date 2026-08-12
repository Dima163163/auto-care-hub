import type { ReactNode } from 'react'
import { CarFront, Check, ChevronDown, MapPin, Search, ShieldCheck, X } from 'lucide-react'

import { useTranslation } from '@/shared/lib/useTranslation'

type ResultsToolbarProps = {
    selectedCount: number
    providerCount: number
    serviceLabel: string
    brandLabel: string
    filterPanel: ReactNode
    onClear: () => void
    onStartSearch: () => void
    sort: 'recommended' | 'price_asc' | 'rating_desc' | 'distance_asc'
    onSortChange: (sort: ResultsToolbarProps['sort']) => void
    onResetFilters: () => void
    activeFilters: readonly ActiveFilter[]
    onRemoveFilter: (key: ActiveFilter['key']) => void
}

export type ActiveFilter = { key: 'serviceId' | 'brandId' | 'radiusKm' | 'minRating' | 'minPrice' | 'maxPrice' | 'priceType' | 'availableToday' | 'verifiedOnly' | 'warrantyOnly' | 'hasBonus' | 'inclusion'; label: string }

export function ResultsToolbar({ selectedCount, providerCount, serviceLabel, brandLabel, filterPanel, onClear, onStartSearch, sort, onSortChange, onResetFilters, activeFilters, onRemoveFilter }: ResultsToolbarProps) {
    const { t } = useTranslation()

    return <div className="-mx-[var(--layout-gutter)] -mt-6 sm:-mt-10">
        <section className="bg-hero-overlay text-primary-foreground">
            <div className="mx-auto max-w-[var(--layout-operational-max)] px-[var(--layout-gutter)] py-5 sm:py-6">
                <div className="grid gap-2 rounded-[var(--radius-panel)] border border-primary-foreground/15 bg-primary-foreground/[0.07] p-3 shadow-lg shadow-black/10 md:grid-cols-[1.05fr_1.2fr_0.8fr_auto] md:items-end md:p-4">
                    <SearchSummary icon={<Search className="size-4" />} label={t('autocare.serviceLabel')} value={serviceLabel} />
                    <SearchSummary icon={<MapPin className="size-4" />} label={t('autocare.locationLabel')} value="Москва, ул. Льва Толстого, 16 · 10 км" />
                    <SearchSummary icon={<CarFront className="size-4" />} label={t('autocare.vehicleLabel')} value={brandLabel === t('autocare.anyBrand') ? 'BMW X5, 2021' : brandLabel} />
                    <button type="button" onClick={onStartSearch} className="inline-flex h-11 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-primary px-4 text-sm font-black text-primary-foreground transition hover:bg-primary/90"><Search className="size-4" />{t('autocare.startSearch')}</button>
                </div>
                <p className="mt-3 flex items-center justify-center gap-2 text-xs font-semibold text-primary-foreground/55"><ShieldCheck className="size-4 text-primary" />{t('autocare.searchPrivacy')}</p>
                <div className="mt-4">{filterPanel}</div>
                <AppliedFilters filters={activeFilters} onClear={onResetFilters} onRemove={onRemoveFilter} />
            </div>
        </section>

        <div className="mx-auto max-w-[var(--layout-operational-max)] px-[var(--layout-gutter)] pt-7 sm:pt-9">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <p className="text-sm font-semibold text-muted-foreground">{t('autocare.resultsEyebrow')}</p>
                    <h1 className="autocare-results-heading mt-1 text-2xl font-black text-foreground sm:text-3xl">{t('autocare.resultsTitle')}</h1>
                    <p className="mt-2 text-sm font-medium text-muted-foreground">{serviceLabel} <span className="px-1 text-border">·</span> {t('autocare.resultCount', { count: providerCount })} <span className="px-1 text-border">·</span> {brandLabel}</p>
                </div>
                <div className="flex items-center gap-2">
                    {selectedCount > 0 && <button type="button" onClick={onClear} className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-control)] border border-primary bg-primary/10 px-3 text-xs font-black text-primary"><Check className="size-4" />{t('autocare.compareSelected', { count: selectedCount })}</button>}
                    <label className="relative"><span className="sr-only">{t('autocare.sortLabel')}</span><select value={sort} onChange={(event) => onSortChange(event.target.value as ResultsToolbarProps['sort'])} className="h-10 appearance-none rounded-[var(--radius-control)] border border-border bg-card py-0 pl-3 pr-9 text-xs font-bold text-foreground outline-none focus:border-primary"><option value="recommended">{t('autocare.recommendedSort')}</option><option value="price_asc">{t('autocare.priceSort')}</option><option value="rating_desc">{t('autocare.ratingSort')}</option><option value="distance_asc">{t('autocare.distanceSort')}</option></select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /></label>
                </div>
            </div>
        </div>
    </div>
}

function AppliedFilters({ filters, onClear, onRemove }: { filters: readonly ActiveFilter[]; onClear: () => void; onRemove: (key: ActiveFilter['key']) => void }) {
    const { t } = useTranslation()
    return <div className="mt-4 border-t border-primary-foreground/15 pt-3"><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs font-black text-primary-foreground">{t('autocare.appliedFilters')}</p>{filters.length > 0 && <button type="button" onClick={onClear} className="text-xs font-bold text-primary hover:underline">{t('autocare.clearAllFilters')}</button>}</div><div className="mt-2 flex flex-wrap gap-2">{filters.length === 0 ? <span className="text-xs font-medium text-primary-foreground/55">{t('autocare.noActiveFilters')}</span> : filters.map((filter) => <button type="button" key={filter.key} onClick={() => onRemove(filter.key)} className="inline-flex items-center gap-1.5 rounded-full border border-primary-foreground/15 bg-primary-foreground/[0.08] px-3 py-1.5 text-xs font-bold text-primary-foreground hover:border-primary">{filter.label}<X className="size-3.5" /></button>)}</div></div>
}

function SearchSummary({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
    return <div className="min-w-0 rounded-[var(--radius-control)] border border-primary-foreground/10 bg-primary-foreground/[0.04] px-3 py-2.5"><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary-foreground/50">{label}</p><div className="mt-1 flex items-center gap-2 truncate text-sm font-black">{icon}<span className="truncate">{value}</span></div></div>
}
