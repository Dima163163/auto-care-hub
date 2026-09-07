import { BarChart3, Clock3, Eye, Gift, Repeat2, Star, Wrench } from 'lucide-react'

import type { AutoCareApiProvider, AutoCareProviderAnalytics } from '@/entities/automotive-service'
import { formatDurationMinutes, formatNumber } from '@/shared/lib/locale-format'
import { useTranslation } from '@/shared/lib/useTranslation'

type Props = {
    analytics?: AutoCareProviderAnalytics
    isLoading: boolean
    isError: boolean
    providers: AutoCareApiProvider[]
    selectedProviderId: string
    onProviderChange: (providerId: string) => void
    onRetry: () => unknown
}

export function OwnerAutoCareAnalyticsCard({ analytics, isLoading, isError, providers, selectedProviderId, onProviderChange, onRetry }: Props) {
    const { locale, t } = useTranslation()
    const formatInteger = (value: number) => formatNumber(value, locale, { maximumFractionDigits: 0 })
    const formatDecimal = (value: number) => formatNumber(value, locale, { maximumFractionDigits: 1 })
    return (
        <section className="rounded-[var(--radius-panel)] border bg-card p-5 shadow-sm sm:p-6">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">AutoCare</p>
                    <h2 className="mt-1 text-lg font-black tracking-tight">{t('autocare.ownerAnalyticsTitle')}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{t('autocare.ownerAnalyticsDescription')}</p>
                </div>
                <BarChart3 className="size-5 text-primary" aria-hidden="true" />
            </div>
            {providers.length > 1 && <div className="mt-4 flex flex-wrap gap-2" aria-label={t('autocare.ownerAnalyticsProviderChoice')}>{providers.map((provider) => <button key={provider.location.id} type="button" onClick={() => onProviderChange(provider.id)} aria-pressed={provider.id === selectedProviderId} className={`rounded-full border px-3 py-1.5 text-xs font-black transition ${provider.id === selectedProviderId ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-foreground hover:border-primary/50'}`}>{provider.name}</button>)}</div>}
            {isLoading && <div className="mt-5 grid animate-pulse gap-3 sm:grid-cols-3"><div className="h-16 rounded-xl bg-muted" /><div className="h-16 rounded-xl bg-muted" /><div className="h-16 rounded-xl bg-muted" /></div>}
            {isError && <div role="alert" className="mt-5 rounded-[var(--radius-card)] border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"><p className="font-bold">{t('autocare.ownerAnalyticsFailed')}</p><button type="button" onClick={() => void onRetry()} className="mt-2 text-xs font-black underline">{t('autocare.ownerAnalyticsRetry')}</button></div>}
            {!isLoading && analytics && <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <Metric icon={Wrench} label={t('autocare.ownerAnalyticsInquiries')} value={formatInteger(analytics.inquiries)} />
                <Metric icon={Clock3} label={t('autocare.ownerAnalyticsResponse')} value={analytics.averageResponseMinutes === null ? '—' : formatDurationMinutes(analytics.averageResponseMinutes, locale)} />
                <Metric icon={BarChart3} label={t('autocare.ownerAnalyticsQuoteConversion')} value={`${formatInteger(analytics.quoteConversionRate)}%`} />
                <Metric icon={Star} label={t('autocare.ownerAnalyticsRating')} value={`${formatDecimal(analytics.averageRating)} (${formatInteger(analytics.reviewCount)})`} />
                <Metric icon={Repeat2} label={t('autocare.ownerAnalyticsRepeatCustomers')} value={formatInteger(analytics.repeatCustomers)} />
                <Metric icon={Gift} label={t('autocare.ownerAnalyticsBonusLiability')} value={formatInteger(analytics.bonusLiabilityPoints)} />
                <Metric icon={Eye} label={t('autocare.ownerAnalyticsImpressions')} value={analytics.tracking.available ? formatInteger(analytics.tracking.impressions) : '—'} />
                <Metric icon={Eye} label={t('autocare.ownerAnalyticsProfileOpens')} value={analytics.tracking.available ? formatInteger(analytics.tracking.profileOpens) : '—'} />
            </div>}
            {!isLoading && analytics && <p className="mt-4 text-xs text-muted-foreground">{analytics.privacy.consentRequired ? t('autocare.ownerAnalyticsPrivacyConsent') : t('autocare.ownerAnalyticsPrivacyNoConsent')} · {t('autocare.ownerAnalyticsRetention')}: {formatInteger(analytics.privacy.retentionDays)} {t('autocare.ownerAnalyticsDays')}</p>}
        </section>
    )
}

function Metric({ icon: Icon, label, value }: { icon: typeof Wrench; label: string; value: string }) {
    return <div className="rounded-xl border bg-background p-3"><Icon className="size-4 text-primary" aria-hidden="true" /><p className="mt-2 text-xs text-muted-foreground">{label}</p><p className="mt-1 truncate text-sm font-bold">{value}</p></div>
}
