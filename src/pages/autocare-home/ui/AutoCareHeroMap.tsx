import { useState } from 'react'
import { MapPin, Minus, Plus, Star } from 'lucide-react'

import type { AutoCareApiDiscoveryItem } from '@/entities/automotive-service'
import { formatCurrency } from '@/shared/lib/locale-format'
import { useTranslation } from '@/shared/lib/useTranslation'

const markerPositions = [
    { top: '9%', left: '41%' }, { top: '17%', left: '79%' }, { top: '37%', left: '36%' },
    { top: '61%', left: '78%' }, { top: '68%', left: '36%' }, { top: '84%', left: '69%' },
] as const

export function AutoCareHeroMap({ items }: { items: readonly AutoCareApiDiscoveryItem[] }) {
    const { t, locale } = useTranslation()
    const [zoom, setZoom] = useState(1)

    const zoomIn = () => setZoom((current) => Math.min(1.2, current + 0.1))
    const zoomOut = () => setZoom((current) => Math.max(1, current - 0.1))

    return (
        <div className="absolute inset-0 overflow-hidden bg-map-surface" role="region" aria-label={t('autocare.heroMapLabel')}>
            <div className="absolute inset-0 origin-center transition-transform duration-300" style={{ transform: `scale(${zoom})` }}>
                <img src="/images/autocare/hero-map-generated.webp" alt="" className="absolute inset-0 h-full w-full object-cover object-center" aria-hidden="true" />
                <div className="absolute inset-0 bg-hero-overlay/15" aria-hidden="true" />
                <div className="absolute left-[71%] top-[48%] size-44 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/50 bg-primary/15 shadow-[0_0_34px_var(--hero-glow)] lg:size-56" aria-hidden="true">
                    <span className="absolute left-1/2 top-1/2 size-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-primary-foreground bg-primary shadow-[0_0_16px_var(--primary)]" />
                </div>
                <div className="hidden lg:block">
                    {items.slice(0, markerPositions.length).map((item, index) => {
                        const position = markerPositions[index]
                        if (!position) return null
                        return <OfferMarker
                            key={`${item.provider.id}-${item.provider.location.id}-${item.offer.id}`}
                            {...position}
                            item={item}
                            locale={locale}
                            priceLabel={t('autocare.fromPrice', { price: formatCurrency(item.offer.priceFromMinor / 100, item.offer.currencyCode, locale) })}
                        />
                    })}
                </div>
            </div>
            <div className="absolute bottom-12 right-8 hidden flex-col overflow-hidden rounded-[9px] border border-primary-foreground/20 bg-map-overlay/90 text-primary-foreground shadow-xl lg:flex">
                <button type="button" onClick={zoomIn} className="flex size-12 items-center justify-center border-b border-primary-foreground/15 disabled:cursor-not-allowed disabled:opacity-50" aria-label={t('cabinet.publicList.mapZoomIn')} disabled={zoom >= 1.2}><Plus className="size-6" /></button>
                <button type="button" onClick={zoomOut} className="flex size-12 items-center justify-center disabled:cursor-not-allowed disabled:opacity-50" aria-label={t('cabinet.publicList.mapZoomOut')} disabled={zoom <= 1}><Minus className="size-6" /></button>
            </div>
            <span className="sr-only" aria-live="polite">{t('autocare.heroMapZoomLevel', { percent: Math.round(zoom * 100) })}</span>
        </div>
    )
}

function OfferMarker({ top, left, priceLabel, item, locale }: { top: string; left: string; priceLabel: string; item: AutoCareApiDiscoveryItem; locale: string }) {
    const toneClass = item.provider.verified ? 'bg-map-marker-success' : 'bg-map-marker-primary'
    const rating = item.provider.reviewCount > 0 ? new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(item.provider.rating) : '—'

    return (
        <span className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-[12px] border border-primary-foreground/20 bg-map-overlay/80 px-2.5 py-2 text-primary-foreground shadow-xl backdrop-blur-sm" style={{ top, left }}>
            <span className={`flex size-9 items-center justify-center rounded-full ${toneClass}`}><MapPin className="size-5" /></span>
            <span className="pr-1"><strong className="block whitespace-nowrap text-sm">{priceLabel}</strong><span className="flex items-center gap-1 text-xs font-semibold">{rating}{item.provider.reviewCount > 0 && <Star className="size-3 fill-map-rating text-map-rating" />}</span></span>
        </span>
    )
}
