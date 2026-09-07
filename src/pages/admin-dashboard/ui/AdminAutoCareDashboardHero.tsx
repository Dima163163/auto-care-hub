import { ShieldCheck, UsersRound } from 'lucide-react'

import { useTranslation } from '@/shared/lib/useTranslation'
import { formatNumber } from '@/shared/lib/locale-format'

type AdminAutoCareDashboardHeroProps = { locale: string; pendingCount: number }

export function AdminAutoCareDashboardHero({ locale, pendingCount }: AdminAutoCareDashboardHeroProps) {
    const { t } = useTranslation()
    return <section className="overflow-hidden rounded-[var(--radius-panel)] border border-primary/30 bg-[linear-gradient(124deg,hsl(var(--primary)/0.17),hsl(var(--card)),hsl(var(--card)))] p-6 shadow-sm md:p-8"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div className="max-w-2xl"><p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-primary"><ShieldCheck className="size-4" />{t('adminAutoCareDashboard.hero.eyebrow')}</p><h1 className="mt-3 text-3xl font-black tracking-tight text-foreground md:text-4xl">{t('adminAutoCareDashboard.hero.title')}</h1><p className="mt-3 text-sm leading-6 text-muted-foreground md:text-base">{t('adminAutoCareDashboard.hero.description')}</p></div><span className="inline-flex items-center gap-2 rounded-[var(--radius-control)] bg-card px-4 py-3 text-sm font-black text-foreground shadow-sm"><UsersRound className="size-4 text-primary" /><b>{formatNumber(pendingCount, locale, { maximumFractionDigits: 0 })}</b> {t('adminAutoCareDashboard.hero.pending')}</span></div></section>
}
