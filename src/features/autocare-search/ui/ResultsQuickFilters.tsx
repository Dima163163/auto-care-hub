import { Check, SlidersHorizontal } from 'lucide-react'

import { useTranslation } from '@/shared/lib/useTranslation'

type ResultsQuickFiltersProps = {
    activeCount: number
    dark?: boolean
    disabled?: boolean
    isAvailableToday: boolean
    isNearbyActive: boolean
    isPriceActive: boolean
    isRatingActive: boolean
    onToggleFilters: () => void
    onToggleAvailableToday: () => void
    onToggleNearby: () => void
    onTogglePrice: () => void
    onToggleRating: () => void
}

export function ResultsQuickFilters({
    activeCount,
    dark = false,
    disabled = false,
    isAvailableToday,
    isNearbyActive,
    isPriceActive,
    isRatingActive,
    onToggleFilters,
    onToggleAvailableToday,
    onToggleNearby,
    onTogglePrice,
    onToggleRating,
}: ResultsQuickFiltersProps) {
    const { t } = useTranslation()

    return (
        <div className="flex flex-wrap items-center gap-2">
            <QuickFilter active={isPriceActive} dark={dark} disabled={disabled} label={t('autocare.filterPrice')} onClick={onTogglePrice} />
            <QuickFilter active={isRatingActive} dark={dark} disabled={disabled} label={t('autocare.filterRating')} onClick={onToggleRating} />
            <QuickFilter active={isNearbyActive} dark={dark} disabled={disabled} label={t('autocare.filterDistance')} onClick={onToggleNearby} />
            <QuickFilter active={isAvailableToday} dark={dark} disabled={disabled} label={t('autocare.filterAvailability')} onClick={onToggleAvailableToday} />
            <button type="button" disabled={disabled} onClick={onToggleFilters} className={`inline-flex h-9 items-center gap-2 rounded-[var(--radius-control)] border px-3 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${dark ? 'border-primary-foreground/20 bg-primary-foreground/[0.08] text-primary-foreground hover:border-primary' : 'border-border bg-card text-foreground hover:border-primary hover:text-primary'}`}><SlidersHorizontal className="size-3.5" />{t('autocare.filtersTitle')}{activeCount > 0 ? <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">{activeCount}</span> : null}</button>
        </div>
    )
}

function QuickFilter({ active, dark, disabled, label, onClick }: { active: boolean; dark: boolean; disabled: boolean; label: string; onClick: () => void }) {
    return <button type="button" disabled={disabled} onClick={onClick} aria-pressed={active} className={`inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-control)] border px-3 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${active ? 'border-primary bg-primary text-primary-foreground' : dark ? 'border-primary-foreground/20 bg-primary-foreground/[0.08] text-primary-foreground/80 hover:border-primary hover:text-primary-foreground' : 'border-border bg-card text-muted-foreground hover:border-primary hover:text-primary'}`}>{active ? <Check className="size-3.5" /> : null}{label}</button>
}
