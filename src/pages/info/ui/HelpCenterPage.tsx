import { useState } from 'react'
import { Link } from 'react-router'
import {
    ArrowRight,
    Building2,
    CalendarDays,
    ChevronDown,
    Headphones,
    Search,
    ShieldCheck,
    UserRound,
    X,
} from 'lucide-react'

import { ROUTES } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'

type AudienceId = 'guest' | 'client' | 'owner'

export function HelpCenterPage() {
    const { t } = useTranslation()
    const [search, setSearch] = useState('')
    const [activeAudience, setActiveAudience] = useState<AudienceId>('guest')
    const normalizedSearch = search.trim().toLocaleLowerCase()

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

    const topicCards = [
        {
            icon: Search,
            title: t('info.help.topicFindSpaceTitle'),
            description: t('info.help.topicFindSpaceDescription'),
            count: t('info.help.topicFindSpaceCount'),
            to: ROUTES.cabinets,
        },
        {
            icon: CalendarDays,
            title: t('info.help.topicBookingTitle'),
            description: t('info.help.topicBookingDescription'),
            count: t('info.help.topicBookingCount'),
            to: ROUTES.features,
        },
        {
            icon: X,
            title: t('info.help.topicCancellationTitle'),
            description: t('info.help.topicCancellationDescription'),
            count: t('info.help.topicCancellationCount'),
            to: ROUTES.rules,
        },
        {
            icon: Building2,
            title: t('info.help.topicManageTitle'),
            description: t('info.help.topicManageDescription'),
            count: t('info.help.topicManageCount'),
            to: ROUTES.owners,
        },
        {
            icon: ShieldCheck,
            title: t('info.help.topicAccountTitle'),
            description: t('info.help.topicAccountDescription'),
            count: t('info.help.topicAccountCount'),
            to: ROUTES.profile,
        },
    ]

    const faqs = [
        ['info.help.faq1Question', 'info.help.faq1Answer'],
        ['info.help.faq2Question', 'info.help.faq2Answer'],
        ['info.help.faq3Question', 'info.help.faq3Answer'],
        ['info.help.faq4Question', 'info.help.faq4Answer'],
        ['info.help.faq5Question', 'info.help.faq5Answer'],
        ['info.help.faq6Question', 'info.help.faq6Answer'],
        ['info.help.faq7Question', 'info.help.faq7Answer'],
        ['info.help.faq8Question', 'info.help.faq8Answer'],
    ] as const

    const filteredTopics = topicCards.filter(({ title, description }) =>
        !normalizedSearch || [title, description].join(' ').toLocaleLowerCase().includes(normalizedSearch),
    )
    const filteredFaqs = faqs.filter(([questionKey, answerKey]) =>
        !normalizedSearch || [t(questionKey), t(answerKey)].join(' ').toLocaleLowerCase().includes(normalizedSearch),
    )
    const hasResults = filteredTopics.length > 0 || filteredFaqs.length > 0

    return (
        <main className="relative z-0 min-h-full bg-background text-foreground">
            <section className="relative overflow-visible border-b bg-background">
                <div className="mx-auto grid max-w-[1440px] lg:grid-cols-[1fr_1fr]">
                    <div className="relative z-10 px-5 py-12 md:px-12 md:py-16 lg:px-24 lg:py-8">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">
                            {t('info.help.eyebrow')}
                        </p>
                        <h1 className="mt-3 max-w-xl text-4xl font-black leading-tight tracking-tight md:text-5xl">
                            {t('info.help.title')}
                        </h1>
                        <p className="mt-4 max-w-xl text-base font-medium leading-7 text-muted-foreground md:text-lg">
                            {t('info.help.description')}
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
                            src="/images/cabinets/cabinet-massage-wellness-draft-01.webp"
                            alt=""
                            className="absolute inset-0 size-full object-cover"
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
                                onClick={() => setActiveAudience(id)}
                                className={activeAudience === id
                                    ? 'flex min-h-16 items-center gap-3 border-b border-primary bg-background px-4 py-3 text-left ring-1 ring-inset ring-primary transition-colors last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0'
                                    : 'flex min-h-16 items-center gap-3 border-b px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-muted/60 md:border-b-0 md:border-r md:last:border-r-0'}
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
                </div>
            </section>

            <section className="px-5 pb-12 pt-20 md:px-12 md:pb-16 md:pt-24">
                <div className="mx-auto max-w-6xl">
                    <h2 className="text-xl font-black tracking-tight">{t('info.help.topicBrowseTitle')}</h2>
                    {filteredTopics.length > 0 ? (
                        <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                            {filteredTopics.map(({ icon: Icon, title, description, count, to }) => (
                                <Link
                                    key={title}
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
                        <h2 className="text-xl font-black tracking-tight">{t('info.help.faqTitle')}</h2>
                        {filteredFaqs.length > 0 ? (
                            <div className="mt-4 grid gap-x-5 gap-y-2 md:grid-cols-2">
                                {filteredFaqs.map(([questionKey, answerKey]) => (
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
