import { Check, SlidersHorizontal } from 'lucide-react'

import { useTranslation } from '@/shared/lib/useTranslation'

type ResultsQuickFiltersProps = {
    activeCount: number
    dark?: boolean
    isPriceActive: boolean
    isRatingActive: boolean
    isNearbyActive: boolean
    isAvailableToday: boolean
    onToggleFilters: () => void
    onToggleAvailableToday: () => void
    onToggleNearby: () => void
    onTogglePrice: () => void
    onToggleRating: () => void
}

export function ResultsQuickFilters({
    activeCount,
    dark = false,
    isPriceActive,
    isRatingActive,
    isNearbyActive,
    isAvailableToday,
    onToggleFilters,
    onToggleAvailableToday,
    onToggleNearby,
    onTogglePrice,
    onToggleRating,
}: ResultsQuickFiltersProps) {
    const { t } = useTranslation()

    return (
        <div className="flex flex-wrap items-center gap-2">
            <QuickFilter active={isPriceActive} dark={dark} label={t('autocare.filterPrice')} onClick={onTogglePrice} />
            <QuickFilter active={isRatingActive} dark={dark} label={t('autocare.filterRating')} onClick={onToggleRating} />
            <QuickFilter active={isNearbyActive} dark={dark} label={t('autocare.filterDistance')} onClick={onToggleNearby} />
            <QuickFilter active={isAvailableToday} dark={dark} label={t('autocare.filterAvailability')} onClick={onToggleAvailableToday} />
            <button
                type="button"
                onClick={onToggleFilters}
                className={`inline-flex h-9 items-center gap-2 rounded-[var(--radius-control)] border px-3 text-xs font-black transition ${dark ? 'border-primary-foreground/20 bg-primary-foreground/[0.08] text-primary-foreground hover:border-primary' : 'border-border bg-card text-foreground hover:border-primary hover:text-primary'}`}
            >
                <SlidersHorizontal className="size-3.5" />
                {t('autocare.filtersTitle')}
                {activeCount > 0 && <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">{activeCount}</span>}
            </button>
        </div>
    )
}

function QuickFilter({ active, dark, label, onClick }: { active: boolean; dark: boolean; label: string; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={`inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-control)] border px-3 text-xs font-bold transition ${active ? 'border-primary bg-primary text-primary-foreground' : dark ? 'border-primary-foreground/20 bg-primary-foreground/[0.08] text-primary-foreground/80 hover:border-primary hover:text-primary-foreground' : 'border-border bg-card text-muted-foreground hover:border-primary hover:text-primary'}`}
        >
            {active && <Check className="size-3.5" />}
            {label}
        </button>
    )
}
