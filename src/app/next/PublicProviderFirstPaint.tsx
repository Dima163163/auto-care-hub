import { automotiveAmenities, automotiveServices, getAutomotiveAmenityLabel, getServiceLabel } from '@/entities/automotive-service'
import type { AutoCareApiOffer, AutoCareApiProviderProfile } from '@/entities/automotive-service'
import { formatCurrency } from '@/shared/lib/locale-format'

type PublicProviderFirstPaintProps = {
    profile: AutoCareApiProviderProfile
    locale: 'en' | 'ru'
    selectedServiceId?: string
}

export function PublicProviderFirstPaint({ profile, locale, selectedServiceId }: PublicProviderFirstPaintProps) {
    const selectedOffer = profile.offers.find((offer) => getOfferServiceId(offer) === selectedServiceId) ?? profile.offers[0]
    const labels = locale === 'ru'
        ? { back: 'К сравнению сервисов', services: 'Услуги и цены', about: 'О сервисе', location: 'Адрес и часы', reviews: 'Отзывы клиентов', availability: 'Запись по запросу', book: 'Выбрать и записаться', priceFrom: 'от', quote: 'Цена по запросу', verified: 'Проверенный сервис', noReviews: 'Пока нет отзывов', publishedOffers: 'Опубликованные услуги сервиса', trust: 'Профиль сервиса', publicPhone: 'Телефон' }
        : { back: 'Back to comparison', services: 'Services and prices', about: 'About', location: 'Location and hours', reviews: 'Customer reviews', availability: 'Available on request', book: 'Choose and book', priceFrom: 'from', quote: 'Price on request', verified: 'Verified service', noReviews: 'No reviews yet', publishedOffers: 'Published service offers', trust: 'Service profile', publicPhone: 'Phone' }

    return <>
        <section className="relative isolate overflow-hidden bg-hero-overlay text-primary-foreground">
            {profile.coverImageUrl && <img src={profile.coverImageUrl} alt="" aria-hidden="true" fetchPriority="high" className="absolute inset-0 h-full w-full object-cover opacity-45" />}
            <div className="absolute inset-0 bg-gradient-to-r from-hero-overlay via-hero-overlay/86 to-hero-overlay/30" aria-hidden="true" />
            <div className="relative mx-auto max-w-[var(--layout-public-wide-max)] px-[var(--layout-public-gutter)] py-4 sm:py-5">
                <a href="/services" className="inline-flex items-center gap-2 text-xs font-bold text-primary-foreground/70 hover:text-primary-foreground">← {labels.back}</a>
                <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,0.92fr)_minmax(380px,0.64fr)] lg:items-center">
                    <div className="flex min-w-0 items-start gap-4">
                        {profile.logoUrl && <img src={profile.logoUrl} alt="" className="size-16 shrink-0 rounded-[var(--radius-card)] bg-card object-contain p-2" />}
                        <div className="min-w-0">
                            {profile.verified && <span className="inline-flex rounded-[var(--radius-control)] bg-status-success-surface px-2.5 py-1 text-xs font-black text-status-success-foreground">{labels.verified}</span>}
                            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{profile.name}</h1>
                            {profile.reviewCount > 0 && <p className="mt-2 text-sm font-black text-rating-fill">★ {profile.rating} <span className="font-semibold text-primary-foreground/75">({profile.reviewCount})</span></p>}
                            <div className="mt-3 grid gap-2 text-sm font-semibold text-primary-foreground/85"><span>{profile.location.address}</span><span>{profile.location.hours}</span></div>
                        </div>
                    </div>
                    <div className="hidden min-h-32 rounded-[var(--radius-panel)] border border-primary-foreground/15 bg-primary-foreground/5 p-5 lg:block" aria-hidden="true" />
                </div>
            </div>
        </section>
        <nav aria-label={labels.services} className="border-b border-border bg-card shadow-sm">
            <div className="mx-auto flex max-w-[var(--layout-public-wide-max)] gap-1 overflow-x-auto px-[var(--layout-public-gutter)] py-2">
                {[labels.services, labels.about, labels.location, labels.reviews].map((label, index) => <a key={label} href={['#services', '#about', '#location', '#reviews'][index]} className="inline-flex shrink-0 items-center rounded-[var(--radius-control)] px-3 py-2 text-xs font-black text-muted-foreground hover:bg-secondary hover:text-primary">{label}</a>)}
            </div>
        </nav>
        <main className="mx-auto grid max-w-[var(--layout-public-wide-max)] gap-6 px-[var(--layout-public-gutter)] py-7 sm:py-10 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.42fr)]">
            <div className="grid content-start gap-6">
                <section id="services" className="overflow-hidden rounded-[var(--radius-panel)] border border-border bg-card shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4 sm:px-6"><h2 className="text-xl font-black tracking-tight text-foreground">{labels.services}</h2><span className="rounded-[var(--radius-control)] bg-secondary px-3 py-1.5 text-xs font-bold text-muted-foreground">{profile.offers.length}</span></div>
                    <div className="divide-y divide-border px-5 sm:px-6">{profile.offers.map((offer) => <article key={offer.id} className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_7rem_9rem] sm:items-center">
                        <div className="min-w-0"><h3 className="text-sm font-black text-foreground">{getOfferLabel(offer, locale)}</h3>{offer.inclusions.length > 0 && <p className="mt-1.5 text-xs font-semibold text-muted-foreground">{offer.inclusions.slice(0, 2).join(' · ')}</p>}</div>
                        <strong className="text-sm font-black text-foreground">{formatOfferPrice(offer, locale, labels.priceFrom, labels.quote)}</strong>
                        <span className="text-xs font-bold text-status-success-foreground">{labels.availability}</span>
                    </article>)}</div>
                </section>
                <section id="about" className="grid gap-4 sm:grid-cols-2">
                    <article className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black tracking-tight text-foreground">{labels.about}</h2>{profile.verified && <span className="rounded-[var(--radius-control)] bg-status-success-surface px-2.5 py-1 text-xs font-bold text-status-success-foreground">{labels.verified}</span>}</div><p className="mt-4 text-sm font-medium leading-6 text-muted-foreground">{profile.description?.trim() || labels.publishedOffers}</p>{profile.warrantyText && <p className="mt-3 text-xs font-semibold text-status-success-foreground">✓ {profile.warrantyText}</p>}</article>
                    <article id="trust" className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm"><h2 className="text-xl font-black tracking-tight text-foreground">{labels.trust}</h2><div className="mt-4 grid grid-cols-2 gap-2">{profile.amenityIds.map((amenityId) => automotiveAmenities.find((amenity) => amenity.id === amenityId)).filter((amenity) => amenity !== undefined).slice(0, 8).map((amenity) => <span key={amenity.id} className="rounded-[var(--radius-control)] bg-secondary px-2.5 py-2 text-xs font-semibold text-muted-foreground">{getAutomotiveAmenityLabel(amenity, locale)}</span>)}</div></article>
                </section>
                <section id="location" className="grid gap-4 overflow-hidden rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm sm:grid-cols-[minmax(0,0.72fr)_minmax(0,1fr)]"><div><h2 className="text-xl font-black tracking-tight text-foreground">{labels.location}</h2><div className="mt-4 grid gap-3 text-sm font-semibold text-muted-foreground"><p>{profile.location.address}</p><p>{profile.location.hours}</p>{profile.phones.map((phone) => <p key={phone}>{labels.publicPhone}: {phone}</p>)}{profile.email && <p>{profile.email}</p>}</div></div><div className="min-h-36 rounded-[var(--radius-card)] bg-secondary/60" aria-hidden="true" /></section>
                <section id="reviews" className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm"><h2 className="text-xl font-black tracking-tight text-foreground">{labels.reviews}</h2>{profile.reviewCount > 0 ? <p className="mt-3 text-sm font-semibold text-muted-foreground">★ {profile.rating} · {profile.reviewCount}</p> : <p className="mt-3 text-sm text-muted-foreground">{labels.noReviews}</p>}</section>
            </div>
            <aside className="h-fit rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm">
                <h2 className="text-lg font-black text-foreground">{labels.book}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{selectedOffer ? getOfferLabel(selectedOffer, locale) : profile.name}</p>
                {selectedOffer && <p className="mt-2 text-xl font-black text-foreground">{formatOfferPrice(selectedOffer, locale, labels.priceFrom, labels.quote)}</p>}
                <a href={`/services/${encodeURIComponent(profile.id)}/request?service=${encodeURIComponent(selectedOffer ? getOfferServiceId(selectedOffer) : '')}&market=${encodeURIComponent(profile.location.marketId)}`} className="mt-4 inline-flex min-h-10 items-center justify-center rounded-[var(--radius-control)] bg-primary px-4 text-sm font-black text-primary-foreground">{labels.book}</a>
            </aside>
        </main>
    </>
}

function getOfferServiceId(offer: AutoCareApiOffer) {
    return offer.serviceSlug ?? offer.serviceDefinitionId
}

function getOfferLabel(offer: AutoCareApiOffer, locale: 'en' | 'ru') {
    const localized = offer.serviceLabels?.[locale]?.trim()
    if (localized) return localized
    const service = automotiveServices.find((item) => item.id === getOfferServiceId(offer))
    return service ? getServiceLabel(service, locale) : getOfferServiceId(offer)
}

function formatOfferPrice(offer: AutoCareApiOffer, locale: 'en' | 'ru', fromLabel: string, quoteLabel: string) {
    if (offer.priceType === 'quote_required') return quoteLabel
    const from = formatCurrency(offer.priceFromMinor / 100, offer.currencyCode, locale)
    if (offer.priceType === 'fixed') return from
    if (offer.priceType === 'range' && offer.priceToMinor !== null) {
        return `${from}–${formatCurrency(offer.priceToMinor / 100, offer.currencyCode, locale)}`
    }
    return `${fromLabel} ${from}`
}
