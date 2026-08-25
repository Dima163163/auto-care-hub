import { Check, Clock3, Info, Wrench } from 'lucide-react'

import type { ProviderProfile } from '@/entities/automotive-service'
import { automotiveServices, getServiceLabel } from '@/entities/automotive-service'
import { useTranslation } from '@/shared/lib/useTranslation'

type ProviderOfferingsProps = { provider: ProviderProfile; selectedServiceId: string; onSelect: (serviceId: string) => void }

export function ProviderOfferings({ provider, selectedServiceId, onSelect }: ProviderOfferingsProps) {
    const { t, locale } = useTranslation()

    return (
        <section id="services" className="overflow-hidden rounded-[var(--radius-panel)] border border-border bg-card shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4 sm:px-6"><h2 className="text-xl font-black tracking-tight text-foreground">{t('autocare.providerServices')}</h2><span className="rounded-[var(--radius-control)] bg-secondary px-3 py-1.5 text-xs font-bold text-muted-foreground">{provider.offerings.length} {t('autocare.providerServices').toLowerCase()}</span></div>
            <div className="hidden grid-cols-[minmax(0,1fr)_7rem_9rem] gap-3 border-b border-border bg-secondary/45 px-5 py-3 text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground sm:grid sm:px-6"><span>{t('autocare.providerChooseService')}</span><span>{t('autocare.providerPriceFrom')}</span><span>{t('autocare.providerNextAvailability')}</span></div>
            <div className="divide-y divide-border px-5 sm:px-6">
                {provider.offerings.map((offering) => {
                    const service = automotiveServices.find((item) => item.id === offering.serviceId)
                    const isSelected = offering.serviceId === selectedServiceId
                    return (
                        <article key={offering.serviceId} className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_7rem_9rem] sm:items-center">
                            <button type="button" onClick={() => onSelect(offering.serviceId)} className="flex min-w-0 items-start gap-3 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/40">
                                <span className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-secondary text-primary'}`}><Wrench className="size-3.5" /></span>
                                <span className="min-w-0"><strong className="block text-sm font-black text-foreground">{service ? getServiceLabel(service, locale) : offering.serviceId}</strong><span className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-muted-foreground">{offering.includes.slice(0, 2).map((item) => <span key={item} className="inline-flex items-center gap-1"><Check className="size-3 text-status-success-foreground" />{item}</span>)}</span></span>
                            </button>
                            <div className="flex items-center justify-between gap-3 sm:block"><strong className="text-sm font-black text-foreground">{offering.priceLabel}</strong><span className="mt-1 block text-xs font-medium text-muted-foreground">{t('autocare.partsIncluded')}</span></div>
                            <div className="flex items-center justify-between gap-3"><span className="inline-flex items-center gap-1.5 text-xs font-bold text-status-success-foreground"><Clock3 className="size-3.5" />{t('autocare.providerAvailabilityRequest')}</span><button type="button" onClick={() => onSelect(offering.serviceId)} aria-label={t('autocare.requestSelectedService')} className={isSelected ? 'flex size-8 items-center justify-center rounded-[var(--radius-control)] bg-primary text-primary-foreground' : 'flex size-8 items-center justify-center rounded-[var(--radius-control)] border border-border text-primary hover:border-primary'}>{isSelected ? <Check className="size-4" /> : <Info className="size-4" />}</button></div>
                        </article>
                    )
                })}
            </div>
            <button type="button" className="flex h-11 w-full items-center justify-center border-t border-border text-xs font-black text-primary hover:bg-secondary">{t('autocare.providerShowAllServices')}</button>
        </section>
    )
}
