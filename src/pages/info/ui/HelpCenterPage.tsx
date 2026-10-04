import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import {
    ArrowRight,
    Building2,
    CalendarDays,
    CarFront,
    ChevronDown,
    MessageCircle,
    Search,
    Star,
    Store,
    WalletCards,
    UserRound,
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
    owner: ['pricing', 'messages', 'reviews', 'safety'],
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
        to: string
    }> = activeAudience === 'owner'
        ? [
            { id: 'owner-services', icon: Store, title: t('ownerDashboard.activeServices'), description: t('ownerDashboard.activeServicesDescription'), to: ROUTES.ownerAutoCareProviders },
            { id: 'owner-requests', icon: CalendarDays, title: t('ownerDashboard.upcomingBookings'), description: t('ownerDashboard.upcomingBookingsDescription'), to: ROUTES.ownerAutoCareRequests },
            { id: 'owner-clients', icon: UsersRound, title: t('ownerDashboard.clientListTitle'), description: t('ownerDashboard.clientListDescription'), to: ROUTES.ownerClients },
            { id: 'messages', icon: MessageCircle, title: t('ownerDashboard.growth.messagesTitle'), description: t('ownerDashboard.growth.messagesText'), to: ROUTES.ownerChats },
        ]
        : [
            { id: 'search', icon: Search, title: t('info.help.topicFindSpaceTitle'), description: t('info.help.topicFindSpaceDescription'), to: ROUTES.serviceDiscovery },
            { id: 'booking', icon: CalendarDays, title: t('info.help.topicBookingTitle'), description: t('info.help.topicBookingDescription'), to: ROUTES.serviceDiscovery },
            { id: 'pricing', icon: WalletCards, title: t('info.help.topicCancellationTitle'), description: t('info.help.topicCancellationDescription'), to: helpTopicPath(activeAudience, 'pricing') },
            ...(activeAudience === 'client' ? [{ id: 'messages' as const, icon: MessageCircle, title: t('info.help.topicManageTitle'), description: t('info.help.topicManageDescription'), to: helpTopicPath(activeAudience, 'messages') }] : []),
            { id: 'reviews', icon: Star, title: t('info.help.topicAccountTitle'), description: t('info.help.topicAccountDescription'), to: helpTopicPath(activeAudience, 'reviews') },
            ...(activeAudience === 'client' ? [{ id: 'vehicle' as const, icon: CarFront, title: t('info.help.topicVehicleTitle'), description: t('info.help.topicVehicleDescription'), to: ROUTES.profileVehicles }] : []),
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
    const audienceSectionTitle = `${selectedAudience.title}: ${t('info.help.topicBrowseTitle')}`
    const audienceFaqTitle = `${selectedAudience.title}: ${t('info.help.faqTitle')}`

    return (
        <main className="relative z-0 min-h-full bg-background text-foreground">
            <section className="border-b bg-card px-[var(--layout-gutter)] py-7">
                <div className="mx-auto max-w-6xl">
                    <h1 className="text-3xl font-semibold tracking-tight">{t('autocare.helpTasksTitle')}</h1>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{t('autocare.helpTasksDescription')}</p>
                    <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label={t('info.help.audienceLabel')}>
                        {audiences.map(({ id, icon: Icon, title }) => <button key={id} type="button" aria-pressed={activeAudience === id} onClick={() => updateHelpContext({ audience: id, category: 'all' })} className={`flex min-h-11 items-center gap-2 rounded-md border px-4 text-sm font-medium ${activeAudience === id ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-muted'}`}><Icon className="size-4" aria-hidden="true" />{title}</button>)}
                    </div>
                    <label htmlFor="help-search" className="mt-5 block text-sm font-medium">{t('info.help.searchPlaceholder')}</label>
                    <div className="mt-2 flex min-h-12 max-w-2xl items-center gap-3 rounded-md border bg-background px-4">
                        <Search className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                        <input id="help-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('info.help.searchPlaceholder')} className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none" />
                        {search && <button type="button" onClick={() => setSearch('')} className="flex size-11 items-center justify-center rounded-md hover:bg-muted" aria-label={t('info.help.clearSearch')}><X className="size-4" /></button>}
                    </div>
                </div>
            </section>

            <section className="px-[var(--layout-gutter)] py-8 md:py-10">
                <div className="mx-auto max-w-6xl">
                    <h2 className="text-xl font-black tracking-tight">{audienceSectionTitle}</h2>
                    {filteredTopics.length > 0 ? (
                        <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {filteredTopics.map(({ id, icon: Icon, title, description, to }) => (
                                <Link
                                    key={id}
                                    to={to}
                                    className="group flex min-h-36 flex-col rounded-lg border bg-card p-4 transition-colors hover:border-primary/50 hover:bg-primary/[0.02]"
                                >
                                    <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                        <Icon className="size-5" aria-hidden="true" />
                                    </span>
                                    <h3 className="mt-3 text-sm font-black">{title}</h3>
                                    <p className="mt-2 flex-1 text-sm font-medium leading-6 text-muted-foreground">{description}</p>
                                    <span className="mt-4 flex items-center justify-between text-xs font-semibold text-foreground">
                                        {t('autocare.helpNextStep')}
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
                                {filteredFaqs.map(({ category, questionKey, answerKey }) => (
                                    <details key={questionKey} className="group rounded-lg border bg-card px-4">
                                        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 py-3 text-sm font-semibold marker:hidden">
                                            {t(questionKey)}
                                            <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
                                        </summary>
                                        <p className="pb-4 pr-8 text-sm leading-6 text-muted-foreground">
                                            {t(answerKey)}
                                        </p>
                                        <Link to={category === 'account' ? ROUTES.profile : category === 'messages' || category === 'safety' ? (activeAudience === 'owner' ? ROUTES.ownerChats : ROUTES.chats) : category === 'booking' ? (activeAudience === 'owner' ? ROUTES.ownerAutoCareRequests : activeAudience === 'client' ? ROUTES.profileBookings : ROUTES.serviceDiscovery) : ROUTES.serviceDiscovery} className="mb-4 inline-flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm font-medium text-primary">{t('autocare.helpNextStep')}<ArrowRight className="size-4" /></Link>
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

                    <aside className="mt-8 rounded-lg border bg-card p-5"><h2 className="text-lg font-semibold">{t('info.help.contactTitle')}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{t('autocare.helpContactUnavailable')}</p></aside>
                </div>
            </section>
        </main>
    )
}
