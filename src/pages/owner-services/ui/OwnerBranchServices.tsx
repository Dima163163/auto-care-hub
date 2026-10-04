import { BadgeCheck, ChevronDown, Clock3, MapPin, Star, Wrench } from 'lucide-react'
import { Link } from 'react-router'
import { useState } from 'react'

import { formatProviderPreviewPrice } from '@/entities/automotive-service'
import type { AutoCareApiOffer, AutoCareApiProvider, AutoCareApiServiceDefinition } from '@/entities/automotive-service'
import { routePaths } from '@/shared/constants/routes'
import type { SupportedLocale } from '@/shared/config/i18n'
import { formatDurationMinutes } from '@/shared/lib/locale-format'
import { formatAutoCareReviewCount } from '@/shared/lib/formatAutoCareCount'
import { useTranslation } from '@/shared/lib/useTranslation'

import { EditOfferButton, OwnerOfferDialog } from './OwnerOfferEditor'

type OwnerBranchServicesProps = {
    provider: AutoCareApiProvider
    definitions: AutoCareApiServiceDefinition[]
    locale: SupportedLocale
    labels: {
        branchServices: string
        address: string
        hours: string
        from: string
        estimate: string
        noPublished: string
        edit: string
        save: string
        cancel: string
        offerDescription: string
        descriptionPlaceholder: string
        price: string
        bookingMode: string
        bookingModeRequest: string
        bookingModeInstant: string
        priceInvalid: string
        editError: string
        priceSnapshotNotice: string
        serviceFallback: string
        notProvided: string
    }
    isOpen: boolean
    onToggle: () => void
}

export function OwnerBranchServices({ provider, definitions, locale, labels, isOpen, onToggle }: OwnerBranchServicesProps) {
    const { t } = useTranslation()
    const offers = provider.offers ?? []

    return (
        <section className="overflow-hidden rounded-[var(--radius-panel)] border border-border bg-card shadow-sm">
            <div className="flex w-full flex-wrap items-center justify-between gap-4 p-5 text-left transition hover:bg-primary/5 md:p-6">
                <button type="button" aria-expanded={isOpen} onClick={onToggle} className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left">
                    <span className="flex min-w-0 items-center gap-3">
                        <span className="flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-primary/10 text-primary">
                            <Wrench className="size-5" />
                        </span>
                        <span className="min-w-0">
                            <span className="flex flex-wrap items-center gap-2 text-base font-black text-foreground md:text-lg">
                                <span className="truncate">{provider.name}</span>
                                {provider.verified && <BadgeCheck className="size-4 shrink-0 text-primary" />}
                            </span>
                            <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-muted-foreground">
                                <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{provider.location.address}</span>
                            </span>
                        </span>
                    </span>
                </button>
                <span className="flex items-center gap-3 text-xs font-black text-muted-foreground">
                    <Link to={routePaths.ownerAutoCareProviderReviews(provider.id)} className="inline-flex items-center gap-1 text-status-warning-foreground hover:text-primary hover:underline"><Star className="size-3.5 fill-current" />{provider.rating.toFixed(1)} ({formatAutoCareReviewCount(provider.reviewCount, locale, t)})</Link>
                    <span>{offers.length} {labels.branchServices}</span>
                    <ChevronDown className={`size-5 transition-transform ${isOpen ? 'rotate-180 text-primary' : ''}`} aria-hidden="true" />
                </span>
            </div>

            {isOpen && (
                <div className="border-t border-border bg-muted p-4 md:p-5">
                    <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5"><MapPin className="size-3.5 text-primary" />{labels.address}: {provider.location.address}</span>
                        <span className="inline-flex items-center gap-1.5"><Clock3 className="size-3.5 text-primary" />{labels.hours}: {provider.location.hours}</span>
                    </div>
                    {offers.length > 0 ? (
                        <div className="divide-y divide-border">
                            {offers.map((offer) => <ServiceOfferCard key={offer.id} providerId={provider.id} offer={offer} definitions={definitions} locale={locale} labels={labels} />)}
                        </div>
                    ) : (
                        <p className="rounded-[var(--radius-card)] border border-dashed border-border p-5 text-center text-sm font-semibold text-muted-foreground">{labels.noPublished}</p>
                    )}
                </div>
            )}
        </section>
    )
}

function ServiceOfferCard({ providerId, offer, definitions, locale, labels }: { providerId: string; offer: AutoCareApiOffer; definitions: AutoCareApiServiceDefinition[]; locale: SupportedLocale; labels: OwnerBranchServicesProps['labels'] }) {
    const [isEditing, setIsEditing] = useState(false)
    const definition = definitions.find((item) => item.id === offer.serviceDefinitionId || item.slug === offer.serviceSlug)
    const title = offer.serviceLabels?.[locale] ?? definition?.labels[locale] ?? offer.serviceLabels?.en ?? definition?.labels.en ?? offer.serviceSlug ?? labels.serviceFallback
    const { t } = useTranslation()
    const price = formatProviderPreviewPrice({ price: offer.priceFromMinor / 100, priceTo: offer.priceToMinor == null ? null : offer.priceToMinor / 100, currency: offer.currencyCode, priceType: offer.priceType }, locale, { from: (value) => t('autocare.fromPrice', { price: value }), quoteRequired: labels.estimate })

    return (
        <>
            <article className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(100px,0.35fr)_minmax(90px,0.3fr)_auto] sm:items-center">
                <div className="min-w-0"><h2 className="text-sm font-semibold text-foreground">{title}</h2>{offer.description ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{offer.description}</p> : null}<p className="mt-1 text-xs text-muted-foreground">{offer.warrantyText ?? labels.notProvided}</p></div>
                <div><p className="text-sm font-semibold text-foreground">{price}</p><p className="mt-1 text-xs text-muted-foreground">{t(`autocare.priceType.${offer.priceType ?? 'from'}`)}</p></div>
                <p className="text-sm text-muted-foreground">{formatDurationMinutes(offer.durationMinutes, locale)}</p>
                <EditOfferButton label={labels.edit} onClick={() => setIsEditing(true)} />
            </article>
            <OwnerOfferDialog title={title} isOpen={isEditing} onOpenChange={setIsEditing} providerId={providerId} offer={offer} labels={labels} onCancel={() => setIsEditing(false)} onSaved={() => setIsEditing(false)} />
        </>
    )
}
