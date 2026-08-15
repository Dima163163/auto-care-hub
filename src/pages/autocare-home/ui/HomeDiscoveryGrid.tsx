import { Check } from 'lucide-react'
import { Link } from 'react-router'

import { useGetAutoCareLocationZonesQuery, useGetAutoCareMarketsQuery } from '@/entities/automotive-service'
import { ROUTES, routePaths } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'
import { Skeleton } from '@/components/ui/skeleton'

import { ServiceCategoryGrid } from './ServiceCategoryGrid'

export function HomeDiscoveryGrid({ marketId }: { marketId: string }) {
    return (
        <section className="mx-auto grid max-w-[var(--layout-public-max)] gap-4 px-[var(--layout-gutter)] pb-7 lg:grid-cols-[1.05fr_0.97fr_1.05fr]">
            <ServiceCategoryGrid />
            <LocationCard marketId={marketId} />
            <PartnerCard />
        </section>
    )
}

function LocationCard({ marketId }: { marketId: string }) {
    const { t, locale } = useTranslation()
    const { data: markets = [], isLoading: isMarketsLoading } = useGetAutoCareMarketsQuery()
    const selectedMarket = markets.find((market) => market.cityCode === marketId || market.id === marketId)
    const apiMarketId = selectedMarket?.id ?? marketId
    const routeMarket = selectedMarket?.cityCode ?? marketId
    const { data: zones = [], isLoading, isError } = useGetAutoCareLocationZonesQuery({ marketId: apiMarketId, limit: 4 }, { skip: !apiMarketId || isMarketsLoading })
    const getZoneName = (names: Record<string, string>) => names[locale] ?? names[locale.split('-')[0] ?? ''] ?? names.en ?? names.ru ?? Object.values(names)[0] ?? ''
    const countLabel = (count: number) => {
        if (!locale.startsWith('ru')) return `${count.toLocaleString(locale)} services`
        const mod10 = count % 10
        const mod100 = count % 100
        const noun = mod10 === 1 && mod100 !== 11
            ? 'автосервис'
            : mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)
                ? 'автосервиса'
                : 'автосервисов'
        return `${count.toLocaleString(locale)} ${noun}`
    }
    return (
        <section className="h-full rounded-[10px] bg-card p-5">
            <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-black">{t('autocare.exploreLocations')}</h2><Link to={routePaths.serviceDiscovery({ market: routeMarket })} className="text-xs font-semibold text-primary">{t('autocare.viewOnMap')}</Link></div>
            <div className="mt-4 grid gap-2">
                {(isMarketsLoading || isLoading) && [1, 2, 3, 4].map((item) => <div key={item} className="flex h-[52px] items-center gap-3" aria-hidden="true"><Skeleton className="h-[52px] w-[73px] rounded-[7px]" /><div className="grid flex-1 gap-2"><Skeleton className="h-3.5 w-3/5" /><Skeleton className="h-3 w-2/5" /></div></div>)}
                {!isMarketsLoading && !isLoading && !isError && zones.map((zone) => <Link key={zone.id} to={routePaths.serviceDiscovery({ market: routeMarket, zone: zone.id })} className="group flex items-center gap-3"><img src={zone.imageUrl ?? '/images/autocare/locations/center.webp'} alt="" className="h-[52px] w-[73px] rounded-[7px] object-cover" /><span><strong className="block text-sm group-hover:text-primary">{getZoneName(zone.names)}</strong><span className="mt-0.5 block text-xs text-muted-foreground">{countLabel(zone.serviceCount)}</span></span></Link>)}
                {!isLoading && (isError || zones.length === 0) && <p className="py-4 text-sm text-muted-foreground">{t('autocare.noLocations')}</p>}
            </div>
        </section>
    )
}

function PartnerCard() {
    const { t } = useTranslation()
    return (
        <section className="relative min-h-[334px] overflow-hidden rounded-[10px] bg-hero-overlay px-6 py-5 text-primary-foreground">
            <img src="/images/autocare/partner-handshake.webp" alt="" className="absolute inset-0 h-full w-full object-cover object-[64%_center]" />
            <div className="absolute inset-0 bg-gradient-to-r from-hero-overlay via-hero-overlay/85 to-hero-overlay/20" />
            <div className="relative max-w-[18rem]"><h2 className="text-xl font-black">{t('autocare.partnerTitle')}</h2><p className="mt-3 text-sm leading-6 text-primary-foreground/85">{t('autocare.partnerDescription')}</p><ul className="mt-5 grid gap-3 text-sm font-semibold">{[t('autocare.partnerBenefitClients'), t('autocare.partnerBenefitControl'), t('autocare.partnerBenefitAnalytics')].map((item) => <li key={item} className="flex items-center gap-3"><Check className="size-5 text-map-marker-success" />{item}</li>)}</ul><Link to={ROUTES.owners} className="mt-6 inline-flex h-12 items-center rounded-[7px] bg-primary px-7 text-base font-bold">{t('autocare.partnerAction')}</Link></div>
        </section>
    )
}
