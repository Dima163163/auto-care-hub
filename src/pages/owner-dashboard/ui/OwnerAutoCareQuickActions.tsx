import { BarChart3, CarFront, ClipboardList, MessageSquareText } from 'lucide-react'
import { Link } from 'react-router'

import { ROUTES } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'

export function OwnerAutoCareQuickActions() {
    const { t } = useTranslation()
    const actions = [{ icon: CarFront, label: t('autocare.ownerDashboardQuickProviders'), to: ROUTES.ownerAutoCareProviders }, { icon: MessageSquareText, label: t('autocare.ownerDashboardQuickRequests'), to: ROUTES.ownerAutoCareRequests }, { icon: ClipboardList, label: t('autocare.ownerDashboardQuickServices'), to: ROUTES.ownerServices }, { icon: BarChart3, label: t('autocare.ownerDashboardQuickAnalytics'), to: ROUTES.ownerDashboard }]
    return <section className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm"><h2 className="text-lg font-black text-foreground">{t('autocare.ownerDashboardQuickTitle')}</h2><p className="mt-1 text-sm text-muted-foreground">{t('autocare.ownerDashboardQuickSubtitle')}</p><div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{actions.map(({ icon: Icon, label, to }) => <Link key={label} to={to} className="flex min-h-24 flex-col justify-between rounded-[var(--radius-card)] border border-border bg-background p-4 transition hover:border-primary/50 hover:bg-primary/5"><Icon className="size-5 text-primary" /><span className="mt-5 text-sm font-black text-foreground">{label}</span></Link>)}</div></section>
}
