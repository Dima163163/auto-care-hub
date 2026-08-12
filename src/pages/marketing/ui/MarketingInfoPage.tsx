import {
    BarChart3,
    Building2,
    CalendarCheck2,
    ClipboardList,
    CreditCard,
    Grid2X2,
    Headphones,
    MessageSquareText,
    ShieldCheck,
    Sparkles,
    UsersRound,
} from 'lucide-react'
import { Link } from 'react-router'

import { ROUTES } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'
import type { TranslationKey } from '@/shared/lib/i18n'

type MarketingItem = {
    icon: typeof CalendarCheck2
    titleKey: TranslationKey
    textKey: TranslationKey
}

type MarketingPageContent = {
    eyebrowKey: TranslationKey
    titleKey: TranslationKey
    descriptionKey: TranslationKey
    primaryActionKey: TranslationKey
    primaryTo: string
    secondaryActionKey: TranslationKey
    secondaryTo: string
    highlights: MarketingItem[]
    workflowKeys: TranslationKey[]
    stats: Array<{
        valueKey: TranslationKey
        labelKey: TranslationKey
    }>
}

const pageContent: Record<'features' | 'owners' | 'about', MarketingPageContent> = {
    features: {
        eyebrowKey: 'marketing.features.eyebrow',
        titleKey: 'marketing.features.title',
        descriptionKey: 'marketing.features.description',
        primaryActionKey: 'marketing.features.primaryAction',
        primaryTo: ROUTES.cabinets,
        secondaryActionKey: 'marketing.features.secondaryAction',
        secondaryTo: ROUTES.owners,
        highlights: [
            {
                icon: CalendarCheck2,
                titleKey: 'marketing.features.highlight1Title',
                textKey: 'marketing.features.highlight1Text',
            },
            {
                icon: ClipboardList,
                titleKey: 'marketing.features.highlight2Title',
                textKey: 'marketing.features.highlight2Text',
            },
            {
                icon: BarChart3,
                titleKey: 'marketing.features.highlight3Title',
                textKey: 'marketing.features.highlight3Text',
            },
        ],
        workflowKeys: [
            'marketing.features.workflow1',
            'marketing.features.workflow2',
            'marketing.features.workflow3',
            'marketing.features.workflow4',
        ],
        stats: [
            { valueKey: 'marketing.features.stat1Value', labelKey: 'marketing.features.stat1Label' },
            { valueKey: 'marketing.features.stat2Value', labelKey: 'marketing.features.stat2Label' },
            { valueKey: 'marketing.features.stat3Value', labelKey: 'marketing.features.stat3Label' },
        ],
    },
    owners: {
        eyebrowKey: 'marketing.owners.eyebrow',
        titleKey: 'marketing.owners.title',
        descriptionKey: 'marketing.owners.description',
        primaryActionKey: 'marketing.owners.primaryAction',
        primaryTo: ROUTES.register,
        secondaryActionKey: 'marketing.owners.secondaryAction',
        secondaryTo: ROUTES.pricing,
        highlights: [
            {
                icon: Building2,
                titleKey: 'marketing.owners.highlight1Title',
                textKey: 'marketing.owners.highlight1Text',
            },
            {
                icon: UsersRound,
                titleKey: 'marketing.owners.highlight2Title',
                textKey: 'marketing.owners.highlight2Text',
            },
            {
                icon: CreditCard,
                titleKey: 'marketing.owners.highlight3Title',
                textKey: 'marketing.owners.highlight3Text',
            },
        ],
        workflowKeys: [
            'marketing.owners.workflow1',
            'marketing.owners.workflow2',
            'marketing.owners.workflow3',
            'marketing.owners.workflow4',
        ],
        stats: [
            { valueKey: 'marketing.owners.stat1Value', labelKey: 'marketing.owners.stat1Label' },
            { valueKey: 'marketing.owners.stat2Value', labelKey: 'marketing.owners.stat2Label' },
            { valueKey: 'marketing.owners.stat3Value', labelKey: 'marketing.owners.stat3Label' },
        ],
    },
    about: {
        eyebrowKey: 'marketing.about.eyebrow',
        titleKey: 'marketing.about.title',
        descriptionKey: 'marketing.about.description',
        primaryActionKey: 'marketing.about.primaryAction',
        primaryTo: ROUTES.cabinets,
        secondaryActionKey: 'marketing.about.secondaryAction',
        secondaryTo: ROUTES.features,
        highlights: [
            {
                icon: ShieldCheck,
                titleKey: 'marketing.about.highlight1Title',
                textKey: 'marketing.about.highlight1Text',
            },
            {
                icon: Headphones,
                titleKey: 'marketing.about.highlight2Title',
                textKey: 'marketing.about.highlight2Text',
            },
            {
                icon: MessageSquareText,
                titleKey: 'marketing.about.highlight3Title',
                textKey: 'marketing.about.highlight3Text',
            },
        ],
        workflowKeys: [
            'marketing.about.workflow1',
            'marketing.about.workflow2',
            'marketing.about.workflow3',
            'marketing.about.workflow4',
        ],
        stats: [
            { valueKey: 'marketing.about.stat1Value', labelKey: 'marketing.about.stat1Label' },
            { valueKey: 'marketing.about.stat2Value', labelKey: 'marketing.about.stat2Label' },
            { valueKey: 'marketing.about.stat3Value', labelKey: 'marketing.about.stat3Label' },
        ],
    },
}

function MarketingInfoPage({ content }: { content: MarketingPageContent }) {
    const { t } = useTranslation()

    return (
        <main className="bg-background px-5 py-10 text-foreground md:px-12 md:py-12">
            <section className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr]">
                <div className="flex flex-col justify-center">
                    <span className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-border bg-primary/5 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-primary">
                        <Sparkles className="size-4" />
                        {t(content.eyebrowKey)}
                    </span>
                    <h1 className="max-w-[640px] text-[44px] font-black leading-[1.08] tracking-[-0.02em]">
                        {t(content.titleKey)}
                    </h1>
                    <p className="mt-6 max-w-[620px] text-lg font-medium leading-8 text-muted-foreground">
                        {t(content.descriptionKey)}
                    </p>
                    <div className="mt-9 flex flex-wrap gap-4">
                        <Link
                            to={content.primaryTo}
                            className="rounded-md bg-primary px-8 py-4 text-base font-bold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90"
                        >
                            {t(content.primaryActionKey)}
                        </Link>
                        <Link
                            to={content.secondaryTo}
                            className="rounded-md border-2 border-primary px-8 py-4 text-base font-bold text-primary hover:bg-primary/5"
                        >
                            {t(content.secondaryActionKey)}
                        </Link>
                    </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-5 shadow-lg shadow-foreground/5">
                    <div className="grid gap-4">
                        {content.highlights.map(({ icon: Icon, titleKey, textKey }) => (
                            <article key={titleKey} className="rounded-lg border border-border bg-background p-5">
                                <div className="flex gap-4">
                                    <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                        <Icon className="size-5" />
                                    </span>
                                    <div>
                                        <h2 className="text-lg font-black">{t(titleKey)}</h2>
                                        <p className="mt-2 text-sm font-medium leading-6 text-muted-foreground">
                                            {t(textKey)}
                                        </p>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section className="mt-12 grid gap-5 lg:grid-cols-[1fr_0.85fr]">
                <div className="rounded-lg border border-border bg-card p-7">
                    <h2 className="text-2xl font-black tracking-tight">{t('marketing.howItWorks')}</h2>
                    <div className="mt-6 grid gap-4 md:grid-cols-4">
                        {content.workflowKeys.map((stepKey, index) => (
                            <div key={stepKey} className="rounded-lg bg-primary/5 p-4">
                                <span className="text-xs font-black text-primary">
                                    {String(index + 1).padStart(2, '0')}
                                </span>
                                <p className="mt-3 text-sm font-extrabold leading-5">{t(stepKey)}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="rounded-lg bg-primary p-7 text-primary-foreground">
                    <div className="flex items-center gap-3">
                        <Grid2X2 className="size-8" />
                        <h2 className="text-2xl font-black tracking-tight">{t('marketing.inNumbers')}</h2>
                    </div>
                    <div className="mt-7 grid grid-cols-3 gap-4">
                        {content.stats.map((stat) => (
                            <div key={stat.labelKey}>
                                <p className="text-3xl font-black tracking-tight">{t(stat.valueKey)}</p>
                                <p className="mt-2 text-sm font-semibold text-primary-foreground/80">{t(stat.labelKey)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </main>
    )
}

export function FeaturesPage() {
    return <MarketingInfoPage content={pageContent.features} />
}

export function OwnersPage() {
    return <MarketingInfoPage content={pageContent.owners} />
}

export function AboutPage() {
    return <MarketingInfoPage content={pageContent.about} />
}
