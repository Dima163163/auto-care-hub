import { Building2, ShieldAlert, Star, Users } from 'lucide-react'

import { formatNumber } from '@/shared/lib/locale-format'
import { useTranslation } from '@/shared/lib/useTranslation'

interface AdminAutoCareMetricGridProps {
    locale: string
    providers: { total: number; active: number; verified: number; draft: number }
    users: { total: number; owners: number }
}

export function AdminAutoCareMetricGrid({ locale, providers, users }: AdminAutoCareMetricGridProps) {
    const { t } = useTranslation()
    const formatInteger = (value: number) => formatNumber(value, locale, { maximumFractionDigits: 0 })
    const cards = [
        { icon: Building2, label: t('adminAutoCareDashboard.metrics.services'), value: providers.total, note: `${formatInteger(providers.active)} ${t('adminAutoCareDashboard.metrics.active')}` },
        { icon: ShieldAlert, label: t('adminAutoCareDashboard.metrics.review'), value: providers.draft, note: `${formatInteger(providers.draft)} ${t('adminAutoCareDashboard.metrics.reviewNote')}` },
        { icon: Star, label: t('adminAutoCareDashboard.metrics.trust'), value: providers.verified, note: t('adminAutoCareDashboard.metrics.signals') },
        { icon: Users, label: t('adminAutoCareDashboard.metrics.users'), value: users.total, note: `${formatInteger(users.owners)} ${t('adminAutoCareDashboard.metrics.owners')}` },
    ]
    return <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({ icon: Icon, label, value, note }) => <article key={label} className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm"><Icon className="size-5 text-primary" /><p className="mt-5 text-2xl font-black tabular-nums text-foreground">{formatInteger(value)}</p><p className="mt-1 text-sm font-bold text-foreground">{label}</p><p className="mt-1 text-xs text-muted-foreground">{note}</p></article>)}</section>
}
