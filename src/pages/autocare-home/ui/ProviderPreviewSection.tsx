import { useMemo, useState } from 'react'
import { BadgeCheck, ChevronDown, ChevronLeft, ChevronRight, MapPin, Pencil, Star } from 'lucide-react'
import { Link } from 'react-router'

import { mapAutoCareDiscoveryItem, ProviderLogo, providerPreviews, type ProviderPreview, useGetAutoCareDiscoveryQuery } from '@/entities/automotive-service'
import { IS_MOCK_API } from '@/shared/config/api'
import { routePaths } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'

type HomeSort = 'recommended' | 'price_asc' | 'rating_desc' | 'distance_asc'

type HomeProvider = {
    id: string
    name: string
    logoUrl: string | null
    rating: number
    reviews: number
    distance: string
    distanceKm: number
    address: string
    price: string
    priceValue: number
    oldPrice?: string
    discount?: string
    next: string
    tag?: 'best' | 'rating'
    verified: boolean
}

const featuredProviders: readonly HomeProvider[] = [
    { id: 'proservice-moscow', name: 'ProService', logoUrl: '/images/autocare/providers/logos/proservice.svg', rating: 4.7, reviews: 256, distance: '2,1 км', distanceKm: 2.1, address: 'ул. Льва Толстого, 18', price: '2 900 ₽', priceValue: 2900, oldPrice: '3 500 ₽', discount: '-17%', next: 'Сегодня, 14:30', tag: 'best', verified: true },
    { id: 'autolux-moscow', name: 'АвтоЛюкс', logoUrl: '/images/autocare/providers/logos/autolux.svg', rating: 4.9, reviews: 412, distance: '3,4 км', distanceKm: 3.4, address: 'Комсомольский пр-т, 45', price: '3 200 ₽', priceValue: 3200, next: 'Сегодня, 15:00', tag: 'rating', verified: true },
    { id: 'formula-moscow', name: 'Формула Движения', logoUrl: null, rating: 4.6, reviews: 189, distance: '4,2 км', distanceKm: 4.2, address: 'ул. Плющиха, 10', price: '2 800 ₽', priceValue: 2800, oldPrice: '3 200 ₽', discount: '-13%', next: 'Сегодня, 16:00', verified: false },
    { id: 'turbo-tech-moscow', name: 'Turbo Tech', logoUrl: null, rating: 4.5, reviews: 132, distance: '5,1 км', distanceKm: 5.1, address: 'Ленинский пр-т, 68', price: '3 500 ₽', priceValue: 3500, next: 'Завтра, 09:00', verified: false },
]

function formatPrice(price: number) {
    return `${price.toLocaleString('ru-RU')} ₽`
}

function formatSlot(slot: string) {
    return slot.replace(/^Today, /, 'Сегодня, ').replace(/^Tomorrow, /, 'Завтра, ')
}

function toHomeProvider(provider: ProviderPreview): HomeProvider {
    const distanceKm = Number.parseFloat(provider.distance)
    return {
        id: provider.id,
        name: provider.name,
        logoUrl: provider.logoUrl ?? null,
        rating: provider.rating,
        reviews: provider.reviewCount,
        distance: provider.distance.replace(' km', ' км').replace('.', ','),
        distanceKm: Number.isFinite(distanceKm) ? distanceKm : Number.MAX_SAFE_INTEGER,
        address: provider.address?.replace(/^Москва,\s*/, '') ?? 'ул. Автомобильная',
        price: formatPrice(provider.price),
        priceValue: provider.price,
        next: formatSlot(provider.nextSlot),
        verified: provider.verified,
    }
}

const providers: readonly HomeProvider[] = [
    ...featuredProviders,
    ...providerPreviews.slice(3, 15).map(toHomeProvider),
]

function sortProviders(items: readonly HomeProvider[], sort: HomeSort) {
    return [...items].sort((left, right) => {
        if (sort === 'price_asc') return left.priceValue - right.priceValue
        if (sort === 'rating_desc') return right.rating - left.rating
        if (sort === 'distance_asc') return left.distanceKm - right.distanceKm
        return 0
    })
}

export function ProviderPreviewSection() {
    const { t } = useTranslation()
    const resultsRoute = routePaths.serviceDiscovery({ service: 'brakes', market: 'ru-moscow', radius: 10 })
    const [sort, setSort] = useState<HomeSort>('recommended')
    const [page, setPage] = useState(0)
    const discovery = useGetAutoCareDiscoveryQuery({ serviceId: 'brakes', marketId: 'ru-moscow', radiusKm: 10, limit: 16 })
    const pageSize = 4
    const remoteProviders = useMemo(() => discovery.data?.items.map(mapAutoCareDiscoveryItem) ?? [], [discovery.data])
    const sourceProviders = IS_MOCK_API ? providers : remoteProviders.map(toHomeProvider)
    const sortedProviders = useMemo(() => sortProviders(sourceProviders, sort), [sort, sourceProviders])
    const pageCount = Math.ceil(sortedProviders.length / pageSize)
    const visibleProviders = sortedProviders.slice(page * pageSize, page * pageSize + pageSize)

    const handleSortChange = (value: HomeSort) => {
        setSort(value)
        setPage(0)
    }

    const showPreviousPage = () => setPage((current) => Math.max(current - 1, 0))
    const showNextPage = () => setPage((current) => Math.min(current + 1, pageCount - 1))
    const isFirstPage = page === 0
    const isLastPage = page >= pageCount - 1

    return (
        <section className="py-[22px]">
            <div className="relative mx-auto max-w-[var(--layout-public-max)] px-[var(--layout-gutter)]">
                <div className="flex items-end justify-between gap-6">
                    <div>
                        <h2 className="text-[1.5rem] font-black tracking-[-0.025em]">{t('autocare.compareHomeTitle')}</h2>
                        <p className="mt-2 text-sm text-muted-foreground">
                            {t('autocare.compareHomeDescription')}
                            <Link to={resultsRoute} className="ml-5 inline-flex items-center gap-2 font-semibold text-primary"><Pencil className="size-4" />{t('autocare.changeSearch')}</Link>
                        </p>
                    </div>
                    <label className="relative mb-1 flex items-center gap-3 whitespace-nowrap text-sm text-muted-foreground">
                        {t('autocare.sortLabel')}:
                        <select value={sort} onChange={(event) => handleSortChange(event.target.value as HomeSort)} aria-label={t('autocare.sortLabel')} className="select-with-icon h-10 appearance-none rounded-[7px] border border-border bg-card px-4 pr-9 text-sm text-foreground">
                            <option value="recommended">{t('autocare.recommendedSort')}</option>
                            <option value="price_asc">{t('autocare.priceSort')}</option>
                            <option value="rating_desc">{t('autocare.ratingSort')}</option>
                            <option value="distance_asc">{t('autocare.distanceSort')}</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                    </label>
                </div>
                <div className="mt-5 grid gap-4 lg:grid-cols-4">
                    {visibleProviders.map((provider) => <ProviderCard key={provider.id} provider={provider} />)}
                </div>
                {!isFirstPage ? <button type="button" onClick={showPreviousPage} className="absolute -left-1 top-[55%] hidden size-12 cursor-pointer items-center justify-center rounded-full border border-border bg-card text-primary shadow-lg transition hover:bg-primary hover:text-primary-foreground lg:flex" aria-label={t('common.back')}>
                    <ChevronLeft className="size-7" />
                </button> : null}
                {!isLastPage ? <button type="button" onClick={showNextPage} className="absolute -right-1 top-[55%] hidden size-12 cursor-pointer items-center justify-center rounded-full border border-border bg-card text-primary shadow-lg transition hover:bg-primary hover:text-primary-foreground lg:flex" aria-label={t('autocare.nextPage')}>
                    <ChevronRight className="size-7" />
                </button> : null}
            </div>
        </section>
    )
}

function ProviderCard({ provider }: { provider: HomeProvider }) {
    const { t } = useTranslation()

    return (
        <article className="relative flex min-h-[352px] flex-col rounded-[9px] border border-border bg-card px-4 pb-4 pt-5">
            {provider.tag ? <span className={`absolute left-3 top-0 -translate-y-1/2 rounded px-2 py-1 text-[0.68rem] font-semibold ${provider.tag === 'best' ? 'bg-status-success-surface text-status-success-foreground' : 'bg-status-warning-surface text-status-warning-foreground'}`}>{provider.tag === 'best' ? t('autocare.bestValue') : t('autocare.highestRating')}</span> : null}
            <div className="flex items-center gap-2">
                <ProviderLogo logoUrl={provider.logoUrl} name={provider.name} className="size-6" />
                <h3 className="text-[1.02rem] font-black">{provider.name}</h3>
                {provider.verified ? <BadgeCheck className="size-4 fill-primary text-primary-foreground" /> : null}
            </div>
            <p className="mt-3 flex items-center gap-1 text-sm"><strong className="text-rating-foreground">{provider.rating}</strong>{Array.from({ length: 5 }).map((_, star) => <Star key={star} className="size-3.5 fill-rating-fill text-rating-fill" />)}<span className="ml-1 text-xs text-muted-foreground">({t('autocare.reviews', { count: provider.reviews })})</span></p>
            <p className="mt-3 flex items-center gap-2 text-xs font-medium text-muted-foreground"><MapPin className="size-3.5" />{provider.distance}<span>·</span>{provider.address}</p>
            <p className="mt-6 flex items-center gap-2 text-lg font-black">{t('autocare.fromPrice', { price: provider.price })}{provider.oldPrice ? <><span className="text-xs font-medium text-muted-foreground line-through">{provider.oldPrice}</span><span className="rounded bg-status-danger-surface px-1.5 py-1 text-xs text-status-danger-foreground">{provider.discount}</span></> : null}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t('autocare.partsIncluded')}</p>
            <p className="mt-5 text-xs text-muted-foreground">{t('autocare.nearestBooking')}</p>
            <p className="mt-1 text-base font-black">{provider.next}</p>
            <Link to={routePaths.serviceProviderDetails(provider.id)} className="mt-auto flex h-[42px] items-center justify-center rounded-[6px] bg-primary text-sm font-bold text-primary-foreground">{t('autocare.bookAction')}</Link>
            <Link to={routePaths.serviceProviderDetails(provider.id)} className="mt-3 text-center text-xs font-semibold text-primary">{t('autocare.detailsAction')}</Link>
        </article>
    )
}
