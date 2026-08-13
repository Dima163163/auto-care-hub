import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import {
    ArrowRight,
    Building2,
    CalendarDays,
    CarFront,
    ChevronDown,
    Headphones,
    MessageCircle,
    Search,
    ShieldCheck,
    Star,
    Store,
    UserRound,
    WalletCards,
    UsersRound,
    X,
} from 'lucide-react'

import { ROUTES } from '@/shared/constants/routes'
import type { TranslationKey } from '@/shared/lib/i18n'
import { useTranslation } from '@/shared/lib/useTranslation'

type AudienceId = 'guest' | 'client' | 'owner'
type FaqCategory = 'search' | 'booking' | 'pricing' | 'messages' | 'reviews' | 'account' | 'safety' | 'travel'
type TopicId = 'search' | 'booking' | 'pricing' | 'messages' | 'reviews' | 'vehicle' | 'owner-services' | 'owner-requests' | 'owner-clients' | 'owner-growth'

const audienceFaqCategories: Record<AudienceId, readonly FaqCategory[]> = {
    guest: ['search', 'pricing', 'reviews', 'safety', 'travel'],
    client: ['search', 'booking', 'pricing', 'messages', 'reviews', 'account', 'safety', 'travel'],
    owner: ['search', 'pricing', 'messages', 'reviews', 'safety'],
}

function isAudienceId(value: string | null): value is AudienceId {
    return value === 'guest' || value === 'client' || value === 'owner'
}

function isFaqCategory(value: string | null): value is FaqCategory {
    return faqCategoryKeys.some(({ id }) => id === value)
}

function helpTopicPath(audience: AudienceId, category: FaqCategory) {
    const params = new URLSearchParams({ audience, category })
    return `${ROUTES.help}?${params.toString()}`
}

const faqCategoryKeys: Array<{ id: FaqCategory; labelKey: TranslationKey }> = [
    { id: 'search', labelKey: 'info.help.faqCategorySearch' },
    { id: 'booking', labelKey: 'info.help.faqCategoryBooking' },
    { id: 'pricing', labelKey: 'info.help.faqCategoryPricing' },
    { id: 'messages', labelKey: 'info.help.faqCategoryMessages' },
    { id: 'reviews', labelKey: 'info.help.faqCategoryReviews' },
    { id: 'account', labelKey: 'info.help.faqCategoryAccount' },
    { id: 'safety', labelKey: 'info.help.faqCategorySafety' },
    { id: 'travel', labelKey: 'info.help.faqCategoryTravel' },
]

const faqEntries: Array<{ category: FaqCategory; questionKey: TranslationKey; answerKey: TranslationKey }> = [
    { category: 'search', questionKey: 'info.help.faq1Question', answerKey: 'info.help.faq1Answer' },
    { category: 'search', questionKey: 'info.help.faq2Question', answerKey: 'info.help.faq2Answer' },
    { category: 'search', questionKey: 'info.help.faq3Question', answerKey: 'info.help.faq3Answer' },
    { category: 'booking', questionKey: 'info.help.faq4Question', answerKey: 'info.help.faq4Answer' },
    { category: 'booking', questionKey: 'info.help.faq5Question', answerKey: 'info.help.faq5Answer' },
    { category: 'messages', questionKey: 'info.help.faq6Question', answerKey: 'info.help.faq6Answer' },
    { category: 'reviews', questionKey: 'info.help.faq7Question', answerKey: 'info.help.faq7Answer' },
    { category: 'safety', questionKey: 'info.help.faq8Question', answerKey: 'info.help.faq8Answer' },
    ...Array.from({ length: 24 }, (_, index) => ({
        category: faqCategoryKeys[index < 3 ? 0 : index < 6 ? 1 : index < 9 ? 2 : index < 12 ? 3 : index < 15 ? 4 : index < 18 ? 5 : index < 21 ? 6 : 7].id,
        questionKey: `info.help.faq${index + 9}Question` as TranslationKey,
        answerKey: `info.help.faq${index + 9}Answer` as TranslationKey,
    })),
]

const audienceFaqQuestionKeys: Record<AudienceId, readonly TranslationKey[]> = {
    guest: [
        'info.help.faq1Question', 'info.help.faq2Question', 'info.help.faq3Question',
        'info.help.faq9Question', 'info.help.faq10Question', 'info.help.faq11Question',
        'info.help.faq30Question', 'info.help.faq31Question', 'info.help.faq32Question',
    ],
    client: faqEntries.map(({ questionKey }) => questionKey),
    owner: [
        'info.help.faq10Question', 'info.help.faq16Question', 'info.help.faq17Question',
        'info.help.faq18Question', 'info.help.faq19Question', 'info.help.faq20Question',
        'info.help.faq22Question', 'info.help.faq23Question', 'info.help.faq27Question',
        'info.help.faq28Question', 'info.help.faq29Question',
    ],
}

export function HelpCenterPage() {
    const { t } = useTranslation()
    const [searchParams, setSearchParams] = useSearchParams()
    const [search, setSearch] = useState('')
    const normalizedSearch = search.trim().toLocaleLowerCase()
    const audienceParam = searchParams.get('audience')
    const activeAudience: AudienceId = audienceParam && isAudienceId(audienceParam) ? audienceParam : 'guest'
    const categoryParam = searchParams.get('category')
    const requestedFaqCategory: FaqCategory | null = categoryParam && isFaqCategory(categoryParam) ? categoryParam : null
    const activeFaqCategory: FaqCategory | 'all' = requestedFaqCategory && audienceFaqCategories[activeAudience].includes(requestedFaqCategory)
        ? requestedFaqCategory
        : 'all'

    const updateHelpContext = (changes: { audience?: AudienceId; category?: FaqCategory | 'all' }) => {
        setSearchParams((current) => {
            const next = new URLSearchParams(current)
            if (changes.audience) next.set('audience', changes.audience)
            if (changes.category === 'all') next.delete('category')
            if (changes.category && changes.category !== 'all') next.set('category', changes.category)
            return next
        }, { replace: true })
    }

    const audiences = [
        {
            id: 'guest' as const,
            icon: UserRound,
            title: t('info.help.audienceGuestTitle'),
            description: t('info.help.audienceGuestDescription'),
        },
        {
            id: 'client' as const,
            icon: UserRound,
            title: t('info.help.audienceClientTitle'),
            description: t('info.help.audienceClientDescription'),
        },
        {
            id: 'owner' as const,
            icon: Building2,
            title: t('info.help.audienceOwnerTitle'),
            description: t('info.help.audienceOwnerDescription'),
        },
    ]

    const topicCards: Array<{
        id: TopicId
        icon: typeof Search
        title: string
        description: string
        count: string
        to: string
    }> = activeAudience === 'owner'
        ? [
            { id: 'owner-services', icon: Store, title: t('ownerDashboard.activeServices'), description: t('ownerDashboard.activeServicesDescription'), count: t('info.help.topicManageCount'), to: ROUTES.ownerServices },
            { id: 'owner-requests', icon: CalendarDays, title: t('ownerDashboard.upcomingBookings'), description: t('ownerDashboard.upcomingBookingsDescription'), count: t('info.help.topicBookingCount'), to: ROUTES.ownerBookings },
            { id: 'owner-clients', icon: UsersRound, title: t('ownerDashboard.clientListTitle'), description: t('ownerDashboard.clientListDescription'), count: t('info.help.topicAccountCount'), to: ROUTES.ownerClients },
            { id: 'messages', icon: MessageCircle, title: t('ownerDashboard.growth.messagesTitle'), description: t('ownerDashboard.growth.messagesText'), count: t('info.help.topicManageCount'), to: ROUTES.ownerBookings },
            { id: 'owner-growth', icon: WalletCards, title: t('ownerDashboard.growth.subscriptionTitle'), description: t('ownerDashboard.growth.subscriptionText'), count: t('info.help.topicCancellationCount'), to: ROUTES.pricing },
        ]
        : [
            { id: 'search', icon: Search, title: t('info.help.topicFindSpaceTitle'), description: t('info.help.topicFindSpaceDescription'), count: t('info.help.topicFindSpaceCount'), to: ROUTES.serviceDiscovery },
            { id: 'booking', icon: CalendarDays, title: t('info.help.topicBookingTitle'), description: t('info.help.topicBookingDescription'), count: t('info.help.topicBookingCount'), to: ROUTES.serviceDiscovery },
            { id: 'pricing', icon: WalletCards, title: t('info.help.topicCancellationTitle'), description: t('info.help.topicCancellationDescription'), count: t('info.help.topicCancellationCount'), to: helpTopicPath(activeAudience, 'pricing') },
            ...(activeAudience === 'client' ? [{ id: 'messages' as const, icon: MessageCircle, title: t('info.help.topicManageTitle'), description: t('info.help.topicManageDescription'), count: t('info.help.topicManageCount'), to: helpTopicPath(activeAudience, 'messages') }] : []),
            { id: 'reviews', icon: Star, title: t('info.help.topicAccountTitle'), description: t('info.help.topicAccountDescription'), count: t('info.help.topicAccountCount'), to: helpTopicPath(activeAudience, 'reviews') },
            ...(activeAudience === 'client' ? [{ id: 'vehicle' as const, icon: CarFront, title: t('info.help.topicVehicleTitle'), description: t('info.help.topicVehicleDescription'), count: t('info.help.topicVehicleCount'), to: ROUTES.profile }] : []),
        ]

    const filteredTopics = topicCards.filter(({ title, description }) =>
        !normalizedSearch || [title, description].join(' ').toLocaleLowerCase().includes(normalizedSearch),
    )
    const filteredFaqs = faqEntries.filter(({ category, questionKey, answerKey }) =>
        audienceFaqQuestionKeys[activeAudience].includes(questionKey) &&
        audienceFaqCategories[activeAudience].includes(category) &&
        (activeFaqCategory === 'all' || category === activeFaqCategory) &&
        (!normalizedSearch || [t(questionKey), t(answerKey)].join(' ').toLocaleLowerCase().includes(normalizedSearch)),
    )
    const hasResults = filteredTopics.length > 0 || filteredFaqs.length > 0

    const selectedAudience = audiences.find(({ id }) => id === activeAudience) ?? audiences[0]
    const audienceGuide = activeAudience === 'owner'
        ? {
            eyebrow: t('info.help.audienceOwnerTitle'),
            title: t('info.help.ownerTitle'),
            description: t('info.help.ownerDescription'),
            action: t('info.help.ownerAction'),
            to: ROUTES.ownerDashboard,
            sectionDescription: t('info.help.ownerDescription'),
        }
        : activeAudience === 'client'
            ? {
                eyebrow: t('info.help.audienceClientTitle'),
                title: t('info.help.clientTitle'),
                description: t('info.help.clientDescription'),
                action: t('info.help.clientAction'),
                to: ROUTES.profileBookings,
                sectionDescription: t('info.help.clientDescription'),
            }
            : {
                eyebrow: t('info.help.audienceGuestTitle'),
                title: t('info.help.title'),
                description: t('info.help.audienceGuestDescription'),
                action: t('info.openCatalog'),
                to: ROUTES.serviceDiscovery,
                sectionDescription: t('info.help.audienceGuestDescription'),
            }
    const audienceSectionTitle = `${selectedAudience.title}: ${t('info.help.topicBrowseTitle')}`
    const audienceFaqTitle = `${selectedAudience.title}: ${t('info.help.faqTitle')}`

    return (
        <main className="relative z-0 min-h-full bg-background text-foreground">
            <section className="relative overflow-visible border-b bg-background">
                <div className="mx-auto grid max-w-[1440px] lg:grid-cols-[1fr_1fr]">
                    <div className="relative z-10 px-5 py-12 md:px-12 md:py-16 lg:px-24 lg:py-8">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">
                            {audienceGuide.eyebrow} · {t('info.help.eyebrow')}
                        </p>
                        <h1 className="mt-3 max-w-xl text-4xl font-black leading-tight tracking-tight md:text-5xl" aria-live="polite">
                            {audienceGuide.title}
                        </h1>
                        <p className="mt-4 max-w-xl text-base font-medium leading-7 text-muted-foreground md:text-lg" aria-live="polite">
                            {audienceGuide.description}
                        </p>

                        <div className="mt-7 max-w-2xl">
                            <label htmlFor="help-search" className="sr-only">
                                {t('info.help.searchPlaceholder')}
                            </label>
                            <div className="flex min-h-14 items-center gap-3 rounded-lg border bg-background px-4 shadow-sm ring-1 ring-primary/10">
                                <Search className="size-5 shrink-0 text-foreground" aria-hidden="true" />
                                <input
                                    id="help-search"
                                    type="search"
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder={t('info.help.searchPlaceholder')}
                                    className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-muted-foreground"
                                />
                                {search && (
                                    <button
                                        type="button"
                                        onClick={() => setSearch('')}
                                        className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                        aria-label={t('info.help.clearSearch')}
                                        title={t('info.help.clearSearch')}
                                    >
                                        <X className="size-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="relative hidden min-h-[300px] lg:block">
                        <img
                            src="/images/autocare/help-center-workshop.webp"
                            alt=""
                            className="absolute inset-0 size-full object-cover"
                            width="1536"
                            height="1024"
                            loading="eager"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/10 to-transparent" />
                    </div>
                </div>

                <div className="relative z-20 mx-auto -mb-7 max-w-6xl px-5 md:px-12 lg:-mb-8 lg:px-0">
                    <div className="grid overflow-hidden rounded-lg border bg-background shadow-sm md:grid-cols-3" role="tablist" aria-label={t('info.help.audienceLabel')}>
                        {audiences.map(({ id, icon: Icon, title, description }) => (
                            <button
                                key={id}
                                type="button"
                                role="tab"
                                aria-selected={activeAudience === id}
                                aria-controls="help-audience-content"
                                onClick={() => updateHelpContext({ audience: id, category: 'all' })}
                                className={activeAudience === id
                                    ? 'flex min-h-16 items-center gap-3 rounded-lg border border-primary bg-background px-4 py-3 text-left ring-1 ring-inset ring-primary transition-colors md:rounded-none md:first:rounded-l-lg md:last:rounded-r-lg md:border-b-0 md:border-r md:last:border-r-0'
                                    : 'flex min-h-16 items-center gap-3 border-b px-4 py-3 text-left transition-colors first:rounded-t-lg last:rounded-b-lg last:border-b-0 hover:bg-muted/60 md:first:rounded-l-lg md:first:rounded-t-none md:last:rounded-r-lg md:last:rounded-b-none md:border-b-0 md:border-r md:last:border-r-0'}
                            >
                                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                                    <Icon className="size-4" aria-hidden="true" />
                                </span>
                                <span className="min-w-0">
                                    <span className="block text-sm font-black">{title}</span>
                                    <span className="block truncate text-xs font-medium text-muted-foreground">{description}</span>
                                </span>
                            </button>
                        ))}
                    </div>
                    <div id="help-audience-content" className="mt-3 flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-card px-4 py-3 shadow-sm" role="status">
                        <div className="min-w-0">
                            <p className="text-xs font-black uppercase tracking-[0.12em] text-primary">{selectedAudience.title}</p>
                            <p className="mt-1 text-sm font-medium text-muted-foreground">{audienceGuide.sectionDescription}</p>
                        </div>
                        <Link to={audienceGuide.to} className="inline-flex shrink-0 items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-black text-primary-foreground transition-colors hover:bg-primary/90">
                            {audienceGuide.action}
                            <ArrowRight className="size-3.5" aria-hidden="true" />
                        </Link>
                    </div>
                </div>
            </section>

            <section className="px-5 pb-12 pt-20 md:px-12 md:pb-16 md:pt-24">
                <div className="mx-auto max-w-6xl">
                    <h2 className="text-xl font-black tracking-tight">{audienceSectionTitle}</h2>
                    <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-muted-foreground">{audienceGuide.sectionDescription}</p>
                    {filteredTopics.length > 0 ? (
                        <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                            {filteredTopics.map(({ id, icon: Icon, title, description, count, to }) => (
                                <Link
                                    key={id}
                                    to={to}
                                    className="group flex min-h-44 flex-col rounded-lg border bg-card p-4 transition-colors hover:border-primary/50 hover:bg-primary/[0.02]"
                                >
                                    <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                        <Icon className="size-5" aria-hidden="true" />
                                    </span>
                                    <h3 className="mt-5 text-sm font-black">{title}</h3>
                                    <p className="mt-2 flex-1 text-xs font-medium leading-5 text-muted-foreground">{description}</p>
                                    <span className="mt-4 flex items-center justify-between text-xs font-semibold text-foreground">
                                        {count}
                                        <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                                    </span>
                                </Link>
                            ))}
                        </div>
                    ) : null}

                    <div className="mt-9">
                        <h2 className="text-xl font-black tracking-tight">{audienceFaqTitle}</h2>
                        <div className="mt-4 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label={t('info.help.faqCategoryLabel')}>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={activeFaqCategory === 'all'}
                                onClick={() => updateHelpContext({ category: 'all' })}
                                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${activeFaqCategory === 'all' ? 'border-primary bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:border-primary/50'}`}
                            >
                                {t('info.help.faqCategoryAll')}
                            </button>
                            {faqCategoryKeys.filter(({ id }) => audienceFaqCategories[activeAudience].includes(id)).map(({ id, labelKey }) => (
                                <button
                                    key={id}
                                    type="button"
                                    role="tab"
                                    aria-selected={activeFaqCategory === id}
                                    onClick={() => updateHelpContext({ category: id })}
                                    className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${activeFaqCategory === id ? 'border-primary bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:border-primary/50'}`}
                                >
                                    {t(labelKey)}
                                </button>
                            ))}
                        </div>
                        {filteredFaqs.length > 0 ? (
                            <div className="mt-4 grid gap-x-5 gap-y-2 md:grid-cols-2">
                                {filteredFaqs.map(({ questionKey, answerKey }) => (
                                    <details key={questionKey} className="group rounded-lg border bg-card px-4">
                                        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 py-3 text-sm font-semibold marker:hidden">
                                            {t(questionKey)}
                                            <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
                                        </summary>
                                        <p className="pb-4 pr-8 text-sm leading-6 text-muted-foreground">
                                            {t(answerKey)}
                                        </p>
                                    </details>
                                ))}
                            </div>
                        ) : null}
                    </div>

                    {!hasResults && (
                        <div className="mt-8 rounded-lg border border-dashed p-8 text-center">
                            <p className="font-black">{t('info.help.searchEmpty')}</p>
                            <p className="mt-2 text-sm text-muted-foreground">{t('info.help.searchEmptyHint')}</p>
                        </div>
                    )}

                    <div className="mt-9 grid gap-4 rounded-lg border bg-card p-4 md:grid-cols-[1fr_1fr_1fr] md:p-5">
                        <div className="flex flex-col justify-center">
                            <h2 className="text-lg font-black">{t('info.help.contactTitle')}</h2>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">{t('info.help.contactDescription')}</p>
                        </div>
                        <a href="mailto:info@autocarehub.ru" className="group flex items-center gap-3 rounded-lg border bg-background p-4 transition-colors hover:border-primary/50">
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                <Headphones className="size-5" aria-hidden="true" />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block text-sm font-black">{t('info.help.contactSupportTitle')}</span>
                                <span className="mt-1 block text-xs leading-5 text-muted-foreground">{t('info.help.contactSupportDescription')}</span>
                            </span>
                            <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                        </a>
                        <Link to={ROUTES.contacts} className="group flex items-center gap-3 rounded-lg border bg-background p-4 transition-colors hover:border-primary/50">
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-status-success-surface text-status-success-foreground">
                                <ShieldCheck className="size-5" aria-hidden="true" />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block text-sm font-black">{t('info.help.reportSafetyTitle')}</span>
                                <span className="mt-1 block text-xs leading-5 text-muted-foreground">{t('info.help.reportSafetyDescription')}</span>
                            </span>
                            <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                        </Link>
                    </div>
                </div>
            </section>
        </main>
    )
}
