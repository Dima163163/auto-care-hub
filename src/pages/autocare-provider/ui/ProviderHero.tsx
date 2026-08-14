import {
    ArrowLeft,
    BadgeCheck,
    CalendarDays,
    Clock3,
    MapPin,
    MessageCircle,
    Star,
    UsersRound,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { ProviderLogo, type ProviderProfile } from '@/entities/automotive-service'
import { ROUTES, routePaths } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'
import { AutoCareImage } from '@/shared/ui/autocare-image'

import { ProviderGallery } from './ProviderGallery'

type ProviderHeroProps = { provider: ProviderProfile }

export function ProviderHero({ provider }: ProviderHeroProps) {
    const { t } = useTranslation()

    return (
        <section className="relative isolate overflow-hidden bg-hero-overlay text-primary-foreground">
            <AutoCareImage src={provider.image} alt="" loading="eager" className="absolute inset-0 h-full w-full object-cover opacity-45" />
            <div className="absolute inset-0 bg-gradient-to-r from-hero-overlay via-hero-overlay/86 to-hero-overlay/30" aria-hidden="true" />
            <div className="relative mx-auto max-w-[var(--layout-operational-max)] px-[var(--layout-gutter)] py-4 sm:py-5">
                <Link to={ROUTES.serviceDiscovery} className="inline-flex items-center gap-2 text-xs font-bold text-primary-foreground/65 transition hover:text-primary-foreground"><ArrowLeft className="size-3.5" />{t('autocare.providerBackToResults')}</Link>
                <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,0.92fr)_minmax(380px,0.64fr)] lg:items-center">
                    <div className="min-w-0">
                        <div className="flex items-start gap-4">
                            <ProviderMark provider={provider} />
                            <div className="min-w-0">
                                {provider.verified && <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-control)] bg-status-success-surface px-2.5 py-1 text-xs font-black text-status-success-foreground"><BadgeCheck className="size-3.5" />{t('autocare.trustedBadge')}</span>}
                                <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{provider.name}</h1>
                                <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-black text-rating-fill"><Star className="size-4 fill-rating-fill" />{provider.rating} <span className="font-semibold text-primary-foreground/75">{t('autocare.reviews', { count: provider.reviewCount })}</span></p>
                                <div className="mt-3 grid gap-2 text-sm font-semibold text-primary-foreground/85"><span className="inline-flex items-center gap-2"><MapPin className="size-4" />{provider.address}</span><span className="inline-flex items-center gap-2"><Clock3 className="size-4" />{provider.hours}</span></div>
                            </div>
                        </div>
                        <div className="mt-5 flex flex-wrap gap-3">
                            <Link to={routePaths.serviceRequest(provider.id)} className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-control)] bg-primary px-4 text-sm font-black text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90"><CalendarDays className="size-4" />{t('autocare.bookAction')}</Link>
                            <Link to={`${ROUTES.chats}?providerId=${encodeURIComponent(provider.id)}`} className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-control)] border border-primary-foreground/30 bg-primary-foreground/10 px-4 text-sm font-black text-primary-foreground transition hover:bg-primary-foreground/15"><MessageCircle className="size-4" />{t('autocare.messageAction')}</Link>
                        </div>
                        <div className="mt-5 flex flex-wrap gap-x-7 gap-y-3 border-t border-primary-foreground/20 pt-4 text-xs font-bold text-primary-foreground/80"><HeroFact icon={<CalendarDays className="size-4" />} label={t('autocare.providerYears', { count: provider.yearsActive })} /><HeroFact icon={<UsersRound className="size-4" />} label={t('autocare.providerStaff', { count: provider.staffCount })} /><HeroFact icon={<BadgeCheck className="size-4" />} label={t('autocare.providerWarranty')} /></div>
                    </div>
                    <ProviderGallery provider={provider} />
                </div>
            </div>
        </section>
    )
}

function ProviderMark({ provider }: ProviderHeroProps) {
    return <div className="flex size-18 shrink-0 items-center justify-center rounded-[var(--radius-card)] bg-card p-2 text-center text-base font-black tracking-tight text-foreground shadow-lg"><ProviderLogo logoUrl={provider.logoUrl} name={provider.name} className="size-full" /></div>
}

function HeroFact({ icon, label }: { icon: ReactNode; label: string }) {
    return <span className="inline-flex items-center gap-2">{icon}{label}</span>
}
