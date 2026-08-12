import { useState } from 'react'
import { Link } from 'react-router'
import {
    ArrowRight,
    BookOpen,
    Building2,
    CalendarDays,
    ChevronDown,
    Handshake,
    Headphones,
    LayoutDashboard,
    Mail,
    Search,
    ShieldCheck,
    ScrollText,
    UserRound,
    X,
} from 'lucide-react'

import { ROUTES } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'
import type { TranslationKey } from '@/shared/lib/i18n'

type InfoContent = {
    eyebrowKey: TranslationKey
    titleKey: TranslationKey
    descriptionKey: TranslationKey
    points: TranslationKey[]
    icon: typeof BookOpen
}

const infoContent: Record<'blog' | 'partners' | 'contacts' | 'help' | 'rules' | 'privacy', InfoContent> = {
    blog: {
        eyebrowKey: 'info.blog.eyebrow',
        titleKey: 'info.blog.title',
        descriptionKey: 'info.blog.description',
        points: ['info.blog.point1', 'info.blog.point2', 'info.blog.point3'],
        icon: BookOpen,
    },
    partners: {
        eyebrowKey: 'info.partners.eyebrow',
        titleKey: 'info.partners.title',
        descriptionKey: 'info.partners.description',
        points: ['info.partners.point1', 'info.partners.point2', 'info.partners.point3'],
        icon: Handshake,
    },
    contacts: {
        eyebrowKey: 'info.contacts.eyebrow',
        titleKey: 'info.contacts.title',
        descriptionKey: 'info.contacts.description',
        points: ['info.contacts.point1', 'info.contacts.point2', 'info.contacts.point3'],
        icon: Mail,
    },
    help: {
        eyebrowKey: 'info.help.eyebrow',
        titleKey: 'info.help.title',
        descriptionKey: 'info.help.description',
        points: ['info.help.point1', 'info.help.point2', 'info.help.point3'],
        icon: Headphones,
    },
    rules: {
        eyebrowKey: 'info.rules.eyebrow',
        titleKey: 'info.rules.title',
        descriptionKey: 'info.rules.description',
        points: ['info.rules.point1', 'info.rules.point2', 'info.rules.point3'],
        icon: ScrollText,
    },
    privacy: {
        eyebrowKey: 'info.privacy.eyebrow',
        titleKey: 'info.privacy.title',
        descriptionKey: 'info.privacy.description',
        points: ['info.privacy.point1', 'info.privacy.point2', 'info.privacy.point3'],
        icon: ShieldCheck,
    },
}

function InfoPage({ content }: { content: InfoContent }) {
    const { t } = useTranslation()
    const Icon = content.icon

    return (
        <main className="min-h-screen bg-background px-5 py-10 text-foreground md:px-12">
            <section className="mx-auto max-w-5xl">
                <div className="grid gap-8 lg:grid-cols-[0.8fr_1fr]">
                    <div>
                        <p className="text-sm font-black uppercase tracking-[0.16em] text-primary">
                            {t(content.eyebrowKey)}
                        </p>
                        <h1 className="mt-3 text-4xl font-black leading-tight tracking-tight">
                            {t(content.titleKey)}
                        </h1>
                        <p className="mt-4 text-base font-medium leading-7 text-muted-foreground">
                            {t(content.descriptionKey)}
                        </p>
                        <Link
                            to={ROUTES.cabinets}
                            className="mt-7 inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20"
                        >
                            {t('info.openCatalog')}
                            <ArrowRight className="size-4" />
                        </Link>
                    </div>

                    <div className="rounded-xl border border-border bg-card p-6">
                        <span className="flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Icon className="size-6" />
                        </span>
                        <div className="mt-6 grid gap-4">
                            {content.points.map((pointKey) => (
                                <div key={pointKey} className="rounded-lg bg-background p-4 text-sm font-bold leading-6 text-foreground">
                                    {t(pointKey)}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>
        </main>
    )
}

export function BlogPage() {
    return <InfoPage content={infoContent.blog} />
}

export function PartnersPage() {
    return <InfoPage content={infoContent.partners} />
}

export function ContactsPage() {
    return <InfoPage content={infoContent.contacts} />
}

export function HelpPage() {
    const { t } = useTranslation()
    const [search, setSearch] = useState('')
    const normalizedSearch = search.trim().toLocaleLowerCase()

    const helpTracks = [
        {
            icon: CalendarDays,
            title: t('info.help.clientTitle'),
            description: t('info.help.clientDescription'),
            action: t('info.help.clientAction'),
            to: ROUTES.cabinets,
        },
        {
            icon: Building2,
            title: t('info.help.ownerTitle'),
            description: t('info.help.ownerDescription'),
            action: t('info.help.ownerAction'),
            to: ROUTES.ownerDashboard,
        },
        {
            icon: UserRound,
            title: t('info.help.accountTitle'),
            description: t('info.help.accountDescription'),
            action: t('info.help.accountAction'),
            to: ROUTES.profile,
        },
        {
            icon: LayoutDashboard,
            title: t('info.help.adminTitle'),
            description: t('info.help.adminDescription'),
            action: t('info.help.adminAction'),
            to: ROUTES.adminDashboard,
        },
    ]

    const faqs = [
        ['info.help.faq1Question', 'info.help.faq1Answer'],
        ['info.help.faq2Question', 'info.help.faq2Answer'],
        ['info.help.faq3Question', 'info.help.faq3Answer'],
        ['info.help.faq4Question', 'info.help.faq4Answer'],
        ['info.help.faq5Question', 'info.help.faq5Answer'],
        ['info.help.faq6Question', 'info.help.faq6Answer'],
    ] as const

    const filteredTracks = helpTracks.filter(({ title, description }) =>
        !normalizedSearch || `${title} ${description}`.toLocaleLowerCase().includes(normalizedSearch),
    )
    const filteredFaqs = faqs.filter(([questionKey, answerKey]) =>
        !normalizedSearch || `${t(questionKey)} ${t(answerKey)}`.toLocaleLowerCase().includes(normalizedSearch),
    )
    const hasResults = filteredTracks.length > 0 || filteredFaqs.length > 0

    return (
        <main className="min-h-screen bg-background text-foreground">
            <section className="border-b bg-primary/5 px-5 py-12 md:px-12 md:py-16">
                <div className="mx-auto max-w-6xl">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">
                        {t('info.help.eyebrow')}
                    </p>
                    <div className="mt-3 max-w-3xl">
                        <h1 className="text-4xl font-black leading-tight tracking-tight md:text-5xl">
                            {t('info.help.title')}
                        </h1>
                        <p className="mt-5 text-base font-medium leading-7 text-muted-foreground md:text-lg">
                            {t('info.help.description')}
                        </p>
                    </div>

                    <div className="mt-8 max-w-2xl">
                        <label htmlFor="help-search" className="sr-only">
                            {t('info.help.searchPlaceholder')}
                        </label>
                        <div className="flex min-h-14 items-center gap-3 rounded-xl border bg-background px-4 shadow-sm ring-1 ring-primary/10">
                            <Search className="size-5 shrink-0 text-primary" aria-hidden="true" />
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
                        <p className="mt-3 text-xs font-semibold text-muted-foreground">
                            {t('info.help.searchHint')}
                        </p>
                    </div>
                </div>
            </section>

            <section className="px-5 py-10 md:px-12 md:py-14">
                <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[minmax(0,1fr)_300px]">
                    <div className="min-w-0">
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
                                {t('info.help.quickStartEyebrow')}
                            </p>
                            <h2 className="mt-2 text-2xl font-black tracking-tight">
                                {t('info.help.quickStartTitle')}
                            </h2>
                            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                                {t('info.help.quickStartDescription')}
                            </p>
                        </div>

                        {filteredTracks.length > 0 && (
                            <div className="mt-6 grid gap-4 md:grid-cols-2">
                                {filteredTracks.map(({ icon: Icon, title, description, action, to }) => (
                                    <article key={title} className="flex min-h-52 flex-col rounded-xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
                                        <span className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                            <Icon className="size-5" aria-hidden="true" />
                                        </span>
                                        <h3 className="mt-5 text-base font-black">{title}</h3>
                                        <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">{description}</p>
                                        <Link to={to} className="mt-5 inline-flex items-center gap-2 text-sm font-black text-primary hover:underline">
                                            {action}
                                            <ArrowRight className="size-4" aria-hidden="true" />
                                        </Link>
                                    </article>
                                ))}
                            </div>
                        )}

                        <div className="mt-12">
                            <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
                                {t('info.help.faqEyebrow')}
                            </p>
                            <h2 className="mt-2 text-2xl font-black tracking-tight">
                                {t('info.help.faqTitle')}
                            </h2>
                            {filteredFaqs.length > 0 ? (
                                <div className="mt-6 divide-y rounded-xl border bg-card">
                                    {filteredFaqs.map(([questionKey, answerKey]) => (
                                        <details key={questionKey} className="group px-5">
                                            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-sm font-black marker:hidden">
                                                {t(questionKey)}
                                                <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
                                            </summary>
                                            <p className="max-w-3xl pb-5 pr-8 text-sm leading-6 text-muted-foreground">
                                                {t(answerKey)}
                                            </p>
                                        </details>
                                    ))}
                                </div>
                            ) : null}
                        </div>

                        {!hasResults && (
                            <div className="mt-8 rounded-xl border border-dashed p-8 text-center">
                                <p className="font-black">{t('info.help.searchEmpty')}</p>
                                <p className="mt-2 text-sm text-muted-foreground">{t('info.help.searchEmptyHint')}</p>
                            </div>
                        )}
                    </div>

                    <aside className="h-fit rounded-xl border bg-card p-5 lg:sticky lg:top-6">
                        <span className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Headphones className="size-5" aria-hidden="true" />
                        </span>
                        <h2 className="mt-5 text-lg font-black">{t('info.help.contactTitle')}</h2>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            {t('info.help.contactDescription')}
                        </p>
                        <div className="mt-5 grid gap-2">
                            <a href="mailto:info@autocarehub.ru" className="inline-flex items-center gap-2 text-sm font-black text-primary hover:underline">
                                <Mail className="size-4" aria-hidden="true" />
                                {t('info.help.contactAction')}
                            </a>
                            <Link to={ROUTES.contacts} className="inline-flex items-center gap-2 text-sm font-black text-primary hover:underline">
                                <ArrowRight className="size-4" aria-hidden="true" />
                                {t('info.help.contactPageAction')}
                            </Link>
                            <Link to={ROUTES.rules} className="inline-flex items-center gap-2 text-sm font-black text-primary hover:underline">
                                <ShieldCheck className="size-4" aria-hidden="true" />
                                {t('info.help.rulesAction')}
                            </Link>
                        </div>
                    </aside>
                </div>
            </section>
        </main>
    )
}

export function RulesPage() {
    return <InfoPage content={infoContent.rules} />
}

export function PrivacyPage() {
    return <InfoPage content={infoContent.privacy} />
}
