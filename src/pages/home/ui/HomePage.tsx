import type { FormEvent } from 'react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import {
    ArrowRight,
    BadgeCheck,
    Bookmark,
    CalendarDays,
    ChevronDown,
    Clock3,
    Grid2X2,
    ExternalLink,
    Headphones,
    Heart,
    LifeBuoy,
    List,
    Map,
    MapPin,
    MessageCircle,
    Search,
    ShieldCheck,
    SlidersHorizontal,
    Star,
} from 'lucide-react'

import { ROUTES, routePaths } from '@/shared/constants/routes'
import { useFavorites } from '@/features/favorites'
import { useGetMeQuery } from '@/features/auth'
import { buttonVariants } from '@/components/ui/button-variants'
import { useTranslation } from '@/shared/lib/useTranslation'
import { ResilientImage } from '@/shared/ui/resilient-image'
import { Footer } from '@/widgets/footer'
import { useGetCabinetsQuery } from '@/entities/cabinet'
import type { Cabinet } from '@/entities/cabinet'
import { formatCurrency } from '@/shared/lib/formatCurrency'
import { getLocalDateInputValue } from '@/shared/lib/getLocalDateInputValue'
import { getMediaUrl } from '@/shared/lib/getMediaUrl'
import { getCabinetImageSources } from '@/shared/lib/getCabinetImageSources'
import type { CabinetPreview } from '../model/homePagePreviewData'
import type { TranslationKey } from '@/shared/lib/i18n'
import type { LucideIcon } from 'lucide-react'
import { AvailabilitySearch } from '@/widgets/availability-search'
import {
    cabinets,
    featureCards,
} from '../model/homePagePreviewData'
import { getPreferenceShortcutPath } from '../model/get-preference-shortcut-path'
import { useRecordClientExperimentEventMutation } from '@/features/experiments/api/clientExperimentApi'

type DesktopGuide = {
    icon: LucideIcon
    titleKey: TranslationKey
    textKey: TranslationKey
    to: string
}

const desktopGuideCards: DesktopGuide[] = [
    { icon: CalendarDays, titleKey: 'landing.guideBookingTitle', textKey: 'landing.guideBookingText', to: ROUTES.features },
    { icon: Search, titleKey: 'landing.guideSearchTitle', textKey: 'landing.guideSearchText', to: ROUTES.cabinets },
    { icon: BadgeCheck, titleKey: 'landing.guideOwnerTitle', textKey: 'landing.guideOwnerText', to: ROUTES.owners },
    { icon: ShieldCheck, titleKey: 'landing.guideSafetyTitle', textKey: 'landing.guideSafetyText', to: ROUTES.privacy },
    { icon: MessageCircle, titleKey: 'landing.guideRulesTitle', textKey: 'landing.guideRulesText', to: ROUTES.rules },
]

function DesktopHeroBackground() {
    const { t } = useTranslation()

    return (
        <div className="absolute inset-0">
            <ResilientImage
                src="/images/cabinets/cabinet-beauty-bright-01.webp"
                alt={t('landing.desktopHeroImageAlt')}
                className="h-full w-full object-cover"
                width={1920}
                height={720}
                loading="eager"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-hero-overlay/80 via-hero-overlay/35 to-hero-overlay/10" aria-hidden="true" />
        </div>
    )
}

function HeroSection() {
    const { t } = useTranslation()

    return (
        <section className="relative isolate min-h-[430px] overflow-hidden">
            <DesktopHeroBackground />
            <div className="relative mx-auto flex min-h-[430px] max-w-[1280px] items-end px-8 pb-10 pt-12 xl:px-10">
                <div className="w-full">
                    <div className="max-w-[570px] text-primary-foreground">
                        <p className="text-sm font-black uppercase tracking-[0.16em] text-primary-foreground/80">
                            {t('landing.eyebrow')}
                        </p>
                        <h1 className="mt-3 text-5xl font-black leading-none tracking-tight">
                            AutoCare Hub
                        </h1>
                        <p className="mt-5 max-w-[540px] text-lg font-semibold leading-7 text-primary-foreground/90">
                            {t('landing.desktopHeroDescription')}
                        </p>
                    </div>

                    <AvailabilitySearch variant="hero" />
                </div>
            </div>
        </section>
    )
}

function DesktopAvailabilityRail() {
    const { t } = useTranslation()
    const searchPath = routePaths.cabinets({
        date: getLocalDateInputValue(),
        availableToday: true,
    })
    const slots = [
        ['09:00', '12'],
        ['10:00', '18'],
        ['11:00', '22'],
        ['12:00', '20'],
        ['13:00', '24'],
        ['14:00', '19'],
        ['15:00', '16'],
        ['16:00', '14'],
    ]

    return (
        <section className="relative z-10 mx-auto -mt-6 max-w-[1240px] px-8" aria-label={t('landing.desktopAvailabilityTitle')}>
            <div className="grid items-center gap-3 rounded-xl border border-border bg-card/95 p-4 shadow-lg shadow-foreground/5 backdrop-blur xl:grid-cols-[190px_minmax(0,1fr)_44px]">
                <div>
                    <p className="text-sm font-black text-foreground ">
                        {t('landing.desktopAvailabilityTitle')}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-muted-foreground ">
                        {t('landing.desktopAvailabilityCount')}
                    </p>
                </div>
                <div className="grid grid-cols-4 gap-2 md:grid-cols-8">
                    {slots.map(([time, count]) => (
                        <span key={time} className="rounded-lg border border-border bg-background px-2 py-2 text-center  dark:bg-background">
                            <span className="block text-xs font-black text-foreground ">{time}</span>
                            <span className="mt-1 block text-xs font-bold text-status-success-foreground">{count} {t('landing.desktopAvailableShort')}</span>
                        </span>
                    ))}
                </div>
                <Link
                    to={searchPath}
                    className="flex size-11 items-center justify-center rounded-lg border border-border text-primary transition hover:border-primary hover:bg-primary/5  dark:hover:bg-card/5"
                    aria-label={t('landing.viewAllCabinets')}
                >
                    <ArrowRight className="size-4" />
                </Link>
            </div>
        </section>
    )
}

function FeatureStrip() {
    const { t } = useTranslation()

    return (
        <section className="mx-auto max-w-[1240px] px-8 py-8">
            <div className="grid gap-5 rounded-xl border border-border bg-card p-5  dark:bg-card xl:grid-cols-[1.15fr_repeat(4,1fr)]">
                <div>
                    <h2 className="text-lg font-black text-foreground ">{t('landing.desktopSpacesTitle')}</h2>
                    <p className="mt-2 max-w-[220px] text-xs font-medium leading-5 text-muted-foreground ">{t('landing.desktopSpacesText')}</p>
                </div>
                {featureCards.map(({ icon: Icon, titleKey, textKey }) => (
                    <div key={titleKey} className="border-l border-border pl-5 ">
                        <Icon className="size-5 text-primary text-primary" />
                        <h3 className="mt-3 text-sm font-extrabold text-foreground ">{t(titleKey)}</h3>
                        <p className="mt-2 text-xs font-medium leading-5 text-muted-foreground ">{t(textKey)}</p>
                    </div>
                ))}
            </div>
        </section>
    )
}

function PreferenceShortcut({ to }: { to: string }) {
    const { t } = useTranslation()
    const [recordExperiment] = useRecordClientExperimentEventMutation()

    const recordEvent = (event: 'preference_shortcut_used' | 'preference_shortcut_reset') => {
        void recordExperiment({ event }).unwrap().catch(() => undefined)
    }

    return (
        <section className="mx-auto max-w-[1240px] px-4 py-4 lg:px-8" aria-labelledby="home-preference-shortcut-title">
            <div className="flex flex-col gap-4 rounded-xl border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="flex min-w-0 items-start gap-3">
                    <SlidersHorizontal className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                    <div className="min-w-0">
                        <h2 id="home-preference-shortcut-title" className="font-semibold">{t('landing.preferenceShortcutTitle')}</h2>
                        <p className="mt-1 text-sm text-muted-foreground">{t('landing.preferenceShortcutDescription')}</p>
                    </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                    <Link to={to} className={buttonVariants({ className: 'min-h-11' })} onClick={() => recordEvent('preference_shortcut_used')}>
                        {t('landing.preferenceShortcutAction')}
                        <ArrowRight className="ml-2 size-4" aria-hidden="true" />
                    </Link>
                    <Link to={ROUTES.cabinets} className={buttonVariants({ variant: 'outline', className: 'min-h-11' })} onClick={() => recordEvent('preference_shortcut_reset')}>
                        {t('landing.preferenceShortcutReset')}
                    </Link>
                </div>
            </div>
        </section>
    )
}


function DesktopCabinetResult({ cabinet }: { cabinet: CabinetPreview }) {
    const { t } = useTranslation()
    const { isFavorite, toggleFavorite } = useFavorites()
    const cabinetTo = cabinet.id ? routePaths.cabinetDetails(cabinet.id) : routePaths.cabinets({ search: cabinet.search })
    const isSaved = isFavorite(cabinet.favoriteId)
    const imageSources = getCabinetImageSources(cabinet.image, cabinet.photoAssets)
    const title = cabinet.title ?? (cabinet.titleKey ? t(cabinet.titleKey) : '')
    const area = cabinet.area ?? (cabinet.areaKey ? t(cabinet.areaKey) : '')

    return (
        <article className="grid gap-5 border-b border-border py-4 first:pt-0 last:border-b-0 last:pb-0  md:grid-cols-[220px_minmax(0,1fr)_150px]">
            <div className="relative h-28 overflow-hidden rounded-lg bg-muted">
                <ResilientImage
                    src={imageSources.src ?? cabinet.image}
                    srcSet={imageSources.srcSet}
                    alt={title}
                    className="h-full w-full object-cover"
                    width={640}
                    height={480}
                    sizes="220px"
                    loading="lazy"
                />
                <button
                    type="button"
                    onClick={() => toggleFavorite({
                        id: cabinet.favoriteId,
                        title,
                        area,
                        price: `${cabinet.price} / ${t('landing.perHour')}`,
                        image: cabinet.image,
                        to: cabinetTo,
                    })}
                    className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full bg-card shadow-sm"
                    aria-label={isSaved ? t('favorites.remove') : t('landing.favoriteCabinet')}
                    aria-pressed={isSaved}
                >
                    <Heart className={`size-4 ${isSaved ? 'fill-current text-destructive' : 'text-muted-foreground'}`} />
                </button>
            </div>
            <div className="min-w-0 py-1">
                <span className="inline-flex rounded-full bg-status-success-surface px-2 py-1 text-xs font-extrabold text-status-success-foreground">
                    {t('landing.desktopAvailableToday')}
                </span>
                <h3 className="mt-2 truncate text-lg font-black text-foreground ">{title}</h3>
                <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold text-muted-foreground ">
                    <span className="flex items-center gap-1.5"><MapPin className="size-3.5" />{area}</span>
                    <span className="flex items-center gap-1.5"><BadgeCheck className="size-3.5" />{t('landing.desktopResultCategory')}</span>
                    <span className="flex items-center gap-1.5"><Star className="size-3.5 fill-rating-foreground text-rating-foreground" />{cabinet.rating}</span>
                </div>
            </div>
            <div className="flex flex-row items-center justify-between gap-3 md:flex-col md:items-stretch md:justify-center">
                <p className="text-lg font-black text-foreground ">
                    {cabinet.price} <span className="text-xs font-bold text-muted-foreground ">/ {t('landing.perHour')}</span>
                </p>
                <Link to={cabinetTo} className="flex h-10 items-center justify-center rounded-md bg-primary px-4 text-xs font-extrabold text-primary-foreground shadow-lg shadow-primary/15 hover:bg-primary/90">
                    {t('landing.viewDetails')}
                </Link>
                <button type="button" onClick={() => toggleFavorite({ id: cabinet.favoriteId, title, area, price: `${cabinet.price} / ${t('landing.perHour')}`, image: cabinet.image, to: cabinetTo })} className="hidden h-9 items-center justify-center gap-2 rounded-md border border-border text-xs font-extrabold text-foreground hover:border-primary hover:text-primary md:flex  ">
                    <Bookmark className="size-3.5" />
                    {isSaved ? t('favorites.remove') : t('landing.saveCabinet')}
                </button>
            </div>
        </article>
    )
}

function PopularCabinetsDesktop({ popularCabinets }: { popularCabinets: CabinetPreview[] }) {
    const { t } = useTranslation()

    return (
        <section className="mx-auto max-w-[1240px] px-8 py-8">
            <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-primary text-primary">{t('landing.desktopResultsEyebrow')}</p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight text-foreground ">{t('landing.desktopResultsTitle')}</h2>
                </div>
                <Link to={ROUTES.cabinets} className="flex shrink-0 items-center gap-2 text-[13px] font-extrabold text-primary text-primary">
                    {t('landing.viewAllCabinets')}
                    <ArrowRight className="size-4" />
                </Link>
            </div>
            <div className="rounded-xl border border-border bg-card p-5  dark:bg-card">
                {popularCabinets.slice(0, 3).map((cabinet) => <DesktopCabinetResult key={cabinet.favoriteId} cabinet={cabinet} />)}
            </div>
        </section>
    )
}

function CtaSection() {
    const { t } = useTranslation()

    return (
        <section className="mx-auto max-w-[1240px] px-8 py-8">
            <div className="mb-6">
                <h2 className="text-3xl font-black tracking-tight text-foreground ">{t('landing.desktopGuidesTitle')}</h2>
                <p className="mt-2 max-w-[650px] text-base font-medium leading-7 text-muted-foreground ">{t('landing.desktopGuidesText')}</p>
            </div>
            <div className="grid gap-4 xl:grid-cols-5">
                {desktopGuideCards.map(({ icon: Icon, titleKey, textKey, to }) => (
                    <Link key={titleKey} to={to} className="group flex min-h-[165px] flex-col rounded-xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-lg shadow-primary/10  dark:bg-card">
                        <Icon className="size-8 text-primary text-primary" />
                        <h3 className="mt-6 text-sm font-black text-foreground group-hover:text-primary">{t(titleKey)}</h3>
                        <p className="mt-2 text-xs font-medium leading-5 text-muted-foreground ">{t(textKey)}</p>
                        <ArrowRight className="mt-auto size-4 self-end text-foreground transition group-hover:translate-x-1 group-hover:text-primary " />
                    </Link>
                ))}
            </div>

            <div className="mt-5 grid gap-5 xl:grid-cols-2">
                <article className="rounded-xl border border-border bg-card p-6  dark:bg-card">
                    <h3 className="text-xl font-black text-foreground ">{t('landing.desktopClientGuideTitle')}</h3>
                    <p className="mt-2 text-sm font-medium text-muted-foreground ">{t('landing.desktopClientGuideText')}</p>
                    <ol className="mt-5 space-y-3 text-sm font-semibold text-foreground ">
                        {['landing.desktopClientStepOne', 'landing.desktopClientStepTwo', 'landing.desktopClientStepThree'].map((key, index) => (
                            <li key={key} className="flex items-center gap-3"><span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-black text-primary">{index + 1}</span>{t(key as TranslationKey)}</li>
                        ))}
                    </ol>
                    <Link to={ROUTES.features} className="mt-6 inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-xs font-extrabold text-primary hover:border-primary  text-primary"><ExternalLink className="size-3.5" />{t('landing.desktopClientAction')}</Link>
                </article>
                <article className="rounded-xl border border-border bg-card p-6  dark:bg-card">
                    <h3 className="text-xl font-black text-foreground ">{t('landing.desktopOwnerGuideTitle')}</h3>
                    <p className="mt-2 text-sm font-medium text-muted-foreground ">{t('landing.desktopOwnerGuideText')}</p>
                    <ol className="mt-5 space-y-3 text-sm font-semibold text-foreground ">
                        {['landing.desktopOwnerStepOne', 'landing.desktopOwnerStepTwo', 'landing.desktopOwnerStepThree'].map((key, index) => (
                            <li key={key} className="flex items-center gap-3"><span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-status-success-surface text-xs font-black text-status-success-foreground">{index + 1}</span>{t(key as TranslationKey)}</li>
                        ))}
                    </ol>
                    <Link to={ROUTES.owners} className="mt-6 inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-xs font-extrabold text-primary hover:border-primary  text-primary"><ExternalLink className="size-3.5" />{t('landing.desktopOwnerAction')}</Link>
                </article>
            </div>
        </section>
    )
}

function StatsSection() {
    const { t } = useTranslation()

    return (
        <section className="mx-auto max-w-[1240px] px-8 pb-10">
            <div className="grid gap-5 rounded-xl border border-border bg-primary/5 p-6  dark:bg-card/5 xl:grid-cols-[1fr_1fr]">
                <div className="flex items-start gap-4">
                    <LifeBuoy className="mt-1 size-9 text-primary" />
                    <div>
                        <h2 className="text-lg font-black text-foreground ">{t('landing.desktopHelpTitle')}</h2>
                        <p className="mt-2 text-sm font-medium leading-6 text-muted-foreground ">{t('landing.desktopHelpText')}</p>
                        <Link to={ROUTES.help} className="mt-4 inline-flex items-center gap-2 text-sm font-extrabold text-primary text-primary">{t('landing.footerHelpCenter')} <ArrowRight className="size-4" /></Link>
                    </div>
                </div>
                <div className="flex items-start gap-4 border-t border-border pt-5  xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0">
                    <ShieldCheck className="mt-1 size-9 text-status-success-foreground" />
                    <div>
                        <h2 className="text-lg font-black text-foreground ">{t('landing.desktopTrustTitle')}</h2>
                        <p className="mt-2 text-sm font-medium leading-6 text-muted-foreground ">{t('landing.desktopTrustText')}</p>
                        <Link to={ROUTES.privacy} className="mt-4 inline-flex items-center gap-2 text-sm font-extrabold text-primary text-primary">{t('landing.footerPrivacy')} <ArrowRight className="size-4" /></Link>
                    </div>
                </div>
            </div>
        </section>
    )
}

function DesktopFooter() {
    return <Footer desktopOnly />
}

function TabletAvailabilityRail() {
    const { t } = useTranslation()
    const searchPath = routePaths.cabinets({ date: getLocalDateInputValue(), availableToday: true })
    const slots = [
        ['09:00', '12'],
        ['10:00', '18'],
        ['11:00', '22'],
        ['12:00', '20'],
        ['13:00', '24'],
        ['14:00', '19'],
        ['15:00', '16'],
        ['16:00', '14'],
    ]

    return (
        <section className="mx-auto mt-5 max-w-[1240px]" aria-label={t('landing.desktopAvailabilityTitle')}>
            <div className="grid gap-3 rounded-xl border border-border bg-card p-4 shadow-sm  dark:bg-card lg:grid-cols-[180px_minmax(0,1fr)_44px]">
                <div className="flex items-center justify-between gap-3 lg:block">
                    <p className="text-sm font-black text-foreground ">{t('landing.desktopAvailabilityTitle')}</p>
                    <p className="text-xs font-semibold text-muted-foreground ">{t('landing.desktopAvailabilityCount')}</p>
                </div>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                    {slots.map(([time, count]) => (
                        <span key={time} className="rounded-lg border border-border bg-background px-1.5 py-2 text-center  dark:bg-background">
                            <span className="block text-xs font-black text-foreground ">{time}</span>
                            <span className="mt-1 block text-xs font-bold text-status-success-foreground">{count} {t('landing.desktopAvailableShort')}</span>
                        </span>
                    ))}
                </div>
                <Link to={searchPath} className="hidden size-11 items-center justify-center rounded-lg border border-border text-primary transition hover:border-primary hover:bg-primary/5 lg:flex  dark:hover:bg-card/5" aria-label={t('landing.viewAllCabinets')}>
                    <ArrowRight className="size-4" />
                </Link>
            </div>
        </section>
    )
}

function TabletGuideSection() {
    const { t } = useTranslation()

    return (
        <section className="mx-auto mt-5 max-w-[1240px]">
            <div className="rounded-xl border border-border bg-card p-5  dark:bg-card">
                <h2 className="text-lg font-black text-foreground ">{t('landing.desktopGuidesTitle')}</h2>
                <p className="mt-1 text-sm font-medium text-muted-foreground ">{t('landing.desktopGuidesText')}</p>
                <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-5">
                    {desktopGuideCards.map(({ icon: Icon, titleKey, textKey, to }) => (
                        <Link key={titleKey} to={to} className="group flex min-h-[132px] flex-col rounded-lg border border-border bg-background p-4 transition hover:border-primary/50 hover:bg-primary/5  dark:bg-background dark:hover:bg-card/5">
                            <Icon className="size-6 text-primary text-primary" />
                            <h3 className="mt-4 text-xs font-black text-foreground group-hover:text-primary">{t(titleKey)}</h3>
                            <p className="mt-1 text-xs font-medium leading-4 text-muted-foreground ">{t(textKey)}</p>
                            <ArrowRight className="mt-auto size-4 self-end text-foreground " />
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    )
}

function TabletStepsSection() {
    const { t } = useTranslation()
    const clientSteps = ['landing.desktopClientStepOne', 'landing.desktopClientStepTwo', 'landing.desktopClientStepThree']
    const ownerSteps = ['landing.desktopOwnerStepOne', 'landing.desktopOwnerStepTwo', 'landing.desktopOwnerStepThree']

    return (
        <section className="mx-auto mt-5 grid max-w-[1240px] gap-4 md:grid-cols-2">
            <article className="rounded-xl border border-border bg-card p-5  dark:bg-card">
                <h2 className="text-base font-black text-foreground ">{t('landing.desktopClientGuideTitle')}</h2>
                <p className="mt-1 text-xs font-medium text-muted-foreground ">{t('landing.desktopClientGuideText')}</p>
                <ol className="mt-5 grid grid-cols-3 gap-3">
                    {clientSteps.map((key, index) => (
                        <li key={key} className="text-xs font-semibold text-foreground ">
                            <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-black text-primary">{index + 1}</span>
                            <span className="mt-3 block leading-5">{t(key as TranslationKey)}</span>
                        </li>
                    ))}
                </ol>
            </article>
            <article className="rounded-xl border border-border bg-card p-5  dark:bg-card">
                <h2 className="text-base font-black text-foreground ">{t('landing.desktopOwnerGuideTitle')}</h2>
                <p className="mt-1 text-xs font-medium text-muted-foreground ">{t('landing.desktopOwnerGuideText')}</p>
                <ol className="mt-5 grid grid-cols-3 gap-3">
                    {ownerSteps.map((key, index) => (
                        <li key={key} className="text-xs font-semibold text-foreground ">
                            <span className="flex size-7 items-center justify-center rounded-full bg-status-success-surface text-xs font-black text-status-success-foreground">{index + 1}</span>
                            <span className="mt-3 block leading-5">{t(key as TranslationKey)}</span>
                        </li>
                    ))}
                </ol>
            </article>
        </section>
    )
}

function TabletSupportStrip() {
    const { t } = useTranslation()

    return (
        <section className="mx-auto mt-5 max-w-[1240px]">
            <div className="grid gap-4 rounded-xl border border-border bg-card p-5  dark:bg-card md:grid-cols-2">
                <div className="flex items-center gap-4">
                    <LifeBuoy className="size-9 shrink-0 text-primary text-primary" />
                    <div className="min-w-0 flex-1">
                        <h2 className="text-sm font-black text-foreground ">{t('landing.desktopHelpTitle')}</h2>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground ">{t('landing.desktopHelpText')}</p>
                    </div>
                    <Link to={ROUTES.help} className="hidden shrink-0 rounded-md border border-border px-3 py-2 text-xs font-extrabold text-primary hover:border-primary sm:inline-flex  text-primary">{t('landing.footerHelpCenter')}</Link>
                </div>
                <div className="flex items-center gap-4 border-t border-border pt-4  md:border-l md:border-t-0 md:pl-5 md:pt-0">
                    <Headphones className="size-9 shrink-0 text-foreground " />
                    <div className="min-w-0 flex-1">
                        <h2 className="text-sm font-black text-foreground ">{t('info.help.contactSupportTitle')}</h2>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground ">{t('info.help.contactSupportDescription')}</p>
                    </div>
                    <a href="mailto:info@autocarehub.ru" className="hidden shrink-0 rounded-md border border-border px-3 py-2 text-xs font-extrabold text-primary hover:border-primary sm:inline-flex  text-primary">{t('info.help.contactAction')}</a>
                </div>
            </div>
        </section>
    )
}

function TabletHome({ popularCabinets, preferencePath }: { popularCabinets: CabinetPreview[]; preferencePath: string | null }) {
    const { t } = useTranslation()
    const navigate = useNavigate()

    return (
        <div className="hidden bg-background px-5 pb-10 pt-0 md:block xl:hidden">
            <section className="relative -mx-5 min-h-[300px] overflow-hidden">
                <ResilientImage
                    src="/images/cabinets/cabinet-massage-wellness-draft-01.webp"
                    alt={t('landing.desktopHeroImageAlt')}
                    className="absolute inset-0 size-full object-cover"
                    width={1440}
                    height={600}
                    loading="eager"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-hero-overlay/80 via-hero-overlay/35 to-hero-overlay/10" aria-hidden="true" />
                <div className="relative mx-auto flex min-h-[300px] max-w-[1240px] items-center px-6 py-10 lg:px-8">
                    <div className="max-w-[520px] text-primary-foreground">
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-primary-foreground/80">{t('landing.eyebrow')}</p>
                        <h1 className="mt-3 text-5xl font-black leading-none tracking-tight">AutoCare Hub</h1>
                        <p className="mt-4 text-base font-semibold leading-7 text-primary-foreground/90">{t('landing.desktopHeroDescription')}</p>
                    </div>
                </div>
            </section>

            <div className="relative z-10 mx-auto -mt-8 max-w-[1240px]">
                <AvailabilitySearch variant="tabletHero" />
            </div>

            <TabletAvailabilityRail />
            {preferencePath && <PreferenceShortcut to={preferencePath} />}

            <section className="mx-auto mt-6 max-w-[1240px]">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-baseline gap-3">
                        <p className="text-sm font-black text-foreground ">{t('landing.desktopResultsCount')}</p>
                        <span className="text-xs font-semibold text-muted-foreground ">{t('landing.desktopResultsEyebrow')}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <label className="flex h-10 items-center gap-2 rounded-md border border-border bg-card px-3 text-xs font-semibold text-muted-foreground  dark:bg-card ">
                            <span className="hidden sm:inline">{t('cabinet.publicList.sortBy')}:</span>
                            <select
                                defaultValue="popular"
                                aria-label={t('cabinet.publicList.sortBy')}
                                onChange={(event) => navigate(routePaths.cabinets({ sortBy: event.target.value }))}
                                className="bg-transparent font-extrabold text-foreground outline-none "
                            >
                                <option value="popular">{t('cabinet.publicList.sortPopular')}</option>
                                <option value="newest">{t('cabinet.publicList.sortNewest')}</option>
                                <option value="price-asc">{t('cabinet.publicList.sortPriceAsc')}</option>
                                <option value="price-desc">{t('cabinet.publicList.sortPriceDesc')}</option>
                            </select>
                        </label>
                        <button type="button" className="flex h-10 items-center gap-2 rounded-md border border-border bg-card px-3 text-xs font-extrabold text-primary  dark:bg-card">
                            <List className="size-4" />
                            {t('landing.desktopListLabel')}
                        </button>
                        <Link to={ROUTES.cabinets} className="flex h-10 items-center gap-2 rounded-md border border-border bg-card px-3 text-xs font-extrabold text-foreground  dark:bg-card ">
                            <Map className="size-4" />
                            {t('landing.desktopMapLabel')}
                        </Link>
                    </div>
                </div>
                <div className="rounded-xl border border-border bg-card p-5  dark:bg-card">
                    {popularCabinets.slice(0, 2).map((cabinet) => <DesktopCabinetResult key={cabinet.favoriteId} cabinet={cabinet} />)}
                </div>
            </section>

            <TabletGuideSection />
            <TabletStepsSection />
            <TabletSupportStrip />
            <Footer />
        </div>
    )
}

function DesktopHome({ popularCabinets, preferencePath }: { popularCabinets: CabinetPreview[]; preferencePath: string | null }) {
    return (
        <div className="hidden xl:block">
            <HeroSection />
            <DesktopAvailabilityRail />
            <FeatureStrip />
            {preferencePath && <PreferenceShortcut to={preferencePath} />}
            <PopularCabinetsDesktop popularCabinets={popularCabinets} />
            <CtaSection />
            <StatsSection />
            <DesktopFooter />
        </div>
    )
}

function MobileAvailabilitySearch() {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const today = getLocalDateInputValue()
    const [city, setCity] = useState('')
    const [service, setService] = useState('')
    const [date, setDate] = useState(today)
    const [duration, setDuration] = useState('60')

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        navigate(routePaths.cabinets({
            city,
            service,
            date,
            duration,
            availableToday: date === today,
        }))
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="mt-6 overflow-hidden rounded-xl border border-border bg-card shadow-lg shadow-foreground/5  dark:bg-card"
        >
            <label className="flex min-h-16 items-center gap-3 border-b border-border px-4 ">
                <MapPin className="size-6 shrink-0 text-foreground " aria-hidden="true" />
                <input
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                    placeholder={t('landing.mobileSearchCity')}
                    aria-label={t('landing.availabilityCityLabel')}
                    className="min-w-0 flex-1 bg-transparent text-base font-medium text-foreground outline-none placeholder:text-muted-foreground"
                />
                <ChevronDown className="size-5 shrink-0 text-foreground " aria-hidden="true" />
            </label>
            <label className="flex min-h-16 items-center gap-3 border-b border-border px-4 ">
                <Grid2X2 className="size-6 shrink-0 text-foreground " aria-hidden="true" />
                <input
                    value={service}
                    onChange={(event) => setService(event.target.value)}
                    placeholder={t('landing.mobileSearchService')}
                    aria-label={t('landing.availabilityServiceLabel')}
                    className="min-w-0 flex-1 bg-transparent text-base font-medium text-foreground outline-none placeholder:text-muted-foreground"
                />
                <ChevronDown className="size-5 shrink-0 text-foreground " aria-hidden="true" />
            </label>
            <label className="flex min-h-16 items-center gap-3 border-b border-border px-4 ">
                <CalendarDays className="size-6 shrink-0 text-foreground " aria-hidden="true" />
                <input
                    type="date"
                    min={today}
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                    aria-label={t('booking.date')}
                    className="min-w-0 flex-1 bg-transparent text-base font-medium text-foreground outline-none "
                />
                <ChevronDown className="size-5 shrink-0 text-foreground " aria-hidden="true" />
            </label>
            <label className="flex min-h-16 items-center gap-3 px-4">
                <Clock3 className="size-6 shrink-0 text-foreground " aria-hidden="true" />
                <select
                    value={duration}
                    onChange={(event) => setDuration(event.target.value)}
                    aria-label={t('landing.availabilityDurationLabel')}
                    className="min-w-0 flex-1 appearance-none bg-transparent text-base font-medium text-foreground outline-none "
                >
                    <option value="30">{t('service.form.durationMinutes', { count: 30 })}</option>
                    <option value="60">{t('service.form.durationMinutes', { count: 60 })}</option>
                    <option value="90">{t('service.form.durationMinutes', { count: 90 })}</option>
                    <option value="120">{t('service.form.durationMinutes', { count: 120 })}</option>
                </select>
                <ChevronDown className="size-5 shrink-0 text-foreground " aria-hidden="true" />
            </label>
            <button
                type="submit"
                className="mx-3 mb-3 flex h-14 w-[calc(100%-1.5rem)] items-center justify-center rounded-lg bg-primary text-lg font-extrabold text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90"
            >
                {t('landing.mobileSearchAction')}
            </button>
        </form>
    )
}

function MobileAvailabilityRail() {
    const { t } = useTranslation()
    const searchPath = routePaths.cabinets({
        date: getLocalDateInputValue(),
        availableToday: true,
    })
    const slots = [
        ['09:00', '12'],
        ['10:00', '18'],
        ['11:00', '22'],
        ['12:00', '20'],
        ['13:00', '24'],
        ['14:00', '19'],
    ]

    return (
        <section className="mt-8" aria-label={t('landing.mobileAvailableTitle')}>
            <div className="flex items-end justify-between gap-3">
                <div>
                    <h2 className="text-xl font-black tracking-tight">{t('landing.mobileAvailableTitle')}</h2>
                    <p className="mt-1 text-sm font-medium text-muted-foreground ">{t('landing.mobileAvailableCount')}</p>
                </div>
                <Link to={searchPath} className="shrink-0 text-sm font-bold text-primary text-primary">
                    {t('landing.mobileAvailableViewAll')}
                </Link>
            </div>
            <div className="-mx-4 mt-4 flex gap-3 overflow-x-auto px-4 pb-1 scrollbar-hide">
                {slots.map(([time, count]) => (
                    <Link
                        key={time}
                        to={searchPath}
                        className="flex min-w-[112px] shrink-0 flex-col items-center rounded-lg border border-border bg-card px-3 py-3 text-center  dark:bg-card"
                    >
                        <span className="text-lg font-medium text-foreground ">{time}</span>
                        <span className="mt-2 text-sm font-bold text-status-success-foreground">{count} {t('landing.desktopAvailableShort')}</span>
                    </Link>
                ))}
            </div>
        </section>
    )
}

function MobileCabinetResult({ cabinet }: { cabinet: CabinetPreview }) {
    const { t } = useTranslation()
    const cabinetTo = cabinet.id ? routePaths.cabinetDetails(cabinet.id) : routePaths.cabinets({ search: cabinet.search })
    const imageSources = getCabinetImageSources(cabinet.image, cabinet.photoAssets)
    const title = cabinet.title ?? (cabinet.titleKey ? t(cabinet.titleKey) : '')
    const area = cabinet.area ?? (cabinet.areaKey ? t(cabinet.areaKey) : '')

    return (
        <article className="grid grid-cols-[112px_minmax(0,1fr)] gap-3 rounded-xl border border-border bg-card p-3 shadow-sm  dark:bg-card">
            <div className="relative h-[154px] overflow-hidden rounded-lg bg-muted">
                <ResilientImage
                    src={imageSources.src ?? cabinet.image}
                    srcSet={imageSources.srcSet}
                    alt={title}
                    loading="lazy"
                    decoding="async"
                    width={640}
                    height={480}
                    sizes="112px"
                    className="h-full w-full object-cover"
                />
            </div>
            <div className="min-w-0 py-1">
                <span className="inline-flex items-center gap-1 rounded-md bg-status-success-surface px-2 py-1 text-xs font-bold text-status-success-foreground">
                    <BadgeCheck className="size-3.5" aria-hidden="true" />
                    {t('landing.mobileResultAvailable')}
                </span>
                <h3 className="mt-2 line-clamp-2 text-base font-black leading-5 text-foreground ">{title}</h3>
                <p className="mt-2 flex items-start gap-1.5 text-xs font-medium leading-5 text-muted-foreground ">
                    <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                    <span className="line-clamp-2">{area}</span>
                </p>
                <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground ">
                    <BadgeCheck className="size-3.5 shrink-0" aria-hidden="true" />
                    {t('landing.mobileResultCategory')}
                </p>
                <p className="mt-2 flex items-center gap-1.5 text-sm font-bold text-foreground ">
                    <Star className="size-4 fill-rating-foreground text-rating-foreground" aria-hidden="true" />
                    {cabinet.rating}
                </p>
                <div className="mt-3 flex items-end justify-between gap-2">
                    <p className="min-w-0 text-base font-black text-foreground ">
                        {cabinet.price}
                        <span className="block text-xs font-semibold text-muted-foreground ">/ {t('landing.perHour')}</span>
                    </p>
                    <Link to={cabinetTo} className="flex h-10 shrink-0 items-center justify-center rounded-md border border-primary px-3 text-xs font-extrabold text-primary transition hover:bg-primary/5 border-primary text-primary">
                        {t('landing.viewDetails')}
                    </Link>
                </div>
            </div>
        </article>
    )
}

function MobileGuideSection() {
    const { t } = useTranslation()

    return (
        <section className="mt-8 rounded-xl border border-border bg-card p-4  dark:bg-card">
            <h2 className="text-2xl font-black tracking-tight text-foreground ">{t('landing.mobileGuideTitle')}</h2>
            <p className="mt-2 text-sm font-medium leading-6 text-muted-foreground ">{t('landing.mobileGuideDescription')}</p>
            <div className="mt-5 grid gap-3">
                <Link to={ROUTES.features} className="group flex min-h-24 items-center gap-4 rounded-lg border border-border px-4 py-3 ">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/5 text-primary dark:bg-primary/10 text-primary">
                        <CalendarDays className="size-6" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="block text-sm font-black text-foreground ">{t('landing.mobileGuideBookingTitle')}</span>
                        <span className="mt-1 block text-xs leading-5 text-muted-foreground ">{t('landing.mobileGuideBookingText')}</span>
                    </span>
                    <ArrowRight className="size-5 shrink-0 text-foreground transition group-hover:translate-x-1 " aria-hidden="true" />
                </Link>
                <Link to={ROUTES.help} className="group flex min-h-24 items-center gap-4 rounded-lg border border-border px-4 py-3 ">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/5 text-primary dark:bg-primary/10 text-primary">
                        <Headphones className="size-6" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="block text-sm font-black text-foreground ">{t('landing.mobileGuideHelpTitle')}</span>
                        <span className="mt-1 block text-xs leading-5 text-muted-foreground ">{t('landing.mobileGuideHelpText')}</span>
                    </span>
                    <ArrowRight className="size-5 shrink-0 text-foreground transition group-hover:translate-x-1 " aria-hidden="true" />
                </Link>
            </div>
        </section>
    )
}

function MobileHome({ popularCabinets, preferencePath }: { popularCabinets: CabinetPreview[]; preferencePath: string | null }) {
    const { t } = useTranslation()

    return (
        <main className="min-h-screen overflow-hidden bg-background px-4 pb-24 pt-3 text-foreground md:hidden">
            <div className="mx-auto max-w-[430px]">
                <section className="pt-8">
                    <h1 className="max-w-[360px] text-[32px] font-black leading-[1.12] tracking-tight">
                        {t('landing.mobileHeroTitle')}
                    </h1>
                    <p className="mt-4 max-w-[350px] text-lg font-medium leading-7 text-muted-foreground ">
                        {t('landing.mobileHeroDescription')}
                    </p>
                    <MobileAvailabilitySearch />
                    {preferencePath && <PreferenceShortcut to={preferencePath} />}
                </section>

                <MobileAvailabilityRail />

                <section className="mt-9">
                    <div className="mb-4 flex items-end justify-between gap-3">
                        <div>
                            <h2 className="text-xl font-black tracking-tight">{t('landing.desktopResultsTitle')}</h2>
                            <p className="mt-1 text-sm font-medium text-muted-foreground ">{t('landing.desktopResultsCount')}</p>
                        </div>
                        <Link to={ROUTES.cabinets} className="shrink-0 text-sm font-bold text-primary text-primary">
                            {t('landing.mobileAvailableViewAll')}
                        </Link>
                    </div>
                    <div className="grid gap-3">
                        {popularCabinets.slice(0, 2).map((cabinet) => (
                            <MobileCabinetResult key={cabinet.favoriteId} cabinet={cabinet} />
                        ))}
                    </div>
                </section>

                <MobileGuideSection />
            </div>
        </main>
    )
}

export function HomePage() {
    const { data, isLoading, isError } = useGetCabinetsQuery({ sortBy: 'popular', page: 1, limit: 4 })
    const { data: currentUser } = useGetMeQuery()
    const preferencePath = getPreferenceShortcutPath(currentUser)
    const popularCabinets: CabinetPreview[] = data?.items.map((cabinet: Cabinet) => ({
        id: cabinet.id,
        title: cabinet.title,
        area: cabinet.city,
        rating: '★',
        price: formatCurrency(cabinet.pricePerHour),
        badgeKey: 'landing.popularBadge',
        badgeClass: 'bg-status-success-surface text-status-success-foreground',
        image: cabinet.photos[0] ? getMediaUrl(cabinet.photos[0]) : '/images/cabinets/cabinet-beauty-bright-01.webp',
        photoAssets: cabinet.photoAssets,
        search: cabinet.city,
        favoriteId: cabinet.id,
    })) ?? []
    const displayedCabinets = isLoading || isError || popularCabinets.length === 0 ? cabinets : popularCabinets

    return (
        <>
            <DesktopHome popularCabinets={displayedCabinets} preferencePath={preferencePath} />
            <TabletHome popularCabinets={displayedCabinets} preferencePath={preferencePath} />
            <MobileHome popularCabinets={displayedCabinets} preferencePath={preferencePath} />
        </>
    )
}
