import { BadgeCheck, ChevronRight, MapPin, Pencil, Star } from 'lucide-react'
import { Link } from 'react-router'

import { ProviderLogo } from '@/entities/automotive-service'
import { routePaths } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'

const providers = [
    { id: 'proservice-moscow', name: 'ProService', logoUrl: '/images/autocare/providers/logos/proservice.svg', rating: 4.7, reviews: 256, distance: '2,1 км', address: 'ул. Льва Толстого, 18', price: '2 900 ₽', oldPrice: '3 500 ₽', discount: '-17%', next: 'Сегодня, 14:30', tag: 'best' },
    { id: 'autolux-moscow', name: 'АвтоЛюкс', logoUrl: '/images/autocare/providers/logos/autolux.svg', rating: 4.9, reviews: 412, distance: '3,4 км', address: 'Комсомольский пр-т, 45', price: '3 200 ₽', next: 'Сегодня, 15:00', tag: 'rating' },
    { id: 'formula-moscow', name: 'Формула Движения', logoUrl: null, rating: 4.6, reviews: 189, distance: '4,2 км', address: 'ул. Плющиха, 10', price: '2 800 ₽', oldPrice: '3 200 ₽', discount: '-13%', next: 'Сегодня, 16:00' },
    { id: 'turbo-tech-moscow', name: 'Turbo Tech', logoUrl: null, rating: 4.5, reviews: 132, distance: '5,1 км', address: 'Ленинский пр-т, 68', price: '3 500 ₽', next: 'Завтра, 09:00' },
] as const

export function ProviderPreviewSection() {
    const { t } = useTranslation()
    const resultsRoute = routePaths.serviceDiscovery({ service: 'brakes', market: 'ru-moscow', radius: 10 })

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
                    <label className="mb-1 flex items-center gap-3 whitespace-nowrap text-sm text-muted-foreground">{t('autocare.sortLabel')}:<select className="h-10 rounded-[7px] border border-border bg-card px-4 text-sm text-foreground"><option>{t('autocare.recommendedSort')}</option></select></label>
                </div>
                <div className="mt-5 grid gap-4 lg:grid-cols-4">
                    {providers.map((provider, index) => <ProviderCard key={provider.id} provider={provider} index={index} />)}
                </div>
                <button type="button" className="absolute -right-1 top-[55%] hidden size-12 items-center justify-center rounded-full border border-border bg-card text-primary shadow-lg lg:flex" aria-label="Следующие сервисы"><ChevronRight className="size-7" /></button>
            </div>
        </section>
    )
}

function ProviderCard({ provider, index }: { provider: typeof providers[number]; index: number }) {
    const { t } = useTranslation()

    return (
        <article className="relative flex min-h-[352px] flex-col rounded-[9px] border border-border bg-card px-4 pb-4 pt-5">
            {'tag' in provider ? <span className={`absolute left-3 top-0 -translate-y-1/2 rounded px-2 py-1 text-[0.68rem] font-semibold ${provider.tag === 'best' ? 'bg-status-success-surface text-status-success-foreground' : 'bg-status-warning-surface text-status-warning-foreground'}`}>{provider.tag === 'best' ? t('autocare.bestValue') : t('autocare.highestRating')}</span> : null}
            <div className="flex items-center gap-2">
                <ProviderLogo logoUrl={provider.logoUrl} name={provider.name} className="size-6" />
                <h3 className="text-[1.02rem] font-black">{provider.name}</h3>
                {index < 2 ? <BadgeCheck className="size-4 fill-primary text-primary-foreground" /> : null}
            </div>
            <p className="mt-3 flex items-center gap-1 text-sm"><strong className="text-rating-foreground">{provider.rating}</strong>{Array.from({ length: 5 }).map((_, star) => <Star key={star} className="size-3.5 fill-rating-fill text-rating-fill" />)}<span className="ml-1 text-xs text-muted-foreground">({t('autocare.reviews', { count: provider.reviews })})</span></p>
            <p className="mt-3 flex items-center gap-2 text-xs font-medium text-muted-foreground"><MapPin className="size-3.5" />{provider.distance}<span>·</span>{provider.address}</p>
            <p className="mt-6 flex items-center gap-2 text-lg font-black">{t('autocare.fromPrice', { price: provider.price })}{'oldPrice' in provider ? <><span className="text-xs font-medium text-muted-foreground line-through">{provider.oldPrice}</span><span className="rounded bg-status-danger-surface px-1.5 py-1 text-xs text-status-danger-foreground">{provider.discount}</span></> : null}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t('autocare.partsIncluded')}</p>
            <p className="mt-5 text-xs text-muted-foreground">{t('autocare.nearestBooking')}</p>
            <p className="mt-1 text-base font-black">{provider.next}</p>
            <Link to={routePaths.serviceProviderDetails(provider.id)} className="mt-auto flex h-[42px] items-center justify-center rounded-[6px] bg-primary text-sm font-bold text-primary-foreground">{t('autocare.bookAction')}</Link>
            <Link to={routePaths.serviceProviderDetails(provider.id)} className="mt-3 text-center text-xs font-semibold text-primary">{t('autocare.detailsAction')}</Link>
        </article>
    )
}
