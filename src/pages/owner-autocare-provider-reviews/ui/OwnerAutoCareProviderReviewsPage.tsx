import { ArrowLeft, BarChart3, CarFront, Check, ChevronDown, Copy, Gift, MessageCircle, MessageSquare, Star, Tag, X } from 'lucide-react'
import type { ComponentType, ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'

import {
    useGetOwnerAutoCareReviewsQuery,
    type OwnerAutoCareReviewsProvider,
    type OwnerAutoCareReviews,
    type AutoCareApiReview,
} from '@/entities/automotive-service'
import { useIssueOwnerAutoCareReviewPromoMutation } from '@/entities/automotive-service'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { routePaths, ROUTES } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'
import { PageHeader } from '@/shared/ui/page-header'
import { RetryButton } from '@/shared/ui/query-refresh-error'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { ReviewsSkeleton } from '@/shared/ui/loading-skeleton'

const ratingRows = [5, 4, 3, 2, 1] as const
type RatingFilter = 'all' | `${typeof ratingRows[number]}`
type ReviewsCopy = {
    eyebrow: string
    title: string
    description: string
    back: string
    average: string
    total: string
    allLocations: string
    locationFilterLabel: string
    distribution: string
    all: string
    review: string
    empty: string
    published: string
    noProvider: string
    contact: string
    contactUnavailable: string
    issueDiscount: string
    discountPercent: string
    serviceOptional: string
    expiresInDays: string
    issue: string
    cancel: string
    promoCreated: string
    promoNote: string
    copyCode: string
    copied: string
    close: string
}

export function OwnerAutoCareProviderReviewsPage() {
    const { locale, t } = useTranslation()
    const { id } = useParams<{ id: string }>()
    const [searchParams, setSearchParams] = useSearchParams()
    const selectedProviderId = searchParams.get('provider') ?? id ?? undefined
    const reviews = useGetOwnerAutoCareReviewsQuery(selectedProviderId)
    const [ratingFilter, setRatingFilter] = useState<RatingFilter>('all')
    const provider = reviews.data?.providers.find((item) => item.id === selectedProviderId)
    const filteredReviews = useMemo(
        () => filterReviews(reviews.data?.reviews ?? [], ratingFilter),
        [ratingFilter, reviews.data?.reviews],
    )
    const copy = getReviewsCopy(locale)

    if (reviews.isLoading) {
        return <ReviewsShell><ReviewsSkeleton label={t('common.loading')} /></ReviewsShell>
    }

    if (reviews.error) {
        return <ReviewsShell><ErrorState error={reviews.error} copy={copy} onRetry={() => void reviews.refetch()} t={t} /></ReviewsShell>
    }

    if (!reviews.data || (selectedProviderId && !provider)) {
        return <ReviewsShell><EmptyState message={copy.noProvider} /></ReviewsShell>
    }

    return (
        <ReviewsShell>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <Link to={ROUTES.ownerServices} className="inline-flex items-center gap-2 text-sm font-black text-primary hover:underline">
                    <ArrowLeft className="size-4" />{copy.back}
                </Link>
                {provider && <Link to={routePaths.ownerAutoCareProviderDetails(provider.id)} className="text-sm font-black text-primary hover:underline">{provider.name}</Link>}
            </div>
            <PageHeader eyebrow={copy.eyebrow} title={copy.title} description={copy.description} />
            <LocationFilter providers={reviews.data.providers} value={selectedProviderId ?? ''} label={copy.locationFilterLabel} allLabel={copy.allLocations} onChange={(value) => setSearchParams(value ? { provider: value } : {})} />
            <ProviderReviewOverview provider={provider} stats={reviews.data} copy={copy} />
            <ReviewsList reviews={filteredReviews} ratingFilter={ratingFilter} onRatingFilterChange={setRatingFilter} copy={copy} locale={locale} />
        </ReviewsShell>
    )
}

function LocationFilter({ providers, value, label, allLabel, onChange }: { providers: OwnerAutoCareReviewsProvider[]; value: string; label: string; allLabel: string; onChange: (value: string) => void }) {
    return <section className="rounded-[var(--radius-panel)] border border-border bg-card p-4 shadow-sm"><label className="grid max-w-xl gap-1.5 text-xs font-black text-foreground"><span>{label}</span><span className="relative"><select value={value} onChange={(event) => onChange(event.target.value)} className="select-with-icon h-11 w-full appearance-none rounded-[var(--radius-control)] border border-border bg-background px-3 pr-10 text-sm font-bold"><option value="">{allLabel}</option>{providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.name} · {provider.address}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /></span></label></section>
}

function ProviderReviewOverview({ provider, stats, copy }: { provider?: OwnerAutoCareReviewsProvider; stats: OwnerAutoCareReviews; copy: ReviewsCopy }) {
    return (
        <section className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm md:p-6">
            <div className="flex flex-wrap items-center gap-4 border-b border-border pb-5">
                <span className="flex size-12 items-center justify-center rounded-[var(--radius-control)] bg-primary/10 text-primary"><CarFront className="size-6" /></span>
                <div className="min-w-0 flex-1"><h2 className="truncate text-lg font-black text-foreground">{provider?.name ?? copy.allLocations}</h2><p className="mt-1 text-xs font-semibold text-muted-foreground">{provider?.address ?? copy.allLocations}</p></div>
                <div className="flex items-center gap-1 text-lg font-black text-status-warning-foreground"><Star className="size-5 fill-current" />{stats.averageRating.toFixed(1)}</div>
            </div>
            <div className="mt-5 grid gap-4 lg:grid-cols-[180px_minmax(0,1fr)_180px]">
                <div className="rounded-[var(--radius-card)] bg-primary/5 p-4"><p className="text-4xl font-black text-foreground">{stats.averageRating.toFixed(1)}</p><div className="mt-2 flex gap-0.5 text-status-warning-foreground">{ratingRows.map((rating) => <Star key={rating} className={`size-4 ${rating <= Math.round(stats.averageRating) ? 'fill-current' : ''}`} />)}</div><p className="mt-2 text-xs font-semibold text-muted-foreground">{stats.totalReviews} {copy.review}</p></div>
                <div className="rounded-[var(--radius-card)] border border-border p-4"><h3 className="text-sm font-black text-foreground">{copy.distribution}</h3><div className="mt-3 grid gap-2">{ratingRows.map((rating) => <RatingRow key={rating} rating={rating} count={stats.distribution[String(rating) as keyof typeof stats.distribution]} total={stats.totalReviews} />)}</div></div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1"><StatCard icon={MessageSquare} label={copy.total} value={String(stats.totalReviews)} /><StatCard icon={BarChart3} label={copy.average} value={stats.averageRating.toFixed(1)} /></div>
            </div>
        </section>
    )
}

function ReviewsList({ reviews, ratingFilter, onRatingFilterChange, copy, locale }: { reviews: AutoCareApiReview[]; ratingFilter: RatingFilter; onRatingFilterChange: (value: RatingFilter) => void; copy: ReviewsCopy; locale: string }) {
    return (
        <section className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black text-foreground">{copy.title}</h2><RatingFilterSelect value={ratingFilter} onChange={onRatingFilterChange} label={copy.all} /></div>
            {reviews.length === 0 ? <EmptyState message={copy.empty} className="mt-5" /> : <div className="mt-5 grid gap-4 lg:grid-cols-2">{reviews.map((review) => <ReviewCard key={review.id} review={review} copy={copy} locale={locale} />)}</div>}
        </section>
    )
}

function ReviewCard({ review, copy, locale }: { review: AutoCareApiReview; copy: ReviewsCopy; locale: string }) {
    const publishedAt = new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(review.createdAt))
    return <article className="flex min-h-[220px] flex-col rounded-[var(--radius-card)] border border-border bg-background p-4"><div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-sm font-black text-primary">{review.avatarUrl ? <img src={review.avatarUrl} alt="" className="size-full object-cover" /> : review.authorName.slice(0, 1)}</span><div className="min-w-0 flex-1"><p className="font-black text-foreground">{review.authorName}</p><p className="mt-1 text-xs font-semibold text-muted-foreground">{review.vehicleLabel}</p>{review.providerName && <p className="mt-1 truncate text-[11px] font-bold text-primary">{review.providerName} · {review.providerAddress}</p>}</div><span className="inline-flex items-center gap-1 text-sm font-black text-status-warning-foreground"><Star className="size-4 fill-current" />{review.rating.toFixed(1)}</span></div><p className="mt-4 text-sm leading-6 text-muted-foreground">{review.text}</p>{review.photoUrls.length > 0 && <div className="mt-4 grid grid-cols-2 gap-2">{review.photoUrls.map((photoUrl) => <img key={photoUrl} src={photoUrl} alt="Фото выполненной работы" loading="lazy" className="aspect-[4/3] w-full rounded-[var(--radius-control)] object-cover" />)}</div>}<div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4"><span className="text-xs font-semibold text-muted-foreground">{publishedAt}</span><span className="rounded-full bg-status-success-surface px-2 py-1 text-xs font-semibold text-status-success-foreground">{copy.published}</span></div><div className="mt-3 flex flex-wrap gap-2"><Link to={review.serviceRequestId ? `${ROUTES.ownerChats}?request=${review.serviceRequestId}` : '#'} aria-disabled={!review.serviceRequestId} onClick={(event) => { if (!review.serviceRequestId) event.preventDefault() }} className={`inline-flex items-center gap-1.5 rounded-[var(--radius-control)] border px-3 py-2 text-xs font-black transition ${review.serviceRequestId ? 'border-primary/30 text-primary hover:bg-primary/10' : 'cursor-not-allowed border-border text-muted-foreground'}`}><MessageCircle className="size-3.5" />{review.serviceRequestId ? copy.contact : copy.contactUnavailable}</Link><ReviewResolutionDialog providerId={review.providerId} review={review} copy={copy} /></div></article>
}

function ReviewResolutionDialog({ providerId, review, copy }: { providerId: string; review: AutoCareApiReview; copy: ReviewsCopy }) {
    const [isOpen, setIsOpen] = useState(false)
    const [discountPercent, setDiscountPercent] = useState('10')
    const [expiresInDays, setExpiresInDays] = useState('30')
    const [promoCode, setPromoCode] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)
    const [issuePromo, issueState] = useIssueOwnerAutoCareReviewPromoMutation()
    const close = () => { setIsOpen(false); setPromoCode(null); setCopied(false) }
    const submit = async () => {
        const promo = await issuePromo({ providerId, reviewId: review.id, discountPercent: Number(discountPercent), expiresInDays: Number(expiresInDays), serviceSlug: review.serviceSlug ?? null }).unwrap()
        setPromoCode(promo.code)
    }
    const copyCode = async () => {
        if (!promoCode) return
        await navigator.clipboard?.writeText(promoCode)
        setCopied(true)
    }
    if (!review.serviceRequestId) return null
    return <><button type="button" onClick={() => setIsOpen(true)} className="inline-flex items-center gap-1.5 rounded-[var(--radius-control)] bg-primary px-3 py-2 text-xs font-black text-primary-foreground transition hover:bg-primary/90"><Gift className="size-3.5" />{copy.issueDiscount}</button><Dialog isOpen={isOpen} onOpenChange={(open) => open ? setIsOpen(true) : close()} className="max-w-md"><DialogContent><DialogHeader><DialogTitle className="flex items-center gap-2"><Tag className="size-5 text-primary" />{copy.issueDiscount}</DialogTitle><DialogDescription>{copy.promoNote}</DialogDescription></DialogHeader>{promoCode ? <div className="mt-5 rounded-[var(--radius-card)] border border-status-success-foreground/30 bg-status-success-surface p-4"><p className="text-sm font-black text-status-success-foreground">{copy.promoCreated}</p><div className="mt-3 flex items-center gap-2"><code className="flex-1 rounded-[var(--radius-control)] bg-background px-3 py-2 text-center text-lg font-black tracking-widest text-foreground">{promoCode}</code><button type="button" onClick={() => void copyCode()} aria-label={copy.copyCode} className="flex size-10 items-center justify-center rounded-[var(--radius-control)] border border-border bg-card text-primary hover:bg-primary/10">{copied ? <Check className="size-4" /> : <Copy className="size-4" />}</button></div><p className="mt-2 text-xs text-muted-foreground">{copy.copyCode}</p></div> : <div className="mt-5 grid gap-4"><label className="grid gap-1.5 text-sm font-bold text-foreground"><span>{copy.discountPercent}</span><input type="number" min="1" max="100" value={discountPercent} onChange={(event) => setDiscountPercent(event.target.value)} className="h-11 rounded-[var(--radius-control)] border border-border bg-background px-3" /></label><label className="grid gap-1.5 text-sm font-bold text-foreground"><span>{copy.expiresInDays}</span><input type="number" min="1" max="90" value={expiresInDays} onChange={(event) => setExpiresInDays(event.target.value)} className="h-11 rounded-[var(--radius-control)] border border-border bg-background px-3" /></label></div>}<DialogFooter>{promoCode ? <button type="button" onClick={close} className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-primary px-4 text-sm font-black text-primary-foreground"><X className="size-4" />{copy.close}</button> : <><button type="button" onClick={close} className="inline-flex h-10 items-center justify-center rounded-[var(--radius-control)] border border-border px-4 text-sm font-black text-foreground">{copy.cancel}</button><button type="button" disabled={issueState.isLoading} onClick={() => void submit()} className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-primary px-4 text-sm font-black text-primary-foreground disabled:opacity-60"><Gift className="size-4" />{copy.issue}</button></>}</DialogFooter></DialogContent></Dialog></>
}

function RatingFilterSelect({ value, onChange, label }: { value: RatingFilter; onChange: (value: RatingFilter) => void; label: string }) {
    return <label className="relative"><span className="sr-only">{label}</span><select value={value} onChange={(event) => onChange(event.target.value as RatingFilter)} className="select-with-icon h-10 appearance-none rounded-[var(--radius-control)] border border-border bg-background px-3 pr-9 text-sm font-bold"><option value="all">{label}</option>{ratingRows.map((rating) => <option key={rating} value={rating}>{rating} ★</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /></label>
}

function RatingRow({ rating, count, total }: { rating: number; count: number; total: number }) {
    const percentage = total === 0 ? 0 : Math.round((count / total) * 100)
    return <div className="grid grid-cols-[28px_minmax(0,1fr)_34px] items-center gap-2 text-xs font-bold text-muted-foreground"><span>{rating} ★</span><span className="h-2 overflow-hidden rounded-full bg-secondary"><span className="block h-full rounded-full bg-status-warning-foreground" style={{ width: `${percentage}%` }} /></span><span className="text-right">{count}</span></div>
}

function StatCard({ icon: Icon, label, value }: { icon: ComponentType<{ className?: string }>; label: string; value: string }) {
    return <div className="rounded-[var(--radius-card)] border border-border p-3"><Icon className="size-4 text-primary" /><p className="mt-2 text-[11px] font-bold text-muted-foreground">{label}</p><p className="mt-1 text-xl font-black text-foreground">{value}</p></div>
}

function ReviewsShell({ children }: { children: ReactNode }) {
    return <main className="min-h-full bg-background px-[var(--layout-gutter)] py-7 lg:py-10"><section className="mx-auto max-w-6xl space-y-5">{children}</section></main>
}

function EmptyState({ message, className = '' }: { message: string; className?: string }) { return <p className={`${className} rounded-[var(--radius-card)] border border-dashed border-border p-8 text-center text-sm font-semibold text-muted-foreground`}>{message}</p> }
function ErrorState({ error, copy, onRetry, t }: { error: unknown; copy: ReviewsCopy; onRetry: () => void; t: (key: 'common.failedToLoad' | 'common.retry') => string }) { return <div className="rounded-[var(--radius-panel)] border border-destructive/30 bg-card p-6"><p className="font-semibold text-destructive">{getApiErrorMessage(error, t('common.failedToLoad'))}</p><RetryButton className="mt-4" onRetry={onRetry} label={t('common.retry')} /><span className="sr-only">{copy.title}</span></div> }

function filterReviews(reviews: AutoCareApiReview[], filter: RatingFilter) {
    return filter === 'all' ? reviews : reviews.filter((review) => review.rating === Number(filter))
}

function getReviewsCopy(locale: string): ReviewsCopy {
        return locale === 'ru'
        ? { eyebrow: 'Рабочая область сервиса', title: 'Отзывы клиентов', description: 'Изучайте отзывы по всем филиалам, выбирайте адрес и сразу переходите к решению вопроса с клиентом.', back: 'Вернуться к услугам и ценам', average: 'Средняя оценка', total: 'Всего отзывов', allLocations: 'Все филиалы', locationFilterLabel: 'Филиал и адрес', distribution: 'Распределение оценок', all: 'Все оценки', review: 'отзывов', empty: 'По выбранному фильтру пока нет опубликованных отзывов.', published: 'Опубликован', noProvider: 'Филиал не найден.', contact: 'Открыть чат', contactUnavailable: 'Контакт недоступен', issueDiscount: 'Предложить скидку', discountPercent: 'Скидка на следующий визит, %', serviceOptional: 'Услуга (необязательно)', expiresInDays: 'Срок действия, дней', issue: 'Выпустить промокод', cancel: 'Отмена', promoCreated: 'Промокод выпущен', promoNote: 'Предложите клиенту скидку от 1 до 100% после обращения по конкретной заявке. Код одноразовый.', copyCode: 'Скопировать код', copied: 'Скопировано', close: 'Готово' }
        : { eyebrow: 'Service workspace', title: 'Customer reviews', description: 'Review every branch, filter by address and open a direct resolution chat with the customer.', back: 'Back to services and pricing', average: 'Average rating', total: 'Total reviews', allLocations: 'All service locations', locationFilterLabel: 'Service location', distribution: 'Rating distribution', all: 'All ratings', review: 'reviews', empty: 'No published reviews match this filter.', published: 'Published', noProvider: 'Service location not found.', contact: 'Open chat', contactUnavailable: 'Contact unavailable', issueDiscount: 'Offer discount', discountPercent: 'Discount for next visit, %', serviceOptional: 'Service (optional)', expiresInDays: 'Valid for, days', issue: 'Issue promo code', cancel: 'Cancel', promoCreated: 'Promo code issued', promoNote: 'Offer a 1–100% discount after discussing the issue with the client. The code can be used once.', copyCode: 'Copy code', copied: 'Copied', close: 'Done' }
}
