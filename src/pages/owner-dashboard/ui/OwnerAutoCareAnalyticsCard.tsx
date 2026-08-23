import { BarChart3, Clock3, Gift, Repeat2, Star, Wrench } from 'lucide-react'

import type { AutoCareProviderAnalytics } from '@/entities/automotive-service'

type Props = { analytics?: AutoCareProviderAnalytics; isLoading: boolean }

export function OwnerAutoCareAnalyticsCard({ analytics, isLoading }: Props) {
    return (
        <section className="rounded-[var(--radius-panel)] border bg-card p-5 shadow-sm sm:p-6">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">AutoCare</p>
                    <h2 className="mt-1 text-lg font-black tracking-tight">Операционная аналитика</h2>
                    <p className="mt-1 text-sm text-muted-foreground">Заявки, запись, отзывы и бонусная нагрузка по первому филиалу.</p>
                </div>
                <BarChart3 className="size-5 text-primary" aria-hidden="true" />
            </div>
            {isLoading && <div className="mt-5 grid animate-pulse gap-3 sm:grid-cols-3"><div className="h-16 rounded-xl bg-muted" /><div className="h-16 rounded-xl bg-muted" /><div className="h-16 rounded-xl bg-muted" /></div>}
            {!isLoading && analytics && <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <Metric icon={Wrench} label="Заявки" value={String(analytics.inquiries)} />
                <Metric icon={Clock3} label="Ответ" value={analytics.averageResponseMinutes === null ? '—' : `${analytics.averageResponseMinutes} мин`} />
                <Metric icon={BarChart3} label="Конверсия смет" value={`${analytics.quoteConversionRate}%`} />
                <Metric icon={Star} label="Рейтинг" value={`${analytics.averageRating} (${analytics.reviewCount})`} />
                <Metric icon={Repeat2} label="Повторные клиенты" value={String(analytics.repeatCustomers)} />
                <Metric icon={Gift} label="Бонусы в обороте" value={String(analytics.bonusLiabilityPoints)} />
            </div>}
        </section>
    )
}

function Metric({ icon: Icon, label, value }: { icon: typeof Wrench; label: string; value: string }) {
    return <div className="rounded-xl border bg-background p-3"><Icon className="size-4 text-primary" aria-hidden="true" /><p className="mt-2 text-xs text-muted-foreground">{label}</p><p className="mt-1 truncate text-sm font-bold">{value}</p></div>
}
