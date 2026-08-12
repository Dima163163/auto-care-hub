import { Check } from 'lucide-react'
import { Link } from 'react-router'

import { ROUTES } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'

import { ServiceCategoryGrid } from './ServiceCategoryGrid'

const locations = [
    { title: 'Центр Москвы', count: '1 248 автосервисов', image: '/images/autocare/locations/center.webp' },
    { title: 'Северо-Запад', count: '892 автосервиса', image: '/images/autocare/locations/north-west.webp' },
    { title: 'Юго-Запад', count: '756 автосервисов', image: '/images/autocare/locations/south-west.webp' },
    { title: 'Восток Москвы', count: '645 автосервисов', image: '/images/autocare/locations/east.webp' },
] as const

export function HomeDiscoveryGrid() {
    return (
        <section className="mx-auto grid max-w-[var(--layout-public-max)] gap-4 px-[var(--layout-gutter)] pb-7 lg:grid-cols-[1.05fr_0.97fr_1.05fr]">
            <ServiceCategoryGrid />
            <LocationCard />
            <PartnerCard />
        </section>
    )
}

function LocationCard() {
    const { t } = useTranslation()
    return (
        <section className="h-full rounded-[10px] bg-card p-5">
            <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-black">{t('autocare.exploreLocations')}</h2><Link to={ROUTES.serviceDiscovery} className="text-xs font-semibold text-primary">{t('autocare.viewOnMap')}</Link></div>
            <div className="mt-4 grid gap-2">
                {locations.map((location) => <Link key={location.title} to={ROUTES.serviceDiscovery} className="group flex items-center gap-3"><img src={location.image} alt="" className="h-[52px] w-[73px] rounded-[7px] object-cover" /><span><strong className="block text-sm group-hover:text-primary">{location.title}</strong><span className="mt-0.5 block text-xs text-muted-foreground">{location.count}</span></span></Link>)}
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
