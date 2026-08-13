import {
    ArrowRight,
    CarFront,
    CheckCircle2,
    Globe2,
    Languages,
    MessageSquareText,
    Search,
    ShieldCheck,
    Store,
} from 'lucide-react'
import { Link } from 'react-router'

import { ROUTES } from '@/shared/constants/routes'
import type { TranslationKey } from '@/shared/lib/i18n'
import { useTranslation } from '@/shared/lib/useTranslation'

type Icon = typeof Search

const audiences: Array<{ icon: Icon; titleKey: TranslationKey; textKey: TranslationKey }> = [
    { icon: CarFront, titleKey: 'marketing.about.clientTitle', textKey: 'marketing.about.clientText' },
    { icon: Store, titleKey: 'marketing.about.ownerTitle', textKey: 'marketing.about.ownerText' },
    { icon: Globe2, titleKey: 'marketing.about.travelerTitle', textKey: 'marketing.about.travelerText' },
]

const process: Array<{ icon: Icon; titleKey: TranslationKey; textKey: TranslationKey }> = [
    { icon: Search, titleKey: 'marketing.about.process1Title', textKey: 'marketing.about.process1Text' },
    { icon: MessageSquareText, titleKey: 'marketing.about.process2Title', textKey: 'marketing.about.process2Text' },
    { icon: CheckCircle2, titleKey: 'marketing.about.process3Title', textKey: 'marketing.about.process3Text' },
    { icon: ShieldCheck, titleKey: 'marketing.about.process4Title', textKey: 'marketing.about.process4Text' },
]

const principles: Array<{ icon: Icon; titleKey: TranslationKey; textKey: TranslationKey }> = [
    { icon: ShieldCheck, titleKey: 'marketing.about.principle1Title', textKey: 'marketing.about.principle1Text' },
    { icon: Languages, titleKey: 'marketing.about.principle2Title', textKey: 'marketing.about.principle2Text' },
    { icon: MessageSquareText, titleKey: 'marketing.about.principle3Title', textKey: 'marketing.about.principle3Text' },
]

export function AboutPage() {
    const { t } = useTranslation()

    return (
        <main className="relative overflow-hidden bg-background text-foreground">
            <AboutHero />

            <section className="mx-auto max-w-[var(--layout-public-max)] px-[var(--layout-gutter)] py-14 sm:py-20">
                <SectionHeading eyebrow={t('marketing.about.audienceEyebrow')} title={t('marketing.about.audienceTitle')} description={t('marketing.about.audienceDescription')} />
                <div className="mt-8 grid gap-4 lg:grid-cols-3">
                    {audiences.map(({ icon: Icon, titleKey, textKey }) => (
                        <article key={titleKey} className="rounded-[var(--radius-panel)] border border-border bg-card p-6 shadow-sm">
                            <span className="flex size-11 items-center justify-center rounded-[var(--radius-control)] bg-primary/10 text-primary"><Icon className="size-5" /></span>
                            <h2 className="mt-5 text-lg font-black">{t(titleKey)}</h2>
                            <p className="mt-2 text-sm font-medium leading-6 text-muted-foreground">{t(textKey)}</p>
                        </article>
                    ))}
                </div>
            </section>

            <section className="border-y border-border bg-secondary/45">
                <div className="mx-auto max-w-[var(--layout-public-max)] px-[var(--layout-gutter)] py-14 sm:py-20">
                    <SectionHeading eyebrow={t('marketing.about.processEyebrow')} title={t('marketing.about.processTitle')} description={t('marketing.about.processDescription')} />
                    <div className="mt-9 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        {process.map(({ icon: Icon, titleKey, textKey }, index) => (
                            <article key={titleKey} className="relative rounded-[var(--radius-panel)] border border-border bg-background p-5">
                                <span className="absolute right-5 top-5 text-xs font-black text-primary/60">0{index + 1}</span>
                                <span className="flex size-11 items-center justify-center rounded-[var(--radius-control)] bg-primary text-primary-foreground"><Icon className="size-5" /></span>
                                <h2 className="mt-5 text-base font-black">{t(titleKey)}</h2>
                                <p className="mt-2 text-sm font-medium leading-6 text-muted-foreground">{t(textKey)}</p>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section className="mx-auto grid max-w-[var(--layout-public-max)] gap-8 px-[var(--layout-gutter)] py-14 sm:py-20 lg:grid-cols-[0.85fr_1.15fr]">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">{t('marketing.about.principlesEyebrow')}</p>
                    <h2 className="mt-3 max-w-xl text-3xl font-black tracking-tight sm:text-4xl">{t('marketing.about.principlesTitle')}</h2>
                    <p className="mt-4 max-w-xl text-base font-medium leading-7 text-muted-foreground">{t('marketing.about.principlesDescription')}</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                    {principles.map(({ icon: Icon, titleKey, textKey }) => (
                        <article key={titleKey} className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm">
                            <Icon className="size-5 text-primary" />
                            <h3 className="mt-4 text-sm font-black">{t(titleKey)}</h3>
                            <p className="mt-2 text-xs font-medium leading-5 text-muted-foreground">{t(textKey)}</p>
                        </article>
                    ))}
                </div>
            </section>

            <section className="relative isolate overflow-hidden bg-hero-overlay text-primary-foreground">
                <img src="/images/autocare/hero-map-generated.webp" alt="" className="absolute inset-0 -z-20 size-full object-cover opacity-25" />
                <div className="absolute inset-0 -z-10 bg-hero-overlay/75" />
                <div className="mx-auto flex max-w-[var(--layout-public-max)] flex-col gap-6 px-[var(--layout-gutter)] py-12 sm:flex-row sm:items-center sm:justify-between sm:py-16">
                    <div className="max-w-2xl">
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">{t('marketing.about.ctaEyebrow')}</p>
                        <h2 className="mt-3 text-3xl font-black tracking-tight">{t('marketing.about.ctaTitle')}</h2>
                        <p className="mt-3 text-sm font-medium leading-6 text-primary-foreground/75">{t('marketing.about.ctaText')}</p>
                    </div>
                    <Link to={ROUTES.serviceDiscovery} className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-primary px-5 text-sm font-black text-primary-foreground hover:bg-primary/90">
                        {t('marketing.about.ctaAction')}<ArrowRight className="size-4" />
                    </Link>
                </div>
            </section>
        </main>
    )
}

function AboutHero() {
    const { t } = useTranslation()

    return (
        <section className="relative isolate overflow-hidden bg-hero-overlay text-primary-foreground">
            <img src="/images/autocare/hero-map-generated.webp" alt="" className="absolute inset-0 -z-20 size-full object-cover object-center opacity-45" />
            <div className="absolute inset-0 -z-10 bg-gradient-to-r from-hero-overlay via-hero-overlay/90 to-hero-overlay/55" />
            <div className="mx-auto grid max-w-[var(--layout-public-max)] gap-10 px-[var(--layout-gutter)] py-16 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
                <div className="max-w-3xl">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">{t('marketing.about.eyebrow')}</p>
                    <h1 className="mt-4 text-4xl font-black leading-[1.08] tracking-[-0.035em] sm:text-5xl">{t('marketing.about.detailedTitle')}</h1>
                    <p className="mt-5 max-w-2xl text-lg font-medium leading-8 text-primary-foreground/80">{t('marketing.about.detailedDescription')}</p>
                    <div className="mt-8 flex flex-wrap gap-3">
                        <Link to={ROUTES.serviceDiscovery} className="inline-flex h-12 items-center gap-2 rounded-[var(--radius-control)] bg-primary px-5 text-sm font-black text-primary-foreground hover:bg-primary/90">{t('marketing.about.primaryAction')}<ArrowRight className="size-4" /></Link>
                        <Link to={ROUTES.owners} className="inline-flex h-12 items-center rounded-[var(--radius-control)] border border-primary-foreground/30 px-5 text-sm font-black hover:bg-primary-foreground/10">{t('marketing.about.secondaryAction')}</Link>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2">
                    <StatCard value={t('marketing.about.stat1Value')} label={t('marketing.about.stat1Label')} />
                    <StatCard value={t('marketing.about.stat2Value')} label={t('marketing.about.stat2Label')} />
                    <StatCard value={t('marketing.about.stat3Value')} label={t('marketing.about.stat3Label')} />
                </div>
            </div>
        </section>
    )
}

function StatCard({ value, label }: { value: string; label: string }) {
    return <div className="rounded-[var(--radius-panel)] border border-primary-foreground/15 bg-primary-foreground/[0.08] p-5 backdrop-blur-sm"><p className="text-2xl font-black text-primary">{value}</p><p className="mt-2 text-xs font-bold leading-5 text-primary-foreground/70">{label}</p></div>
}

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
    return <div className="max-w-3xl"><p className="text-xs font-black uppercase tracking-[0.16em] text-primary">{eyebrow}</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{title}</h2><p className="mt-4 text-base font-medium leading-7 text-muted-foreground">{description}</p></div>
}
