import { BarChart3, Clock3, Eye, Gift, Repeat2, Star, Wrench } from 'lucide-react'

import type { AutoCareApiProvider, AutoCareProviderAnalytics } from '@/entities/automotive-service'

type Props = {
    locale: string
    analytics?: AutoCareProviderAnalytics
    isLoading: boolean
    isError: boolean
    providers: AutoCareApiProvider[]
    selectedProviderId: string
    onProviderChange: (providerId: string) => void
    onRetry: () => unknown
}

export function OwnerAutoCareAnalyticsCard({ locale, analytics, isLoading, isError, providers, selectedProviderId, onProviderChange, onRetry }: Props) {
    const text = locale === 'ru' ? copy.ru : copy.en
    return (
        <section className="rounded-[var(--radius-panel)] border bg-card p-5 shadow-sm sm:p-6">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">AutoCare</p>
                    <h2 className="mt-1 text-lg font-black tracking-tight">{text.title}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{text.description}</p>
                </div>
                <BarChart3 className="size-5 text-primary" aria-hidden="true" />
            </div>
            {providers.length > 1 && <div className="mt-4 flex flex-wrap gap-2" aria-label={text.providerChoice}>{providers.map((provider) => <button key={provider.location.id} type="button" onClick={() => onProviderChange(provider.id)} aria-pressed={provider.id === selectedProviderId} className={`rounded-full border px-3 py-1.5 text-xs font-black transition ${provider.id === selectedProviderId ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-foreground hover:border-primary/50'}`}>{provider.name}</button>)}</div>}
            {isLoading && <div className="mt-5 grid animate-pulse gap-3 sm:grid-cols-3"><div className="h-16 rounded-xl bg-muted" /><div className="h-16 rounded-xl bg-muted" /><div className="h-16 rounded-xl bg-muted" /></div>}
            {isError && <div role="alert" className="mt-5 rounded-[var(--radius-card)] border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"><p className="font-bold">{text.failed}</p><button type="button" onClick={() => void onRetry()} className="mt-2 text-xs font-black underline">{text.retry}</button></div>}
            {!isLoading && analytics && <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <Metric icon={Wrench} label={text.inquiries} value={String(analytics.inquiries)} />
                <Metric icon={Clock3} label={text.response} value={analytics.averageResponseMinutes === null ? '—' : `${analytics.averageResponseMinutes} ${text.minutes}`} />
                <Metric icon={BarChart3} label={text.quoteConversion} value={`${analytics.quoteConversionRate}%`} />
                <Metric icon={Star} label={text.rating} value={`${analytics.averageRating} (${analytics.reviewCount})`} />
                <Metric icon={Repeat2} label={text.repeatCustomers} value={String(analytics.repeatCustomers)} />
                <Metric icon={Gift} label={text.bonusLiability} value={String(analytics.bonusLiabilityPoints)} />
                <Metric icon={Eye} label={text.impressions} value={analytics.tracking.available ? String(analytics.tracking.impressions) : '—'} />
                <Metric icon={Eye} label={text.profileOpens} value={analytics.tracking.available ? String(analytics.tracking.profileOpens) : '—'} />
            </div>}
        </section>
    )
}

const copy = {
    ru: {
        title: 'Операционная аналитика', description: 'Заявки, запись, отзывы, бонусы и видимость выбранного сервиса.', providerChoice: 'Выбор сервиса для аналитики', failed: 'Не удалось загрузить аналитику.', retry: 'Повторить', inquiries: 'Заявки', response: 'Ответ', minutes: 'мин', quoteConversion: 'Конверсия смет', rating: 'Рейтинг', repeatCustomers: 'Повторные клиенты', bonusLiability: 'Бонусы в обороте', impressions: 'Показы', profileOpens: 'Открытия профиля',
    },
    en: {
        title: 'Operational analytics', description: 'Requests, bookings, reviews, bonuses and visibility for the selected service.', providerChoice: 'Choose service for analytics', failed: 'Could not load analytics.', retry: 'Retry', inquiries: 'Requests', response: 'Response', minutes: 'min', quoteConversion: 'Quote conversion', rating: 'Rating', repeatCustomers: 'Returning customers', bonusLiability: 'Bonus liability', impressions: 'Impressions', profileOpens: 'Profile opens',
    },
}

function Metric({ icon: Icon, label, value }: { icon: typeof Wrench; label: string; value: string }) {
    return <div className="rounded-xl border bg-background p-3"><Icon className="size-4 text-primary" aria-hidden="true" /><p className="mt-2 text-xs text-muted-foreground">{label}</p><p className="mt-1 truncate text-sm font-bold">{value}</p></div>
}
