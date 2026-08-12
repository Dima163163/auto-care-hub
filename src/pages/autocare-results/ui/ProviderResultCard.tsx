import { BadgeCheck, Check, Clock3, Heart, LocateFixed, ShieldCheck, Star } from 'lucide-react'
import { Link } from 'react-router'
import { useState } from 'react'

import type { ProviderPreview } from '@/entities/automotive-service'
import { routePaths } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'
import { AutoCareImage } from '@/shared/ui/autocare-image'

type ProviderResultCardProps = {
    provider: ProviderPreview
    selected: boolean
    highlight: 'best-value' | 'highest-rating' | null
    onToggle: () => void
    onFocus: () => void
}

export function ProviderResultCard({ provider, selected, highlight, onToggle, onFocus }: ProviderResultCardProps) {
    const { t } = useTranslation()
    const [favorite, setFavorite] = useState(false)
    const price = new Intl.NumberFormat(undefined, { style: 'currency', currency: provider.currency, maximumFractionDigits: 0 }).format(provider.price)
    const isBestValue = highlight === 'best-value'
    const isHighestRating = highlight === 'highest-rating'
    const hasPhoto = Boolean(provider.image?.trim())
    const warrantyMonths = provider.warrantyMonths ?? (isBestValue ? 12 : null)
    const hasWarranty = Boolean(warrantyMonths)
    const originalParts = provider.inclusions?.some((item) => /parts|запчаст|расход/i.test(item)) ?? isBestValue
    const oldPrice = new Intl.NumberFormat(undefined, { style: 'currency', currency: provider.currency, maximumFractionDigits: 0 }).format(Math.round(provider.price * 1.17 / 50) * 50)

    return <article className={`rounded-[var(--radius-card)] border bg-card p-3 shadow-sm transition sm:p-4 ${isBestValue ? 'border-status-success-foreground/70 ring-1 ring-status-success-foreground/25' : selected ? 'border-primary ring-2 ring-ring/30' : 'border-border hover:border-primary/50'}`}>
        {isBestValue && <span className="mb-2 inline-flex rounded-md bg-status-success-surface px-2.5 py-1 text-[11px] font-black text-status-success-foreground">{t('autocare.bestValue')}</span>}
        {isHighestRating && <span className="mb-2 inline-flex rounded-md bg-status-warning-surface px-2.5 py-1 text-[11px] font-black text-status-warning-foreground">{t('autocare.highestRating')}</span>}
        <div className={`grid gap-3 ${hasPhoto ? 'sm:grid-cols-[128px_minmax(0,1fr)]' : ''}`}>
            {hasPhoto && <Link to={routePaths.serviceProviderDetails(provider.id)} className="block shrink-0"><AutoCareImage src={provider.image} alt={provider.name} className="h-28 w-full rounded-[var(--radius-control)] object-cover sm:h-28 sm:w-32" /></Link>}
            <div className="min-w-0">
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2">{isHighestRating && <ProviderBrandMark />}{!hasPhoto && <ProviderFallbackMark />}<Link to={routePaths.serviceProviderDetails(provider.id)} className="font-black text-foreground hover:text-primary">{provider.name}</Link>{provider.verified && <BadgeCheck className="size-4 text-primary" aria-label={t('autocare.trustedBadge')} />}</div><div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-bold"><span className="inline-flex items-center gap-1 text-rating-foreground"><Star className="size-3.5 fill-rating-fill" />{provider.rating.toFixed(1)}</span><span className="font-medium text-muted-foreground">({t('autocare.reviews', { count: provider.reviewCount })})</span></div></div><button type="button" onClick={onToggle} aria-pressed={selected} className={`flex size-8 shrink-0 items-center justify-center rounded-md border ${selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:border-primary hover:text-primary'}`} aria-label={t('autocare.compareAction')}><Check className="size-4" /></button></div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-muted-foreground"><span>{provider.distance}</span><span>·</span><span>{provider.address ?? 'Москва, ул. Льва Толстого, 18'}</span></div>
                <div className="mt-3 flex flex-wrap items-end justify-between gap-3"><div><div className="flex items-center gap-2"><p className="text-base font-black text-foreground">{t('autocare.fromPrice', { price })}</p>{isBestValue && <><span className="text-xs font-medium text-muted-foreground line-through">{oldPrice}</span><span className="rounded bg-status-danger-surface px-1.5 py-1 text-xs font-bold text-status-danger-foreground">-17%</span></>}</div><p className="text-xs font-medium text-muted-foreground">{t('autocare.partsIncluded')}</p></div></div>
            </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-3 text-xs font-semibold text-muted-foreground"><span className="inline-flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-status-success-foreground" />{originalParts ? t('autocare.originalParts') : t('autocare.partsIncluded')}</span><span className="inline-flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-status-success-foreground" />{hasWarranty ? t('autocare.warrantyMonths', { count: warrantyMonths ?? 12 }) : t('autocare.qualityGuarantee')}</span><button type="button" onClick={onFocus} className="inline-flex items-center gap-1.5 text-primary hover:underline"><LocateFixed className="size-3.5" />{t('autocare.bookingToday')}</button></div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3"><span className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground"><Clock3 className="size-4 text-primary" />{provider.nextSlot}</span><div className="flex gap-2"><Link to={routePaths.serviceProviderDetails(provider.id)} className="inline-flex h-9 items-center rounded-[var(--radius-control)] bg-primary px-5 text-xs font-black text-primary-foreground hover:bg-primary/90">{t('autocare.bookAction')}</Link><button type="button" onClick={() => setFavorite((value) => !value)} aria-pressed={favorite} aria-label={t('autocare.addFavorite')} className={`flex size-9 items-center justify-center rounded-[var(--radius-control)] border ${favorite ? 'border-status-danger-foreground bg-status-danger-surface text-status-danger-foreground' : 'border-border text-muted-foreground hover:border-primary hover:text-primary'}`}><Heart className={`size-4 ${favorite ? 'fill-current' : ''}`} /></button></div></div>
    </article>
}

function ProviderBrandMark() {
    return <span className="inline-flex h-4 min-w-6 shrink-0 items-center justify-center rounded-[5px] bg-status-danger-foreground px-1 text-[7px] font-black tracking-[-0.08em] text-primary-foreground">A·L</span>
}

function ProviderFallbackMark() {
    return <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden="true" focusable="false"><circle cx="16" cy="16" r="15" fill="currentColor" /><circle cx="16" cy="16" r="8.5" fill="none" stroke="var(--color-background)" strokeWidth="1.5" /><path d="M11 19.5V12h4.4M11.2 15.4h3.4M21 19.5V12l-2.6 4.1L16 12v7.5" fill="none" stroke="var(--color-background)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.45" /></svg>
}
