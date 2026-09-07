import { BarChart3, CircleDollarSign, MessagesSquare, Star } from 'lucide-react'

import { formatCurrency } from '@/shared/lib/locale-format'
import { useTranslation } from '@/shared/lib/useTranslation'

import type { OwnerAutoCareMetrics } from '../lib/ownerAutoCareMetrics'

type OwnerAutoCareMetricGridProps = { locale: string; metrics: OwnerAutoCareMetrics }

export function OwnerAutoCareMetricGrid({ locale, metrics }: OwnerAutoCareMetricGridProps) {
    const { t } = useTranslation()
    const cards = [
        { icon: MessagesSquare, label: t('autocare.ownerMetricsRequests'), value: String(metrics.needsReply), note: `${metrics.openRequests} ${t('autocare.ownerMetricsTotal')}` },
        { icon: BarChart3, label: t('autocare.ownerMetricsConversion'), value: `${metrics.conversionRate}%`, note: `${metrics.confirmedRequests} ${t('autocare.ownerMetricsConfirmed').toLocaleLowerCase(locale)}` },
        { icon: CircleDollarSign, label: t('autocare.ownerMetricsRevenue'), value: formatCurrency(metrics.estimatedRevenueMinor / 100, 'RUB', locale), note: t('autocare.ownerMetricsAcceptedEstimateNote') },
        { icon: Star, label: t('autocare.ownerMetricsRating'), value: metrics.averageRating ? metrics.averageRating.toFixed(1) : '—', note: `${metrics.activeProviders} ${t('autocare.ownerMetricsActiveLocations')}` },
    ]
    return <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({ icon: Icon, label, value, note }) => <article key={label} className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm"><Icon className="size-5 text-primary" /><p className="mt-5 text-2xl font-black tabular-nums text-foreground">{value}</p><p className="mt-1 text-sm font-bold text-foreground">{label}</p><p className="mt-1 text-xs font-medium text-muted-foreground">{note}</p></article>)}</section>
}
