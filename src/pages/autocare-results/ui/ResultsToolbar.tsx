import { ArrowLeft, Check, ChevronDown } from 'lucide-react'
import { Link } from 'react-router'

import { ROUTES } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'

type ResultsToolbarProps = {
    selectedCount: number
    onClear: () => void
    sort: 'recommended' | 'price_asc' | 'rating_desc' | 'distance_asc'
    onSortChange: (sort: ResultsToolbarProps['sort']) => void
}

export function ResultsToolbar({ selectedCount, onClear, sort, onSortChange }: ResultsToolbarProps) {
    const { t } = useTranslation()
    return <div className="space-y-5"><Link to={ROUTES.home} className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline"><ArrowLeft className="size-3.5" />{t('autocare.backToSearch')}</Link><div className="rounded-[var(--radius-panel)] bg-hero-overlay p-5 text-primary-foreground shadow-sm sm:p-6"><div className="flex flex-wrap items-end justify-between gap-5"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-foreground/60">{t('autocare.marketLabel')}: Москва</p><h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">{t('autocare.resultsTitle')}</h1><p className="mt-2 max-w-2xl text-sm font-medium text-primary-foreground/70">{t('autocare.resultsDescription')}</p></div><div className="flex items-center gap-2"><label className="relative"><span className="sr-only">{t('autocare.sortLabel')}</span><select value={sort} onChange={(event) => onSortChange(event.target.value as ResultsToolbarProps['sort'])} className="h-10 appearance-none rounded-[var(--radius-control)] border border-primary-foreground/20 bg-primary-foreground/10 py-0 pl-3 pr-9 text-xs font-bold text-primary-foreground outline-none focus:border-primary"><option value="recommended">{t('autocare.recommendedSort')}</option><option value="price_asc">{t('autocare.priceSort')}</option><option value="rating_desc">{t('autocare.ratingSort')}</option><option value="distance_asc">{t('autocare.distanceSort')}</option></select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2" aria-hidden="true" /></label>{selectedCount > 0 && <button type="button" onClick={onClear} className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-control)] bg-primary px-3 text-xs font-bold text-primary-foreground"><Check className="size-4" />{t('autocare.compareSelected', { count: selectedCount })}</button>}</div></div><div className="mt-5 flex flex-wrap gap-2"><span className="rounded-full border border-primary-foreground/15 bg-primary-foreground/10 px-3 py-1.5 text-xs font-semibold">{t('autocare.filterPrice')}</span><span className="rounded-full border border-primary-foreground/15 bg-primary-foreground/10 px-3 py-1.5 text-xs font-semibold">{t('autocare.filterRating')}</span><span className="rounded-full border border-primary-foreground/15 bg-primary-foreground/10 px-3 py-1.5 text-xs font-semibold">{t('autocare.filterDistance')}</span><span className="rounded-full border border-primary-foreground/15 bg-primary-foreground/10 px-3 py-1.5 text-xs font-semibold">{t('autocare.filterAvailability')}</span></div></div></div>
}
