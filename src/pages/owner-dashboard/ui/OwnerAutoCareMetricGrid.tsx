import { BarChart3, CircleDollarSign, MessagesSquare, Star } from 'lucide-react'

import type { OwnerAutoCareMetrics } from '../lib/ownerAutoCareMetrics'

type OwnerAutoCareMetricGridProps = { locale: string; metrics: OwnerAutoCareMetrics }

const copy = {
    en: { requests: 'Requests waiting', confirmed: 'Confirmed requests', conversion: 'Request conversion', revenue: 'Confirmed estimates', rating: 'Average rating' },
    ru: { requests: 'Заявок ждут ответа', confirmed: 'Подтверждённых заявок', conversion: 'Конверсия заявок', revenue: 'Подтверждённые сметы', rating: 'Средний рейтинг' },
}

export function OwnerAutoCareMetricGrid({ locale, metrics }: OwnerAutoCareMetricGridProps) {
    const text = locale === 'ru' ? copy.ru : copy.en
    const cards = [
        { icon: MessagesSquare, label: text.requests, value: String(metrics.needsReply), note: `${metrics.openRequests} ${locale === 'ru' ? 'всего' : 'total'}` },
        { icon: BarChart3, label: text.conversion, value: `${metrics.conversionRate}%`, note: `${metrics.confirmedRequests} ${text.confirmed.toLocaleLowerCase()}` },
        { icon: CircleDollarSign, label: text.revenue, value: new Intl.NumberFormat(locale, { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(metrics.estimatedRevenueMinor / 100), note: locale === 'ru' ? 'Только по согласованным сметам' : 'Accepted estimates only' },
        { icon: Star, label: text.rating, value: metrics.averageRating ? metrics.averageRating.toFixed(1) : '—', note: `${metrics.activeProviders} ${locale === 'ru' ? 'активных точек' : 'active locations'}` },
    ]
    return <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({ icon: Icon, label, value, note }) => <article key={label} className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm"><Icon className="size-5 text-primary" /><p className="mt-5 text-2xl font-black tabular-nums text-foreground">{value}</p><p className="mt-1 text-sm font-bold text-foreground">{label}</p><p className="mt-1 text-xs font-medium text-muted-foreground">{note}</p></article>)}</section>
}
