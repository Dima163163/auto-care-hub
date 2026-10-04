import { Check, Clock3, Wrench } from 'lucide-react'

import type { ProviderProfile } from '@/entities/automotive-service'
import { automotiveServices, getServiceLabel } from '@/entities/automotive-service'
import { useTranslation } from '@/shared/lib/useTranslation'

import { formatProviderOfferingDuration, formatProviderOfferingPrice } from '@/entities/automotive-service/lib/providerOfferingFormat'
import { formatAutoCareCount } from '@/shared/lib/formatAutoCareCount'
import { normalizeLocale } from '@/shared/config/i18n'

type ProviderOfferingsProps = { provider: ProviderProfile; selectedServiceId: string; onSelect: (serviceId: string) => void }

export function ProviderOfferings({ provider, selectedServiceId, onSelect }: ProviderOfferingsProps) {
    const { t, locale } = useTranslation()
    const countLocale = normalizeLocale(locale) ?? 'en'
    const commonInclusions = provider.offerings[0]?.includes.filter((item) => provider.offerings.every((offer) => offer.includes.includes(item))) ?? []
    const commonWarranty = provider.offerings[0]?.warrantyText && provider.offerings.every((offer) => offer.warrantyText === provider.offerings[0]?.warrantyText) ? provider.offerings[0].warrantyText : null

    return (
        <section id="services" className="overflow-hidden rounded-[var(--radius-panel)] border border-border bg-card shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4 sm:px-6"><h2 className="text-xl font-black tracking-tight text-foreground">{t('autocare.providerServices')}</h2><span className="rounded-[var(--radius-control)] bg-secondary px-3 py-1.5 text-xs font-bold text-muted-foreground">{formatAutoCareCount(provider.offerings.length, countLocale, t, { one: 'autocare.providerOfferCountOne', few: 'autocare.providerOfferCountFew', many: 'autocare.providerOfferCountMany', other: 'autocare.providerOfferCountOther' })}</span></div>
            {(commonInclusions.length > 0 || commonWarranty) && <div className="border-b border-border bg-secondary/30 px-5 py-3 text-sm text-muted-foreground"><p className="font-medium text-foreground">{t('autocare.sharedOfferingConditions')}</p><p className="mt-1">{[...commonInclusions, commonWarranty].filter(Boolean).join(' · ')}</p></div>}
            <div className="hidden grid-cols-[minmax(0,1fr)_7rem_9rem] gap-3 border-b border-border bg-secondary/45 px-5 py-3 text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground sm:grid sm:px-6"><span>{t('autocare.providerChooseService')}</span><span>{t('autocare.priceTypeLabel')}</span><span>{t('autocare.offeringDuration')}</span></div>
            <div className="divide-y divide-border px-5 sm:px-6">
                {provider.offerings.map((offering) => {
                    const service = automotiveServices.find((item) => item.id === offering.serviceId)
                    const isSelected = offering.serviceId === selectedServiceId
                    const priceLabel = formatProviderOfferingPrice(offering, locale, { from: (price) => t('autocare.fromPrice', { price }), quoteRequired: t('autocare.quoteRequiredPrice') })
                    return (
                        <article key={offering.serviceId} className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_7rem_9rem] sm:items-center">
                            <button type="button" onClick={() => onSelect(offering.serviceId)} aria-pressed={isSelected} className="flex min-w-0 items-start gap-3 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/40">
                                <span className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-secondary text-primary'}`}><Wrench className="size-3.5" /></span>
                                <span className="min-w-0"><strong className="block text-sm font-black text-foreground">{service ? getServiceLabel(service, locale) : offering.serviceId}</strong><span className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-muted-foreground">{offering.includes.filter((item) => !commonInclusions.includes(item)).map((item) => <span key={item} className="inline-flex items-center gap-1"><Check className="size-3 text-status-success-foreground" />{item}</span>)}</span></span>
                            </button>
                            <div className="flex items-center justify-between gap-3 sm:block"><strong className="text-sm font-semibold text-foreground">{priceLabel}</strong><span className="mt-1 block text-xs text-muted-foreground">{t(`autocare.priceType.${offering.priceType ?? 'from'}`)}</span>{offering.warrantyText && !commonWarranty && <span className="mt-1 block text-xs font-medium text-muted-foreground">{offering.warrantyText}</span>}</div>
                            <div className="flex items-center justify-between gap-3"><span className="inline-flex items-center gap-1.5 text-xs font-bold text-status-success-foreground"><Clock3 className="size-3.5" />{formatProviderOfferingDuration(offering, locale)}</span><button type="button" onClick={() => onSelect(offering.serviceId)} aria-label={`${service ? getServiceLabel(service, locale) : offering.serviceId} — ${t('autocare.providerChooseService')}`} aria-pressed={isSelected} className={isSelected ? 'flex size-8 items-center justify-center rounded-[var(--radius-control)] bg-primary text-primary-foreground' : 'flex size-8 items-center justify-center rounded-[var(--radius-control)] border border-border text-primary hover:border-primary'}>{isSelected ? <Check className="size-4" /> : <Wrench className="size-4" />}</button></div>
                        </article>
                    )
                })}
            </div>
        </section>
    )
}
