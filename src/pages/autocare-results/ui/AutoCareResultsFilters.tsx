import { Filter, RotateCcw, ChevronDown } from 'lucide-react'

import type { AutomotivePriceType } from '@/entities/automotive-service'
import { useTranslation } from '@/shared/lib/useTranslation'

import type { AutoCareResultFilters } from '../lib/autocareResultFilters'

type AutoCareResultsFiltersProps = {
    filters: AutoCareResultFilters
    onChange: (patch: Partial<AutoCareResultFilters>) => void
    onReset: () => void
    variant?: 'light' | 'dark'
}

const priceTypes: readonly AutomotivePriceType[] = ['fixed', 'from', 'range', 'quote_required']
const inclusionOptions = ['parts', 'materials', 'photo', 'diagnostics', 'warranty'] as const

/** Additional filters only. Service, location and vehicle are controlled by the primary search form above. */
export function AutoCareResultsFilters({ filters, onChange, onReset, variant = 'light' }: AutoCareResultsFiltersProps) {
    const { t } = useTranslation()
    const isDark = variant === 'dark'
    const panelClass = isDark ? 'text-primary-foreground' : 'text-foreground'
    const labelClass = isDark ? 'text-primary-foreground' : 'text-foreground'
    const fieldClass = isDark
        ? 'border-primary-foreground/15 bg-primary-foreground/[0.08] text-primary-foreground [&>option]:bg-hero-overlay [&>option]:text-primary-foreground'
        : 'border-border bg-background text-foreground'
    const inputClass = isDark
        ? 'border-primary-foreground/15 bg-primary-foreground/[0.08] text-primary-foreground placeholder:text-primary-foreground/45'
        : 'border-border bg-background text-foreground'
    const mutedClass = isDark ? 'text-primary-foreground/60' : 'text-muted-foreground'
    const activeCount = [
        filters.minPrice,
        filters.maxPrice,
        filters.minRating,
        filters.priceType,
        filters.availableToday,
        filters.verifiedOnly,
        filters.warrantyOnly,
        filters.hasBonus,
        filters.inclusion,
    ].filter(Boolean).length
    const update = <K extends keyof AutoCareResultFilters>(key: K, value: AutoCareResultFilters[K]) => onChange({ [key]: value })

    return (
        <section className={panelClass} aria-label={t('autocare.filtersTitle')}>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <Filter className="size-4 text-primary" />
                    <div>
                        <h2 className={`text-sm font-black ${labelClass}`}>{t('autocare.filtersTitle')}</h2>
                        <p className={`mt-0.5 text-xs font-medium ${mutedClass}`}>{t('autocare.filtersDescription')}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold ${mutedClass}`}>{t('autocare.activeFilters', { count: activeCount })}</span>
                    <button type="button" onClick={onReset} className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline">
                        <RotateCcw className="size-3.5" />
                        {t('autocare.resetFilters')}
                    </button>
                </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <FilterSelect
                    label={t('autocare.minRatingLabel')}
                    value={filters.minRating}
                    onChange={(value) => update('minRating', value)}
                    className={fieldClass}
                    options={[
                        ['', t('autocare.anyRating')],
                        ['4', '4.0+'],
                        ['4.5', '4.5+'],
                        ['4.7', '4.7+'],
                        ['4.9', '4.9+'],
                    ]}
                />
                <FilterSelect
                    label={t('autocare.priceTypeLabel')}
                    value={filters.priceType}
                    onChange={(value) => update('priceType', value as AutoCareResultFilters['priceType'])}
                    className={fieldClass}
                    options={[
                        ['', t('autocare.anyPriceType')],
                        ...priceTypes.map((type) => [type, t(`autocare.priceType.${type}`)] as [string, string]),
                    ]}
                />
                <FilterInput label={t('autocare.minPriceLabel')} value={filters.minPrice} onChange={(value) => update('minPrice', value)} placeholder="0" className={inputClass} />
                <FilterInput label={t('autocare.maxPriceLabel')} value={filters.maxPrice} onChange={(value) => update('maxPrice', value)} placeholder={t('autocare.noPriceLimit')} className={inputClass} />
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <FilterSelect
                    label={t('autocare.inclusionLabel')}
                    value={filters.inclusion}
                    onChange={(value) => update('inclusion', value)}
                    className={fieldClass}
                    options={[
                        ['', t('autocare.anyInclusion')],
                        ...inclusionOptions.map((option) => [option, t(`autocare.inclusion.${option}`)] as [string, string]),
                    ]}
                />
                <div className="flex items-end">
                    <button
                        type="button"
                        onClick={() => update('hasBonus', !filters.hasBonus)}
                        aria-pressed={filters.hasBonus}
                        className={`inline-flex h-10 w-full items-center justify-center rounded-[var(--radius-control)] border px-3 text-xs font-bold ${filters.hasBonus ? 'border-primary bg-primary text-primary-foreground' : isDark ? 'border-primary-foreground/15 bg-primary-foreground/[0.08] text-primary-foreground hover:border-primary' : 'border-border bg-background text-foreground hover:border-primary'}`}
                    >
                        {t('autocare.bonusFilter')}
                    </button>
                </div>
                <ToggleFilter active={filters.availableToday} onClick={() => update('availableToday', !filters.availableToday)} label={t('autocare.availableTodayLabel')} variant={variant} />
                <ToggleFilter active={filters.verifiedOnly} onClick={() => update('verifiedOnly', !filters.verifiedOnly)} label={t('autocare.verifiedFilter')} variant={variant} />
            </div>

            <div className={`mt-3 flex flex-wrap gap-2 border-t pt-3 ${isDark ? 'border-primary-foreground/15' : 'border-border'}`}>
                <ToggleFilter active={filters.warrantyOnly} onClick={() => update('warrantyOnly', !filters.warrantyOnly)} label={t('autocare.warrantyFilter')} variant={variant} />
            </div>
        </section>
    )
}

function FilterSelect({ label, value, onChange, options, className }: { label: string; value: string; onChange: (value: string) => void; options: readonly [string, string][]; className: string }) {
    return (
        <label className="relative grid gap-1.5 text-xs font-bold">
            <span>{label}</span>
            <select value={value} onChange={(event) => onChange(event.target.value)} className={`select-with-icon h-10 appearance-none rounded-[var(--radius-control)] border px-3 pr-9 text-sm font-medium outline-none focus:border-primary ${className}`}>
                {options.map(([option, optionLabel]) => <option key={option} value={option}>{optionLabel}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute bottom-3 right-3 size-3.5 text-current opacity-70" />
        </label>
    )
}

function FilterInput({ label, value, onChange, placeholder, className }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; className: string }) {
    return (
        <label className="grid gap-1.5 text-xs font-bold">
            <span>{label}</span>
            <input type="number" min="0" step="100" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={`h-10 rounded-[var(--radius-control)] border px-3 text-sm font-medium outline-none focus:border-primary ${className}`} />
        </label>
    )
}

function ToggleFilter({ active, onClick, label, variant }: { active: boolean; onClick: () => void; label: string; variant: 'light' | 'dark' }) {
    const inactiveClass = variant === 'dark' ? 'border-primary-foreground/15 bg-primary-foreground/[0.08] text-primary-foreground/75 hover:border-primary' : 'border-border bg-background text-muted-foreground hover:border-primary hover:text-primary'
    return <button type="button" onClick={onClick} aria-pressed={active} className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${active ? 'border-primary bg-primary text-primary-foreground' : inactiveClass}`}>{label}</button>
}
