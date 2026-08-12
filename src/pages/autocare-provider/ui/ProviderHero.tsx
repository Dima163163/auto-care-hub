import {
    ArrowLeft,
    BadgeCheck,
    CalendarDays,
    Clock3,
    MapPin,
    MessageCircle,
    Star,
} from 'lucide-react'
import { Link } from 'react-router'

import type { ProviderProfile } from '@/entities/automotive-service'
import { ROUTES, routePaths } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'
import { AutoCareImage } from '@/shared/ui/autocare-image'

type ProviderHeroProps = {
    provider: ProviderProfile
}

export function ProviderHero({ provider }: ProviderHeroProps) {
    const { t } = useTranslation()

    return (
        <section className="relative isolate overflow-hidden bg-hero-overlay text-primary-foreground">
            <AutoCareImage src={provider.image} alt="" loading="eager" className="absolute inset-0 h-full w-full object-cover opacity-35" />
            <div className="absolute inset-0 bg-gradient-to-r from-hero-overlay via-hero-overlay/92 to-hero-overlay/45" aria-hidden="true" />
            <div className="relative mx-auto max-w-[var(--layout-operational-max)] px-[var(--layout-gutter)] py-5 sm:py-7 lg:py-9">
                <Link to={ROUTES.serviceDiscovery} className="inline-flex items-center gap-2 text-xs font-bold text-primary-foreground/75 transition hover:text-primary-foreground">
                    <ArrowLeft className="size-3.5" />
                    {t('autocare.providerBackToResults')}
                </Link>
                <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(330px,0.6fr)] lg:items-end">
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            {provider.verified && <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-control)] bg-status-success-surface px-3 py-1.5 text-xs font-black text-status-success-foreground"><BadgeCheck className="size-3.5" />{t('autocare.trustedBadge')}</span>}
                            <span className="text-xs font-semibold text-primary-foreground/65">{t('autocare.providerProfile')}</span>
                        </div>
                        <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">{provider.name}</h1>
                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold text-primary-foreground/85">
                            <span className="inline-flex items-center gap-1.5 text-rating-fill"><Star className="size-4 fill-rating-fill" />{provider.rating} <span className="text-primary-foreground/75">{t('autocare.reviews', { count: provider.reviewCount })}</span></span>
                            <span className="inline-flex items-center gap-1.5"><MapPin className="size-4" />{provider.address}</span>
                            <span className="inline-flex items-center gap-1.5"><Clock3 className="size-4" />{provider.hours}</span>
                        </div>
                        <div className="mt-6 flex flex-wrap gap-3">
                            <Link to={routePaths.serviceRequest(provider.id)} className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-control)] bg-primary px-4 text-sm font-black text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90"><CalendarDays className="size-4" />{t('autocare.bookAction')}</Link>
                            <a href="#request" className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-control)] border border-primary-foreground/25 bg-primary-foreground/10 px-4 text-sm font-black text-primary-foreground transition hover:bg-primary-foreground/15"><MessageCircle className="size-4" />{t('autocare.messageAction')}</a>
                        </div>
                    </div>
                    <ProviderPhotoPreview provider={provider} />
                </div>
                <div className="mt-6 grid max-w-3xl grid-cols-2 gap-2 sm:grid-cols-4">
                    <HeroStat value={provider.yearsActive} label={t('autocare.providerYears', { count: provider.yearsActive })} />
                    <HeroStat value={provider.staffCount} label={t('autocare.providerStaff', { count: provider.staffCount })} />
                    <HeroStat value="12 мес." label={t('autocare.providerWarranty')} />
                    <HeroStat value="✓" label={t('autocare.providerDirectPayment')} />
                </div>
            </div>
        </section>
    )
}

function ProviderPhotoPreview({ provider }: ProviderHeroProps) {
    const { t } = useTranslation()
    const galleryImages = [
        provider.image,
        '/images/autocare/providers/generated/service-oil-change.png',
        '/images/autocare/providers/generated/service-diagnostics.png',
        '/images/autocare/providers/generated/service-detailing.png',
    ]

    return (
        <div className="grid min-h-52 grid-cols-[minmax(0,1fr)_5.5rem] gap-1 overflow-hidden rounded-[var(--radius-panel)] border border-primary-foreground/20 bg-primary-foreground/10 p-1 shadow-2xl shadow-black/20">
            <div className="relative overflow-hidden rounded-[calc(var(--radius-panel)-0.25rem)]">
                <AutoCareImage src={galleryImages[0]} alt="" loading="eager" className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-hero-overlay/90 via-transparent to-transparent" aria-hidden="true" />
                <div className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-2 text-[11px] font-black">
                    <span className="rounded-[var(--radius-control)] bg-hero-overlay/85 px-2.5 py-1.5">{t('autocare.providerServices')}</span>
                    <span className="rounded-[var(--radius-control)] bg-hero-overlay/85 px-2.5 py-1.5">{t('autocare.reviews', { count: provider.reviewCount })}</span>
                </div>
            </div>
            <div className="grid grid-rows-3 gap-1">
                {galleryImages.slice(1).map((image, index) => <div key={image} className="overflow-hidden rounded-[var(--radius-card)] border border-primary-foreground/15"><AutoCareImage src={image} alt="" loading={index === 0 ? 'eager' : 'lazy'} className="h-full w-full object-cover" /></div>)}
            </div>
        </div>
    )
}

function HeroStat({ label, value }: { label: string; value: string | number }) {
    return <div className="rounded-[var(--radius-card)] border border-primary-foreground/15 bg-primary-foreground/10 px-3 py-3"><strong className="block text-lg font-black">{value}</strong><span className="mt-1 block text-[11px] font-semibold leading-4 text-primary-foreground/70">{label}</span></div>
}
