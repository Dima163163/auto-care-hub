import { BadgeCheck, Heart, MapPin, MessageCircle, Star } from 'lucide-react'
import { Link } from 'react-router'

import { automotiveServices, getServiceLabel, providerPreviews, type ProviderPreview } from '@/entities/automotive-service'
import { useAutoCareFavorites } from '@/features/automotive-favorites'
import { ROUTES, routePaths } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'
import { formatCurrency } from '@/shared/lib/locale-format'
import { AutoCareImage } from '@/shared/ui/autocare-image'

export function FavoritesPage() {
    const { t, locale } = useTranslation()
    const { favoriteIds, favoriteProviders, toggle } = useAutoCareFavorites()
    const localProviders = providerPreviews.filter((provider) => favoriteIds.has(provider.id))
    const providers = [...favoriteProviders, ...localProviders.filter((provider) => !favoriteProviders.some((remote) => remote.id === provider.id))]

    return <main className="bg-background"><div className="mx-auto max-w-[var(--layout-public-max)] px-[var(--layout-gutter)] py-8 sm:py-12"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.14em] text-primary">{t('autocare.favoritesEyebrow')}</p><h1 className="mt-2 text-3xl font-black tracking-tight text-foreground sm:text-4xl">{t('autocare.favoritesTitle')}</h1><p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-muted-foreground">{t('autocare.favoritesDescription')}</p></div>{providers.length > 0 && <span className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-black text-primary">{providers.length}</span>}</div>{providers.length === 0 ? <EmptyFavorites /> : <div className="mt-8 grid gap-4 md:grid-cols-2">{providers.map((provider) => <FavoriteProviderCard key={provider.id} provider={provider} locale={locale} onRemove={() => toggle(provider.id)} />)}</div>}</div></main>
}

function EmptyFavorites() {
    const { t } = useTranslation()
    return <section className="mt-10 rounded-[var(--radius-panel)] border border-dashed border-border bg-card p-10 text-center shadow-sm"><span className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary"><Heart className="size-7" /></span><h2 className="mt-5 text-xl font-black text-foreground">{t('autocare.favoritesEmptyTitle')}</h2><p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-muted-foreground">{t('autocare.favoritesEmptyDescription')}</p><Link to={ROUTES.serviceDiscovery} className="mt-6 inline-flex h-11 items-center rounded-[var(--radius-control)] bg-primary px-5 text-sm font-black text-primary-foreground">{t('autocare.favoritesBrowse')}</Link></section>
}

function FavoriteProviderCard({ provider, locale, onRemove }: { provider: ProviderPreview; locale: string; onRemove: () => void }) {
    const { t } = useTranslation()
    const service = automotiveServices.find((candidate) => candidate.id === provider.serviceIds?.[0]) ?? automotiveServices[0]
    const price = formatCurrency(provider.price, provider.currency, locale)
    const priceLabel = provider.priceType === 'quote_required'
        ? t('autocare.quoteRequiredPrice')
        : provider.priceType === 'fixed'
            ? price
            : provider.priceType === 'range' && provider.priceTo
                ? `${price}–${formatCurrency(provider.priceTo, provider.currency, locale)}`
                : t('autocare.fromPrice', { price })
    return <article className="overflow-hidden rounded-[var(--radius-panel)] border border-border bg-card shadow-sm"><div className="grid gap-4 p-4 sm:grid-cols-[132px_minmax(0,1fr)]"><AutoCareImage src={provider.image} alt={provider.name} className="h-32 w-full rounded-[var(--radius-control)] object-cover sm:h-[132px]" /><div className="min-w-0"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="text-base font-black text-foreground">{provider.name}</h2>{provider.verified && <BadgeCheck className="size-4 text-primary" aria-label={t('autocare.trustedBadge')} />}</div><div className="mt-1 flex items-center gap-2 text-xs font-bold"><span className="inline-flex items-center gap-1 text-rating-foreground"><Star className="size-3.5 fill-current" />{provider.rating.toFixed(1)}</span><span className="text-muted-foreground">({provider.reviewCount})</span></div></div><button type="button" onClick={onRemove} aria-label={t('autocare.favoritesRemove')} className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] border border-status-danger-foreground/40 bg-status-danger-surface text-status-danger-foreground"><Heart className="size-4 fill-current" /></button></div><p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><MapPin className="size-3.5 text-primary" />{provider.distance} · {provider.address}</p><div className="mt-3 flex flex-wrap items-end justify-between gap-3"><div><p className="text-lg font-black text-foreground">{priceLabel}</p><p className="mt-1 text-xs font-medium text-muted-foreground">{getServiceLabel(service, locale)} · {provider.nextSlot}</p></div><div className="flex gap-2"><Link to={`${routePaths.serviceProviderDetails(provider.id)}#request`} className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-control)] border border-border px-3 text-xs font-black text-foreground"><MessageCircle className="size-3.5" />{t('autocare.messageAction')}</Link><Link to={routePaths.serviceProviderDetails(provider.id)} className="inline-flex h-9 items-center rounded-[var(--radius-control)] bg-primary px-3 text-xs font-black text-primary-foreground">{t('autocare.detailsAction')}</Link></div></div></div></div></article>
}
