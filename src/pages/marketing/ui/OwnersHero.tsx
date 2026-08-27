import { ArrowRight, CalendarDays, MessageSquareText, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router'

import { ROUTES } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'

export function OwnersHero() {
    const { t } = useTranslation()

    return (
        <section className="relative isolate overflow-hidden bg-hero-overlay text-primary-foreground">
            <img src="/images/autocare/owners/workshop-hero.png" alt="Современный автосервис" className="absolute inset-0 -z-20 size-full object-cover object-center" />
            <div className="absolute inset-0 -z-10 bg-gradient-to-r from-hero-overlay via-hero-overlay/90 to-hero-overlay/25" aria-hidden="true" />
            <div className="mx-auto grid min-h-[620px] max-w-[var(--layout-public-max)] items-center gap-10 px-[var(--layout-gutter)] py-14 lg:grid-cols-[0.92fr_1.08fr] lg:py-16">
                <div className="max-w-[36rem]">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">{t('marketing.owners.eyebrow')}</p>
                    <h1 className="mt-4 text-4xl font-black leading-[1.08] tracking-[-0.035em] sm:text-5xl">{t('marketing.owners.heroTitle')}</h1>
                    <p className="mt-5 max-w-xl text-lg font-medium leading-7 text-primary-foreground/80">{t('marketing.owners.heroDescription')}</p>
                    <div className="mt-8 flex flex-wrap gap-3"><Link to={ROUTES.register} className="inline-flex h-12 items-center gap-2 rounded-[var(--radius-control)] bg-primary px-5 text-sm font-black text-primary-foreground shadow-xl shadow-primary/25 hover:bg-primary/90">{t('marketing.owners.primaryAction')}<ArrowRight className="size-4" /></Link><Link to={ROUTES.help} className="inline-flex h-12 items-center rounded-[var(--radius-control)] border border-primary-foreground/30 px-5 text-sm font-black text-primary-foreground hover:bg-primary-foreground/10">{t('marketing.owners.secondaryAction')}</Link></div>
                    <div className="mt-10 grid gap-4 sm:grid-cols-3"><OwnerBenefits /></div>
                </div>
                <RequestPreview />
            </div>
        </section>
    )
}

function OwnerBenefits() {
    const { t } = useTranslation()
    const benefits = [
        { icon: ShieldCheck, title: t('marketing.owners.benefit1Title'), text: t('marketing.owners.benefit1Text') },
        { icon: MessageSquareText, title: t('marketing.owners.benefit2Title'), text: t('marketing.owners.benefit2Text') },
        { icon: CalendarDays, title: t('marketing.owners.benefit3Title'), text: t('marketing.owners.benefit3Text') },
    ]

    return <>{benefits.map(({ icon: Icon, title, text }) => <div key={title} className="flex gap-2.5"><span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"><Icon className="size-4" /></span><p className="text-xs font-bold leading-5"><span className="block">{title}</span><span className="block font-medium text-primary-foreground/65">{text}</span></p></div>)}</>
}

function RequestPreview() {
    const { t } = useTranslation()

    return <div className="hidden justify-self-end rounded-[var(--radius-panel)] border border-primary-foreground/30 bg-card p-5 text-foreground shadow-2xl shadow-black/35 lg:block"><div className="flex items-center justify-between border-b border-border pb-4"><div><p className="text-xs font-black text-foreground">{t('marketing.owners.previewNewRequest')}</p><p className="mt-1 text-[11px] font-semibold text-muted-foreground">{t('marketing.owners.previewTime')}</p></div><span className="rounded-full bg-status-success-surface px-2.5 py-1 text-[10px] font-black text-status-success-foreground">{t('marketing.owners.previewNew')}</span></div><div className="grid grid-cols-[1fr_0.94fr] gap-5 pt-5"><div className="space-y-4"><div><p className="text-sm font-black">Алексей Смирнов</p><p className="mt-1 text-xs font-medium text-muted-foreground">+7 (495) 123-45-67</p></div><div className="rounded-[var(--radius-card)] bg-secondary p-3"><p className="text-xs font-black">Volkswagen Tiguan</p><p className="mt-1 text-[11px] font-medium text-muted-foreground">2018 · 2.0 TSI · 78 500 км</p></div><p className="text-xs font-medium leading-5 text-muted-foreground">{t('marketing.owners.previewIssue')}</p><div className="flex gap-2"><button type="button" className="h-9 rounded-[var(--radius-control)] bg-primary px-3 text-xs font-black text-primary-foreground">{t('marketing.owners.previewAccept')}</button><button type="button" className="h-9 rounded-[var(--radius-control)] border border-border px-3 text-xs font-black">{t('marketing.owners.previewMessage')}</button></div></div><div className="border-l border-border pl-5"><p className="text-xs font-black">{t('marketing.owners.previewServices')}</p><p className="mt-4 text-sm font-black">{t('marketing.owners.previewService')}</p><p className="mt-1 text-sm font-black text-primary">4 500 ₽</p><p className="mt-1 text-[11px] font-medium text-muted-foreground">{t('marketing.owners.previewDuration')}</p><div className="mt-7 rounded-[var(--radius-card)] border border-border p-3"><p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">{t('marketing.owners.previewStatus')}</p><p className="mt-1 text-xs font-black text-status-success-foreground">● {t('marketing.owners.previewNew')}</p></div></div></div></div>
}
