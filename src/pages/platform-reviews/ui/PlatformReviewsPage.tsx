import { MessageSquareText, Send, ShieldCheck, Star } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'

import { useGetMeQuery } from '@/features/auth'
import { useCreatePlatformReviewMutation, useGetPlatformReviewsQuery, type PlatformReview } from '@/entities/platform-review'
import { ROUTES } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'
import { PageHeader } from '@/shared/ui/page-header'
import { RetryButton } from '@/shared/ui/query-refresh-error'

export function PlatformReviewsPage() {
    const { locale, t } = useTranslation()
    const user = useGetMeQuery()
    const reviews = useGetPlatformReviewsQuery(50)
    const [rating, setRating] = useState('5')
    const [text, setText] = useState('')
    const [submitted, setSubmitted] = useState(false)
    const [createReview, createState] = useCreatePlatformReviewMutation()
    const ru = locale === 'ru'
    const copy = ru
        ? { eyebrow: 'Отзывы о платформе', title: 'Что водители говорят об AutoCare Hub', description: 'Рассказы пользователей помогают нам улучшать поиск, сравнение и поддержку, а официальные ответы показывают, как мы разбираем обратную связь.', average: 'Средняя оценка', total: 'опубликованных отзывов', response: 'Ответ AutoCare Hub', leave: 'Оставить отзыв', signIn: 'Войдите, чтобы оставить отзыв', rating: 'Оценка', text: 'Ваш отзыв', submit: 'Отправить на проверку', sent: 'Спасибо! Отзыв отправлен на модерацию.', loading: 'Загрузка отзывов…', empty: 'Опубликованных отзывов пока нет.', retry: 'Повторить' }
        : { eyebrow: 'Platform reviews', title: 'What drivers say about AutoCare Hub', description: 'User stories help us improve search, comparison and support. Official replies show how we handle feedback.', average: 'Average rating', total: 'published reviews', response: 'AutoCare Hub response', leave: 'Leave a review', signIn: 'Sign in to leave a review', rating: 'Rating', text: 'Your review', submit: 'Submit for review', sent: 'Thank you! Your review is waiting for moderation.', loading: 'Loading reviews…', empty: 'No published reviews yet.', retry: 'Retry' }
    const stats = useMemo(() => {
        const items = reviews.data ?? []
        return { count: items.length, average: items.length ? (items.reduce((sum, item) => sum + item.rating, 0) / items.length).toFixed(1) : '—' }
    }, [reviews.data])

    const submit = async () => {
        setSubmitted(false)
        await createReview({ rating: Number(rating), text }).unwrap()
        setText('')
        setSubmitted(true)
    }

    return <main className="min-h-full bg-background px-[var(--layout-gutter)] py-8 lg:py-12"><section className="mx-auto max-w-6xl space-y-6"><PageHeader eyebrow={copy.eyebrow} title={copy.title} description={copy.description} /><section className="grid gap-4 rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm md:grid-cols-[180px_minmax(0,1fr)_220px] md:p-6"><div><p className="text-4xl font-black text-foreground">{stats.average}</p><div className="mt-2 flex text-status-warning-foreground">{Array.from({ length: 5 }).map((_, index) => <Star key={index} className={`size-4 ${stats.average !== '—' && index < Math.round(Number(stats.average)) ? 'fill-current' : ''}`} />)}</div><p className="mt-2 text-xs font-bold text-muted-foreground">{stats.count} {copy.total}</p></div><div className="flex items-center gap-3 rounded-[var(--radius-card)] bg-primary/5 p-4"><ShieldCheck className="size-8 shrink-0 text-primary" /><p className="text-sm leading-6 text-muted-foreground">{ru ? 'Мы проверяем отзывы на достоверность и удаляем только нарушения правил, а не неудобную критику.' : 'We check reviews for authenticity and remove rule violations, not uncomfortable criticism.'}</p></div><div className="flex items-center justify-end"><MessageSquareText className="mr-3 size-9 text-primary" /><p className="text-sm font-black text-foreground">{ru ? 'Открытая обратная связь' : 'Open feedback'}</p></div></section>{reviews.isLoading && <p className="rounded-[var(--radius-panel)] border border-border bg-card p-8 text-sm text-muted-foreground">{copy.loading}</p>}{reviews.isError && <div className="rounded-[var(--radius-panel)] border border-destructive/30 bg-card p-6"><p className="font-semibold text-destructive">{t('common.failedToLoad')}</p><RetryButton className="mt-4" onRetry={reviews.refetch} label={copy.retry} /></div>}{reviews.data && (reviews.data.length === 0 ? <p className="rounded-[var(--radius-panel)] border border-dashed border-border p-8 text-center text-sm font-semibold text-muted-foreground">{copy.empty}</p> : <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{reviews.data.map((review) => <PlatformReviewCard key={review.id} review={review} responseLabel={copy.response} locale={locale} />)}</div>)}<section className="rounded-[var(--radius-panel)] border border-primary/20 bg-primary/5 p-5 md:p-6"><h2 className="text-xl font-black text-foreground">{copy.leave}</h2>{user.data?.role === 'client' ? <div className="mt-4 grid gap-4 md:max-w-2xl"><div className="flex gap-2">{[5, 4, 3, 2, 1].map((value) => <button type="button" key={value} onClick={() => setRating(String(value))} aria-label={`${value} stars`} className={`rounded-[var(--radius-control)] border px-3 py-2 text-sm font-black ${Number(rating) === value ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground'}`}>{value} ★</button>)}</div><label className="grid gap-1.5 text-sm font-bold text-foreground"><span>{copy.text}</span><textarea rows={4} value={text} onChange={(event) => setText(event.target.value)} className="rounded-[var(--radius-control)] border border-border bg-background p-3 text-sm leading-6" /></label><button type="button" disabled={createState.isLoading || text.trim().length < 10} onClick={() => void submit()} className="inline-flex h-11 w-fit items-center gap-2 rounded-[var(--radius-control)] bg-primary px-4 text-sm font-black text-primary-foreground disabled:opacity-60"><Send className="size-4" />{copy.submit}</button>{submitted && <p className="text-sm font-bold text-status-success-foreground">{copy.sent}</p>}</div> : <p className="mt-3 text-sm text-muted-foreground"><Link to={ROUTES.login} className="font-black text-primary hover:underline">{copy.signIn}</Link></p>}</section></section></main>
}

function PlatformReviewCard({ review, responseLabel, locale }: { review: PlatformReview; responseLabel: string; locale: string }) {
    const publicationDate = new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(review.createdAt))
    const initials = review.authorName.split(/\s+/).map((part) => part[0]).filter(Boolean).slice(0, 2).join('')
    return <article className="flex flex-col rounded-[var(--radius-card)] border border-border bg-card p-4 shadow-sm"><div className="flex items-center gap-3">{review.avatarUrl ? <img src={review.avatarUrl} alt="" className="size-11 rounded-full object-cover" /> : <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-sm font-black text-primary">{initials}</span>}<div className="min-w-0"><h2 className="truncate text-sm font-black text-foreground">{review.authorName}</h2><p className="text-xs text-muted-foreground">{review.authorRole}</p></div></div><div className="mt-3 flex text-status-warning-foreground">{Array.from({ length: 5 }).map((_, index) => <Star key={index} className={`size-3.5 ${index < review.rating ? 'fill-current' : 'text-muted-foreground/30'}`} />)}</div><p className="mt-3 flex-1 text-sm leading-6 text-muted-foreground">{review.text}</p><p className="mt-4 text-xs text-muted-foreground/75">{publicationDate}</p>{review.organizationResponse && <div className="mt-4 rounded-[var(--radius-control)] border border-primary/20 bg-primary/5 p-3"><p className="text-xs font-black text-primary">{responseLabel}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{review.organizationResponse}</p></div>}</article>
}
