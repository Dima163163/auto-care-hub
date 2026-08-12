import { Gift, MessageCircle, Sparkles } from 'lucide-react'
import { Link } from 'react-router'

import { ROUTES } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'

export function OwnerGrowthPanel() {
    const { t } = useTranslation()
    const items = [
        { icon: Sparkles, title: t('ownerDashboard.growth.subscriptionTitle'), text: t('ownerDashboard.growth.subscriptionText'), action: t('ownerDashboard.growth.subscriptionAction'), to: ROUTES.pricing },
        { icon: Gift, title: t('ownerDashboard.growth.bonusesTitle'), text: t('ownerDashboard.growth.bonusesText'), action: t('ownerDashboard.growth.bonusesAction'), to: ROUTES.ownerServices },
        { icon: MessageCircle, title: t('ownerDashboard.growth.messagesTitle'), text: t('ownerDashboard.growth.messagesText'), action: t('ownerDashboard.growth.messagesAction'), to: ROUTES.ownerBookings },
    ]

    return <section className="rounded-[var(--radius-panel)] bg-hero-overlay p-5 text-primary-foreground shadow-sm sm:p-6"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-primary-foreground/60">{t('ownerDashboard.growth.eyebrow')}</p><h2 className="mt-1 text-xl font-black tracking-tight">{t('ownerDashboard.growth.title')}</h2><p className="mt-1 max-w-2xl text-sm font-medium text-primary-foreground/70">{t('ownerDashboard.growth.description')}</p></div><span className="rounded-full border border-primary-foreground/15 bg-primary-foreground/10 px-3 py-1.5 text-xs font-bold">{t('ownerDashboard.growth.freePlan')}</span></div><div className="mt-5 grid gap-3 lg:grid-cols-3">{items.map(({ icon: Icon, title, text, action, to }) => <Link key={title} to={to} className="group rounded-[var(--radius-card)] border border-primary-foreground/15 bg-primary-foreground/10 p-4 transition hover:border-primary hover:bg-primary-foreground/15"><Icon className="size-5 text-primary" /><h3 className="mt-3 text-sm font-black">{title}</h3><p className="mt-1 text-xs font-medium leading-5 text-primary-foreground/70">{text}</p><span className="mt-3 inline-flex text-xs font-bold text-primary group-hover:underline">{action} →</span></Link>)}</div></section>
}
