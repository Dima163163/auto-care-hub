import { BadgeCheck, Check, Clock3, Heart, LocateFixed, MessageCircle, ShieldCheck, Star } from 'lucide-react'
import { Link } from 'react-router'

import { ProviderLogo, type ProviderPreview } from '@/entities/automotive-service'
import { useAutoCareFavorites } from '@/features/automotive-favorites'
import { routePaths } from '@/shared/constants/routes'
import { formatAutoCareSlot, formatCurrency, formatDistanceKm, parseDistanceKm } from '@/shared/lib/locale-format'
import { formatAutoCareReviewCount } from '@/shared/lib/formatAutoCareCount'
import { useTranslation } from '@/shared/lib/useTranslation'
import { AutoCareImage } from '@/shared/ui/autocare-image'

type ProviderResultCardProps = {
    provider: ProviderPreview
    selected: boolean
    highlight: 'highest-rating' | null
    onToggle: () => void
    onFocus: () => void
}

export function ProviderResultCard({ provider, selected, highlight, onToggle, onFocus }: ProviderResultCardProps) {
    const { t, locale } = useTranslation()
    const { isFavorite, toggle } = useAutoCareFavorites()
    const favorite = isFavorite(provider.id)
    const price = formatCurrency(provider.price, provider.currency, locale)
    const priceType = provider.priceType ?? 'from'
    const priceTo = provider.priceTo ?? null
    const formattedPriceTo = priceTo === null ? null : formatCurrency(priceTo, provider.currency, locale)
    const displayPrice = priceType === 'fixed'
        ? price
        : priceType === 'range' && formattedPriceTo
            ? `${price}–${formattedPriceTo}`
            : priceType === 'quote_required'
                ? t('autocare.quoteRequiredPrice')
                : t('autocare.fromPrice', { price })
    const priceFormatLabel = t(`autocare.priceType.${priceType}`)
    const isHighestRating = highlight === 'highest-rating'
    const hasPhoto = Boolean(provider.image?.trim())
    const providerHref = routePaths.serviceProviderDetails(provider.id, provider.serviceIds?.[0], provider.marketId)
    const warrantyText = provider.warrantyText?.trim()
    const inclusions = provider.inclusions?.filter(Boolean).slice(0, 2) ?? []

    return <article className={`overflow-hidden rounded-[var(--radius-card)] border bg-card p-3 shadow-sm transition sm:p-4 ${selected ? 'border-primary ring-2 ring-ring/30' : 'border-border hover:border-primary/50'}`}>
        {isHighestRating && <span className="mb-2 inline-flex rounded-md bg-status-warning-surface px-2.5 py-1 text-[11px] font-black text-status-warning-foreground">{t('autocare.highestRating')}</span>}
        <div className={`grid gap-3 ${hasPhoto ? 'sm:grid-cols-[128px_minmax(0,1fr)]' : ''}`}>
            {hasPhoto && <Link to={providerHref} className="block shrink-0"><AutoCareImage src={provider.image} alt={provider.name} className="h-28 w-full rounded-[var(--radius-control)] object-cover sm:h-28 sm:w-32" /></Link>}
            <div className="min-w-0">
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><ProviderLogo logoUrl={provider.logoUrl} name={provider.name} /><Link to={providerHref} className="break-words font-black text-foreground hover:text-primary">{provider.name}</Link>{provider.verified && <BadgeCheck className="size-4 text-primary" aria-label={t('autocare.trustedBadge')} />}{provider.trustBadge === 'trusted' && <Link to={`${providerHref}#trust`} className="inline-flex items-center gap-1 rounded-full bg-status-success-surface px-2 py-0.5 text-[10px] font-black text-status-success-foreground" title={t('autocare.trustWhyAction')}><ShieldCheck className="size-3" />{t('autocare.trustBadgeLabel')}</Link>}</div><div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-bold">{provider.reviewCount > 0 ? <><span className="inline-flex items-center gap-1 text-rating-foreground"><Star className="size-3.5 fill-rating-fill" />{provider.rating.toFixed(1)}</span><span className="font-medium text-muted-foreground">({formatAutoCareReviewCount(provider.reviewCount, locale, t)})</span></> : <span className="font-medium text-muted-foreground">{t('autocare.providerNoReviews')}</span>}</div></div><button type="button" onClick={onToggle} aria-pressed={selected} className={`flex size-8 shrink-0 items-center justify-center rounded-md border ${selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:border-primary hover:text-primary'}`} aria-label={t('autocare.compareAction')}><Check className="size-4" /></button></div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-muted-foreground"><span>{formatDistanceKm(provider.distanceKm ?? parseDistanceKm(provider.distance), locale)}</span><span>·</span><span>{provider.address ?? t('common.notProvided')}</span></div>
                <div className="mt-3 flex flex-wrap items-end justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><p className="text-base font-black text-foreground">{displayPrice}</p><span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">{priceFormatLabel}</span></div>{inclusions.length > 0 && <p className="mt-1 text-xs font-medium text-muted-foreground">{inclusions.join(' · ')}</p>}</div></div>
            </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-3 text-xs font-semibold text-muted-foreground">{warrantyText && <span className="inline-flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-status-success-foreground" />{warrantyText}</span>}<button type="button" onClick={onFocus} className="inline-flex items-center gap-1.5 text-primary hover:underline"><LocateFixed className="size-3.5" />{t('autocare.bookingToday')}</button></div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3"><span className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground"><Clock3 className="size-4 text-primary" />{provider.nextSlot ? formatAutoCareSlot(provider.nextSlot, locale) : t('autocare.availabilityOnRequest')}</span><div className="flex gap-2"><Link to={`${routePaths.serviceProviderDetails(provider.id, provider.serviceIds?.[0], provider.marketId)}#request`} className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-control)] border border-border px-3 text-xs font-black text-foreground hover:border-primary hover:text-primary"><MessageCircle className="size-3.5" />{t('autocare.messageAction')}</Link><Link to={routePaths.serviceRequest(provider.id, provider.serviceIds?.[0], provider.marketId)} className="inline-flex h-9 items-center rounded-[var(--radius-control)] bg-primary px-4 text-xs font-black text-primary-foreground hover:bg-primary/90">{t('autocare.bookAction')}</Link><button type="button" onClick={() => toggle(provider.id)} aria-pressed={favorite} aria-label={t('autocare.addFavorite')} className={`flex size-9 items-center justify-center rounded-[var(--radius-control)] border ${favorite ? 'border-status-danger-foreground bg-status-danger-surface text-status-danger-foreground' : 'border-border text-muted-foreground hover:border-primary hover:text-primary'}`}><Heart className={`size-4 ${favorite ? 'fill-current' : ''}`} /></button></div></div>
    </article>
}
