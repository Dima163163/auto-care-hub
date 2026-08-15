import { BadgeCheck, CarFront, Star } from 'lucide-react'

import { getProviderProfile, useGetFeaturedAutoCareReviewsQuery } from '@/entities/automotive-service'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { useTranslation } from '@/shared/lib/useTranslation'
import { PageHeader } from '@/shared/ui/page-header'
import { RetryButton } from '@/shared/ui/query-refresh-error'
import { ReviewsSkeleton } from '@/shared/ui/loading-skeleton'

export function AdminReviewsPage() {
    const { locale, t } = useTranslation()
    const query = useGetFeaturedAutoCareReviewsQuery(12)
    const copy = locale === 'ru'
        ? { eyebrow: 'Модерация качества', title: 'Отзывы об автосервисах', description: 'Проверяйте опубликованные автомобильные отзывы: оценку, автомобиль клиента и текст обращения.' }
        : { eyebrow: 'Quality moderation', title: 'Automotive service reviews', description: 'Review published automotive feedback, customer vehicle details and rating signals.' }
    return <main className="min-h-full bg-background px-[var(--layout-gutter)] py-7 lg:py-10"><section className="mx-auto max-w-6xl"><PageHeader eyebrow={copy.eyebrow} title={copy.title} description={copy.description} />{query.isLoading && <ReviewsSkeleton label={t('common.loading')} />}{query.error && <div className="rounded-[var(--radius-panel)] border border-destructive/30 bg-card p-6"><p className="font-semibold text-destructive">{getApiErrorMessage(query.error, t('common.failedToLoad'))}</p><RetryButton className="mt-4" onRetry={query.refetch} label={t('common.retry')} /></div>}{query.data && <div className="grid gap-4 lg:grid-cols-2">{query.data.map((review) => { const provider = getProviderProfile(review.providerId.replace(/^api-/, '')); return <article key={review.id} className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm"><div className="flex items-start justify-between gap-4"><div><p className="flex items-center gap-1 text-sm font-black text-foreground"><CarFront className="size-4 text-primary" />{provider?.name ?? review.providerId}</p><p className="mt-1 text-xs font-semibold text-muted-foreground">{review.authorName} · {review.vehicleLabel}</p></div><span className="inline-flex items-center gap-1 rounded-full bg-status-success-surface px-2 py-1 text-[11px] font-black text-status-success-foreground"><BadgeCheck className="size-3.5" />{locale === 'ru' ? 'Опубликован' : 'Published'}</span></div><p className="mt-4 inline-flex items-center gap-1 text-sm font-black text-rating-foreground"><Star className="size-4 fill-current" />{review.rating.toFixed(1)}</p><p className="mt-3 text-sm leading-6 text-muted-foreground">{review.text}</p><p className="mt-5 text-xs font-semibold text-muted-foreground">{new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(review.createdAt))}</p></article> })}</div>}</section></main>
}
