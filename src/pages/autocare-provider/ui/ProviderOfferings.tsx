import { Check, Clock3, Info, MapPin } from 'lucide-react'

import type { ProviderProfile } from '@/entities/automotive-service'
import { automotiveServices, getServiceLabel } from '@/entities/automotive-service'
import { useTranslation } from '@/shared/lib/useTranslation'

type ProviderOfferingsProps = {
    provider: ProviderProfile
    selectedServiceId: string
    onSelect: (serviceId: string) => void
}

export function ProviderOfferings({ provider, selectedServiceId, onSelect }: ProviderOfferingsProps) {
    const { t, locale } = useTranslation()

    return (
        <section className="overflow-hidden rounded-[var(--radius-panel)] border border-border bg-card shadow-sm">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border px-5 py-5 sm:px-6">
                <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">{t('autocare.providerProfile')}</p><h2 className="mt-1 text-2xl font-black tracking-tight text-foreground">{t('autocare.providerServices')}</h2></div>
                <span className="text-xs font-semibold text-muted-foreground">{provider.offerings.length} {t('autocare.providerServices').toLowerCase()}</span>
            </div>
            <div className="divide-y divide-border px-5 sm:px-6">
                {provider.offerings.map((offering) => {
                    const service = automotiveServices.find((item) => item.id === offering.serviceId)
                    const isSelected = offering.serviceId === selectedServiceId

                    return (
                        <article key={offering.serviceId} className="grid gap-4 py-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                            <button type="button" onClick={() => onSelect(offering.serviceId)} className="min-w-0 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/40">
                                <h3 className="font-black text-foreground">{service ? getServiceLabel(service, locale) : offering.serviceId}</h3>
                                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-muted-foreground"><span className="inline-flex items-center gap-1.5"><Clock3 className="size-3.5 text-primary" />{offering.duration}</span><span className="inline-flex items-center gap-1.5 text-status-success-foreground"><MapPin className="size-3.5" />{offering.availability}</span></div>
                                <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">{offering.includes.map((item) => <span key={item} className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground"><Check className="size-3.5 text-status-success-foreground" />{item}</span>)}</div>
                            </button>
                            <div className="flex items-center justify-between gap-3 lg:block lg:text-right"><div><p className="text-lg font-black text-foreground">{offering.priceLabel}</p><p className="mt-1 text-xs font-medium text-muted-foreground">{t('autocare.partsIncluded')}</p></div><button type="button" onClick={() => onSelect(offering.serviceId)} className={isSelected ? 'mt-0 inline-flex h-9 items-center rounded-[var(--radius-control)] bg-primary px-3 text-xs font-black text-primary-foreground lg:mt-2' : 'mt-0 inline-flex h-9 items-center rounded-[var(--radius-control)] border border-border px-3 text-xs font-black text-primary transition hover:border-primary hover:text-primary lg:mt-2'}>{isSelected ? '✓' : <Info className="size-3.5" />}</button></div>
                        </article>
                    )
                })}
            </div>
        </section>
    )
}
