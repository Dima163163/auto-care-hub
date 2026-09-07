import { ArrowRight, Plus, Sparkles } from 'lucide-react'
import { Link } from 'react-router'

import { ROUTES } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'

type OwnerAutoCareDashboardHeroProps = { locale: string; ownerName: string | undefined }

export function OwnerAutoCareDashboardHero({ locale, ownerName }: OwnerAutoCareDashboardHeroProps) {
    const { t } = useTranslation()
    const titleCopy = t('autocare.ownerDashboardHeroTitle')
    const title = ownerName ? `${ownerName}, ${titleCopy[0].toLocaleLowerCase(locale)}${titleCopy.slice(1)}` : titleCopy
    return <section className="overflow-hidden rounded-[var(--radius-panel)] border border-primary/30 bg-card p-6 shadow-sm md:p-8"><div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end"><div className="max-w-2xl"><p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-primary"><Sparkles className="size-4" />{t('autocare.ownerDashboardHeroEyebrow')}</p><h1 className="mt-3 text-3xl font-black tracking-tight text-foreground md:text-4xl">{title}</h1><p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground md:text-base">{t('autocare.ownerDashboardHeroDescription')}</p></div><div className="flex flex-wrap gap-3"><Link to={ROUTES.ownerAutoCareRequests} className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-control)] border border-border bg-card px-4 text-sm font-black text-foreground transition hover:border-primary hover:text-primary"><ArrowRight className="size-4" />{t('autocare.ownerDashboardHeroRequests')}</Link><Link to={ROUTES.ownerAutoCareProviders} className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-control)] bg-primary px-4 text-sm font-black text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90"><Plus className="size-4" />{t('autocare.ownerDashboardHeroProfile')}</Link></div></div></section>
}
