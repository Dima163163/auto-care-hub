import { BarChart3, CalendarRange, FileText, MessageSquareText, Store, UserRound } from 'lucide-react'
import { Link } from 'react-router'

import { ROUTES } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'

export function OwnersGrowthSections() {
    const { t } = useTranslation()
    const features = [
        { icon: Store, title: t('marketing.owners.growth1Title'), text: t('marketing.owners.growth1Text') },
        { icon: MessageSquareText, title: t('marketing.owners.growth2Title'), text: t('marketing.owners.growth2Text') },
        { icon: BarChart3, title: t('marketing.owners.growth3Title'), text: t('marketing.owners.growth3Text') },
    ]
    const steps = [
        { icon: UserRound, title: t('marketing.owners.step1Title'), text: t('marketing.owners.step1Text') },
        { icon: FileText, title: t('marketing.owners.step2Title'), text: t('marketing.owners.step2Text') },
        { icon: CalendarRange, title: t('marketing.owners.step3Title'), text: t('marketing.owners.step3Text') },
        { icon: MessageSquareText, title: t('marketing.owners.step4Title'), text: t('marketing.owners.step4Text') },
    ]

    return <div className="mx-auto max-w-[var(--layout-public-max)] px-[var(--layout-gutter)] py-12 sm:py-16"><section><h2 className="text-center text-3xl font-black tracking-tight text-foreground">{t('marketing.owners.growthTitle')}</h2><div className="mt-7 grid gap-4 md:grid-cols-3">{features.map(({ icon: Icon, title, text }) => <article key={title} className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm"><span className="flex size-11 items-center justify-center rounded-[var(--radius-card)] bg-primary/10 text-primary"><Icon className="size-6" /></span><h3 className="mt-4 text-lg font-black text-foreground">{title}</h3><p className="mt-2 text-sm font-medium leading-6 text-muted-foreground">{text}</p><span className="mt-4 inline-flex text-sm font-black text-primary">{t('autocare.detailsAction')} →</span></article>)}</div></section><section className="mt-12"><h2 className="text-center text-2xl font-black tracking-tight text-foreground">{t('marketing.owners.stepsTitle')}</h2><ol className="mt-7 grid gap-5 md:grid-cols-4">{steps.map(({ icon: Icon, title, text }, index) => <li key={title} className="relative flex gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-black text-primary-foreground">{index + 1}</span><div><Icon className="size-5 text-primary" /><h3 className="mt-2 text-sm font-black text-foreground">{title}</h3><p className="mt-1 text-xs font-medium leading-5 text-muted-foreground">{text}</p></div></li>)}</ol></section><section className="mt-12 flex flex-col gap-5 rounded-[var(--radius-panel)] bg-hero-overlay p-7 text-primary-foreground md:flex-row md:items-center md:justify-between"><div><h2 className="text-2xl font-black tracking-tight">{t('marketing.owners.ctaTitle')}</h2><p className="mt-2 text-sm font-medium text-primary-foreground/70">{t('marketing.owners.ctaDescription')}</p></div><Link to={ROUTES.register} className="inline-flex h-12 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-primary px-5 text-sm font-black text-primary-foreground hover:bg-primary/90">{t('marketing.owners.ctaAction')}</Link></section></div>
}
