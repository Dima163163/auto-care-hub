import { BadgeCheck, ChevronDown, Clock3, MapPin, Star, Wrench } from 'lucide-react'
import { Link } from 'react-router'
import { useState } from 'react'

import type { AutoCareApiOffer, AutoCareApiProvider, AutoCareApiServiceDefinition } from '@/entities/automotive-service'
import { routePaths } from '@/shared/constants/routes'

import { EditOfferButton, OwnerOfferDialog } from './OwnerOfferEditor'

type OwnerBranchServicesProps = {
    provider: AutoCareApiProvider
    definitions: AutoCareApiServiceDefinition[]
    locale: string
    labels: {
        branchServices: string
        address: string
        hours: string
        reviews: string
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
    }
    isOpen: boolean
    onToggle: () => void
}

export function OwnerBranchServices({ provider, definitions, locale, labels, isOpen, onToggle }: OwnerBranchServicesProps) {
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
                    <Link to={routePaths.ownerAutoCareProviderReviews(provider.id)} className="inline-flex items-center gap-1 text-status-warning-foreground hover:text-primary hover:underline"><Star className="size-3.5 fill-current" />{provider.rating.toFixed(1)} ({provider.reviewCount} {labels.reviews})</Link>
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
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
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

function ServiceOfferCard({ providerId, offer, definitions, locale, labels }: { providerId: string; offer: AutoCareApiOffer; definitions: AutoCareApiServiceDefinition[]; locale: string; labels: OwnerBranchServicesProps['labels'] }) {
    const [isEditing, setIsEditing] = useState(false)
    const definition = definitions.find((item) => item.id === offer.serviceDefinitionId || item.slug === offer.serviceSlug)
    const title = offer.serviceLabels?.[locale] ?? definition?.labels[locale] ?? offer.serviceLabels?.en ?? definition?.labels.en ?? offer.serviceSlug ?? 'AutoCare service'
    const price = new Intl.NumberFormat(locale === 'ru' ? 'ru-RU' : 'en-US', { style: 'currency', currency: offer.currencyCode, maximumFractionDigits: 0 }).format(offer.priceFromMinor / 100)

    return (
        <>
            <article className="rounded-[var(--radius-card)] border border-border bg-background p-4 transition hover:border-primary/40 hover:shadow-sm">
                <div className="flex items-start justify-between gap-3">
                    <span className="flex size-9 items-center justify-center rounded-[var(--radius-control)] bg-primary/10 text-primary"><Wrench className="size-4" /></span>
                    <span className="rounded-full bg-secondary px-2 py-1 text-[10px] font-black text-muted-foreground">{offer.priceType === 'quote_required' ? labels.estimate : labels.from}</span>
                </div>
                <div className="mt-4 flex items-start justify-between gap-3"><h3 className="text-sm font-black text-foreground">{title}</h3><EditOfferButton label={labels.edit} onClick={() => setIsEditing(true)} /></div>
                {offer.description ? <p className="mt-2 text-xs leading-5 text-muted-foreground">{offer.description}</p> : null}
                <p className="mt-2 text-lg font-black text-foreground">{offer.priceType === 'quote_required' ? labels.estimate : price}</p>
                <p className="mt-1 text-xs font-semibold text-muted-foreground">{offer.durationMinutes} min · {offer.warrantyText ?? '—'}</p>
            </article>
            <OwnerOfferDialog title={title} isOpen={isEditing} onOpenChange={setIsEditing} providerId={providerId} offer={offer} labels={labels} onCancel={() => setIsEditing(false)} onSaved={() => setIsEditing(false)} />
        </>
    )
}
