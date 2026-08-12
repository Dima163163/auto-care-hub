import { LocateFixed, Minus, Plus, SlidersHorizontal, X } from 'lucide-react'
import { Link } from 'react-router'

import type { ProviderPreview } from '@/entities/automotive-service'
import { routePaths } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'

type AutoCareMapPreviewProps = {
    providers: readonly ProviderPreview[]
    selectedProviders: readonly ProviderPreview[]
    onRemove: (id: string) => void
}

const markerPositions = [
    { left: '18%', top: '34%' },
    { left: '69%', top: '21%' },
    { left: '61%', top: '67%' },
    { left: '28%', top: '73%' },
]

export function AutoCareMapPreview({ providers, selectedProviders, onRemove }: AutoCareMapPreviewProps) {
    const { t } = useTranslation()

    return (
        <aside className="relative min-h-[620px] overflow-hidden rounded-[var(--radius-panel)] border border-border bg-hero-overlay text-primary-foreground shadow-sm lg:sticky lg:top-6">
            <img src="/images/autocare/hero-map-generated.webp" alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" aria-hidden="true" />
            <div className="absolute inset-0 bg-hero-overlay/35" aria-hidden="true" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_52%_48%,rgb(37_99_235_/_0.45),transparent_24%)]" aria-hidden="true" />

            <div className="relative flex min-h-[620px] flex-col p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="text-sm font-black">{t('autocare.mapPreviewLabel')}</p>
                        <p className="mt-1 text-xs font-medium text-primary-foreground/70">{t('autocare.mapPreviewHint')}</p>
                    </div>
                    <button type="button" className="inline-flex size-10 items-center justify-center rounded-[var(--radius-control)] border border-primary-foreground/20 bg-hero-overlay/60 text-primary-foreground hover:bg-hero-overlay" aria-label={t('autocare.sortLabel')}>
                        <SlidersHorizontal className="size-4" />
                    </button>
                </div>

                <div className="relative flex-1" aria-label={t('autocare.mapPreviewLabel')}>
                    <div className="absolute left-1/2 top-1/2 size-36 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/50 bg-primary/10 shadow-[0_0_0_24px_rgb(37_99_235_/_0.10)]" aria-hidden="true" />
                    <LocateFixed className="absolute left-1/2 top-1/2 size-10 -translate-x-1/2 -translate-y-1/2 text-primary drop-shadow-[0_0_10px_rgb(96_165_250)]" aria-hidden="true" />

                    {providers.slice(0, markerPositions.length).map((provider, index) => (
                        <Link
                            key={provider.id}
                            to={routePaths.serviceProviderDetails(provider.id)}
                            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-control)] border border-primary-foreground/20 bg-hero-overlay/90 px-3 py-2 text-left shadow-lg transition hover:-translate-y-[calc(50%+2px)] hover:border-primary"
                            style={markerPositions[index]}
                        >
                            <strong className="block text-xs font-black">{t('autocare.fromPrice', { price: new Intl.NumberFormat(undefined, { style: 'currency', currency: provider.currency, maximumFractionDigits: 0 }).format(provider.price) })}</strong>
                            <span className="mt-0.5 flex items-center gap-1 text-[12px] font-semibold text-primary-foreground/75"><span className="text-rating-fill">★</span>{provider.rating}</span>
                        </Link>
                    ))}
                </div>

                <div className="mt-auto flex items-end justify-between gap-3">
                    <div className="max-w-[250px] rounded-[var(--radius-control)] border border-primary-foreground/15 bg-hero-overlay/85 p-3">
                        <p className="text-xs font-bold text-primary-foreground/75">{t('autocare.mapTrustLabel')}</p>
                        <p className="mt-1 text-sm font-black">{t('autocare.mapRatingLabel')}</p>
                    </div>
                    <div className="flex flex-col overflow-hidden rounded-[var(--radius-control)] border border-primary-foreground/20 bg-hero-overlay/85">
                        <button type="button" className="inline-flex size-10 items-center justify-center border-b border-primary-foreground/15 hover:bg-primary-foreground/10" aria-label="Zoom in"><Plus className="size-4" /></button>
                        <button type="button" className="inline-flex size-10 items-center justify-center hover:bg-primary-foreground/10" aria-label="Zoom out"><Minus className="size-4" /></button>
                    </div>
                </div>

                {selectedProviders.length > 0 && <div className="mt-3 rounded-[var(--radius-control)] border border-primary/40 bg-hero-overlay/95 p-3"><div className="flex items-center justify-between gap-3"><p className="text-xs font-black">{t('autocare.compareSelected', { count: selectedProviders.length })}</p><span className="text-[12px] font-semibold text-primary-foreground/65">{t('autocare.compareAction')}</span></div><div className="mt-2 flex flex-wrap gap-2">{selectedProviders.map((provider) => <span key={provider.id} className="inline-flex items-center gap-1.5 rounded-full border border-primary-foreground/15 bg-primary-foreground/10 px-2.5 py-1 text-[12px] font-bold">{provider.name}<button type="button" onClick={() => onRemove(provider.id)} aria-label={`${t('autocare.clearCompare')}: ${provider.name}`}><X className="size-3" /></button></span>)}</div></div>}
            </div>
        </aside>
    )
}
