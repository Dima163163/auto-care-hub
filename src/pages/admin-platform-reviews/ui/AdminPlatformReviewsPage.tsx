import { BadgeCheck, MessageSquareText, Send, ShieldAlert, Star, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { useGetMeQuery } from '@/features/auth'
import {
    useGetAdminPlatformReviewsQuery,
    useRemovePlatformReviewMutation,
    useRespondToPlatformReviewMutation,
    type PlatformReview,
} from '@/entities/platform-review'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { useTranslation } from '@/shared/lib/useTranslation'
import { PageHeader } from '@/shared/ui/page-header'
import { RetryButton } from '@/shared/ui/query-refresh-error'

export function AdminPlatformReviewsPage() {
    const { locale, t } = useTranslation()
    const viewer = useGetMeQuery()
    const query = useGetAdminPlatformReviewsQuery()
    const isSuperAdmin = viewer.data?.role === 'super_admin'
    const ru = locale === 'ru'
    const copy = ru
        ? { eyebrow: 'Модерация AutoCare Hub', title: 'Отзывы о платформе', description: 'Проверяйте обратную связь о поиске, сравнении и поддержке AutoCare Hub. Ответ организации виден публично после публикации.', empty: 'Отзывов пока нет.', status: { pending: 'На проверке', approved: 'Опубликован', rejected: 'Отклонён', removed: 'Удалён' }, response: 'Ответ организации', responsePlaceholder: 'Напишите спокойный и полезный ответ клиенту…', reply: 'Ответить и опубликовать', remove: 'Удалить отзыв', removed: 'Отзыв удалён', superAdminHint: 'Удаление доступно только супер-администратору.', responseSaved: 'Ответ сохранён' }
        : { eyebrow: 'AutoCare Hub moderation', title: 'Platform reviews', description: 'Review feedback about AutoCare Hub search, comparison and support. The organization response becomes public after approval.', empty: 'No reviews yet.', status: { pending: 'Pending', approved: 'Published', rejected: 'Rejected', removed: 'Removed' }, response: 'Organization response', responsePlaceholder: 'Write a calm and helpful reply to the customer…', reply: 'Reply and publish', remove: 'Remove review', removed: 'Review removed', superAdminHint: 'Only a super administrator can remove reviews.', responseSaved: 'Response saved' }

    return <main className="min-h-full bg-background px-[var(--layout-gutter)] py-7 lg:py-10"><section className="mx-auto max-w-6xl"><PageHeader eyebrow={copy.eyebrow} title={copy.title} description={copy.description} />{!isSuperAdmin && <div className="mb-5 flex items-center gap-2 rounded-[var(--radius-panel)] border border-status-warning-border bg-status-warning-surface p-4 text-sm font-semibold text-status-warning-foreground"><ShieldAlert className="size-4 shrink-0" />{copy.superAdminHint}</div>}{query.isLoading && <div className="rounded-[var(--radius-panel)] border border-border bg-card p-8 text-sm text-muted-foreground">{t('common.loading')}</div>}{query.error && <div className="rounded-[var(--radius-panel)] border border-destructive/30 bg-card p-6"><p className="font-semibold text-destructive">{getApiErrorMessage(query.error, t('common.failedToLoad'))}</p><RetryButton className="mt-4" onRetry={query.refetch} label={t('common.retry')} /></div>}{query.data && (query.data.length === 0 ? <div className="rounded-[var(--radius-panel)] border border-dashed border-border bg-card p-8 text-center text-sm font-semibold text-muted-foreground">{copy.empty}</div> : <div className="grid gap-4 lg:grid-cols-2">{query.data.map((review) => <PlatformReviewModerationCard key={review.id} review={review} locale={locale} copy={copy} canRemove={isSuperAdmin} />)}</div>)}</section></main>
}

type ModerationCopy = {
    status: Record<PlatformReview['status'], string>
    response: string
    responsePlaceholder: string
    reply: string
    remove: string
    removed: string
    responseSaved: string
}

function PlatformReviewModerationCard({ review, locale, copy, canRemove }: { review: PlatformReview; locale: string; copy: ModerationCopy; canRemove: boolean }) {
    const [response, setResponse] = useState(review.organizationResponse ?? '')
    const [saved, setSaved] = useState(false)
    const [respond, respondState] = useRespondToPlatformReviewMutation()
    const [remove, removeState] = useRemovePlatformReviewMutation()
    const publicationDate = new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(review.createdAt))
    const initials = review.authorName.split(/\s+/).map((part) => part[0]).filter(Boolean).slice(0, 2).join('')
    const removed = review.status === 'removed' || removeState.isSuccess

    const saveResponse = async () => {
        if (response.trim().length < 5) return
        await respond({ reviewId: review.id, response: response.trim() }).unwrap()
        setSaved(true)
    }

    const removeReview = async () => {
        if (!canRemove) return
        await remove(review.id).unwrap()
    }

    return <article className={`rounded-[var(--radius-panel)] border bg-card p-5 shadow-sm ${removed ? 'border-border opacity-70' : 'border-border'}`}><div className="flex items-start justify-between gap-4"><div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-sm font-black text-primary">{review.avatarUrl ? <img src={review.avatarUrl} alt="" className="size-full object-cover" /> : initials}</div><div><h2 className="text-sm font-black text-foreground">{review.authorName}</h2><p className="text-xs text-muted-foreground">{review.authorRole} · {publicationDate}</p></div></div><span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-black ${removed ? 'bg-muted text-muted-foreground' : review.status === 'pending' ? 'bg-status-warning-surface text-status-warning-foreground' : 'bg-status-success-surface text-status-success-foreground'}`}><BadgeCheck className="size-3.5" />{removed ? copy.status.removed : copy.status[review.status]}</span></div><div className="mt-4 flex items-center gap-1 text-sm font-black text-rating-foreground">{Array.from({ length: 5 }).map((_, index) => <Star key={index} className={`size-4 ${index < review.rating ? 'fill-current' : 'text-muted-foreground/25'}`} />)}<span className="ml-1">{review.rating}.0</span></div><p className="mt-3 text-sm leading-6 text-muted-foreground">{review.text}</p>{review.organizationResponse && !response && <p className="mt-4 rounded-[var(--radius-control)] bg-primary/5 p-3 text-sm text-muted-foreground">{review.organizationResponse}</p>}{!removed && <div className="mt-5 border-t border-border pt-4"><label className="grid gap-2 text-sm font-bold text-foreground"><span className="inline-flex items-center gap-2"><MessageSquareText className="size-4 text-primary" />{copy.response}</span><textarea rows={3} value={response} onChange={(event) => { setResponse(event.target.value); setSaved(false) }} placeholder={copy.responsePlaceholder} className="rounded-[var(--radius-control)] border border-border bg-background p-3 text-sm font-normal leading-6" /></label><div className="mt-3 flex flex-wrap items-center gap-2"><button type="button" onClick={() => void saveResponse()} disabled={respondState.isLoading || response.trim().length < 5} className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-control)] bg-primary px-3 text-xs font-black text-primary-foreground disabled:opacity-60"><Send className="size-3.5" />{copy.reply}</button>{canRemove && <button type="button" onClick={() => void removeReview()} disabled={removeState.isLoading} className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-control)] border border-destructive/30 px-3 text-xs font-black text-destructive disabled:opacity-60"><Trash2 className="size-3.5" />{copy.remove}</button>}{saved && <span className="text-xs font-bold text-status-success-foreground">{copy.responseSaved}</span>}</div></div>}{removed && <p className="mt-4 text-xs font-bold text-muted-foreground">{copy.removed}</p>}</article>
}
