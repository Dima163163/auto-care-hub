import { BadgeCheck, Ban, CarFront, Clock3, ShieldX, Star } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import {
    useGetAdminAutoCareReviewsQuery,
    useUpdateAdminAutoCareReviewStatusMutation,
    type AdminAutoCareReview,
} from '@/entities/automotive-service'
import { Button } from '@/components/ui/button'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { useTranslation } from '@/shared/lib/useTranslation'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
import { PageHeader } from '@/shared/ui/page-header'
import { RetryButton } from '@/shared/ui/query-refresh-error'
import { ReviewsSkeleton } from '@/shared/ui/loading-skeleton'

type ReviewStatus = AdminAutoCareReview['status']

const statusClassNames: Record<ReviewStatus, string> = {
    pending: 'bg-status-warning-surface text-status-warning-foreground',
    approved: 'bg-status-success-surface text-status-success-foreground',
    rejected: 'bg-status-danger-surface text-status-danger-foreground',
}

const moderationReasons = [
    { value: 'profanity', ru: 'Нецензурная лексика', en: 'Profanity' },
    { value: 'insult', ru: 'Оскорбление', en: 'Insult or harassment' },
    { value: 'spam', ru: 'Спам или реклама', en: 'Spam or advertising' },
    { value: 'threats', ru: 'Угрозы или дискриминация', en: 'Threats or discrimination' },
    { value: 'other', ru: 'Другая причина', en: 'Other reason' },
] as const

function ReviewStatusBadge({ locale, status }: { locale: string; status: ReviewStatus }) {
    const copy = locale === 'ru'
        ? { pending: 'На проверке', approved: 'Опубликован', rejected: 'Заблокирован' }
        : { pending: 'Pending', approved: 'Published', rejected: 'Blocked' }
    const Icon = status === 'approved' ? BadgeCheck : status === 'pending' ? Clock3 : ShieldX

    return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-black ${statusClassNames[status]}`}><Icon className="size-3.5" />{copy[status]}</span>
}

function AdminReviewCard({ locale, review }: { locale: string; review: AdminAutoCareReview }) {
    const ru = locale === 'ru'
    const copy = ru
        ? {
            block: 'Заблокировать',
            publish: 'Опубликовать',
            blockingTitle: 'Заблокировать отзыв?',
            blockingDescription: 'Отзыв исчезнет из публичных списков, но останется в базе и аудите. Укажите причину модерации.',
            reason: 'Причина блокировки',
            chooseReason: 'Выберите причину',
            details: 'Комментарий для аудита (необязательно)',
            detailsPlaceholder: 'Например: содержит мат и оскорбление сотрудника.',
            cancel: 'Отмена',
            confirmBlock: 'Заблокировать отзыв',
            blocked: 'Отзыв заблокирован',
            published: 'Отзыв снова опубликован',
            blockFailed: 'Не удалось изменить статус отзыва.',
            requiredReason: 'Выберите причину блокировки.',
        }
        : {
            block: 'Block review',
            publish: 'Publish',
            blockingTitle: 'Block this review?',
            blockingDescription: 'The review will disappear from public lists but stay in the database and audit trail. Select a moderation reason.',
            reason: 'Block reason',
            chooseReason: 'Select a reason',
            details: 'Audit note (optional)',
            detailsPlaceholder: 'For example: contains profanity and an insult toward staff.',
            cancel: 'Cancel',
            confirmBlock: 'Block review',
            blocked: 'Review blocked',
            published: 'Review published again',
            blockFailed: 'Could not change the review status.',
            requiredReason: 'Select a block reason.',
        }
    const [updateStatus, updateState] = useUpdateAdminAutoCareReviewStatusMutation()
    const [isBlockDialogOpen, setIsBlockDialogOpen] = useState(false)
    const [reasonCode, setReasonCode] = useState('')
    const [details, setDetails] = useState('')
    const [actionError, setActionError] = useState<string | null>(null)
    const publicationDate = new Intl.DateTimeFormat(ru ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(review.createdAt))

    const closeBlockDialog = () => {
        if (updateState.isLoading) return
        setIsBlockDialogOpen(false)
        setReasonCode('')
        setDetails('')
        setActionError(null)
    }

    const publishReview = async () => {
        setActionError(null)
        try {
            await updateStatus({ reviewId: review.id, status: 'approved' }).unwrap()
            toast.success(copy.published)
        } catch (error) {
            const message = getApiErrorMessage(error, copy.blockFailed)
            setActionError(message)
            toast.error(message)
        }
    }

    const blockReview = async () => {
        const selectedReason = moderationReasons.find((reason) => reason.value === reasonCode)
        if (!selectedReason) {
            setActionError(copy.requiredReason)
            return
        }

        setActionError(null)
        const reasonLabel = ru ? selectedReason.ru : selectedReason.en
        const reason = details.trim() ? `${reasonLabel}: ${details.trim()}` : reasonLabel

        try {
            await updateStatus({ reviewId: review.id, status: 'rejected', reason }).unwrap()
            toast.success(copy.blocked)
            closeBlockDialog()
        } catch (error) {
            const message = getApiErrorMessage(error, copy.blockFailed)
            setActionError(message)
            toast.error(message)
        }
    }

    return <>
        <article aria-busy={updateState.isLoading} className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="flex items-center gap-1 text-sm font-black text-foreground"><CarFront className="size-4 text-primary" />{review.providerName}</p>
                    <p className="mt-1 text-xs font-semibold text-muted-foreground">{review.authorName} · {review.vehicleLabel}</p>
                </div>
                <ReviewStatusBadge locale={locale} status={review.status} />
            </div>
            <p className="mt-4 inline-flex items-center gap-1 text-sm font-black text-rating-foreground"><Star className="size-4 fill-current" />{review.rating.toFixed(1)}</p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{review.text}</p>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                <p className="text-xs font-semibold text-muted-foreground">{publicationDate}</p>
                <div className="flex flex-wrap gap-2">
                    {review.status !== 'approved' && <Button type="button" size="sm" variant="outline" disabled={updateState.isLoading} loading={updateState.isLoading} onClick={() => void publishReview()}><BadgeCheck className="size-3.5" />{copy.publish}</Button>}
                    {review.status !== 'rejected' && <Button type="button" size="sm" variant="outline" disabled={updateState.isLoading} className="border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => { setActionError(null); setIsBlockDialogOpen(true) }}><Ban className="size-3.5" />{copy.block}</Button>}
                </div>
            </div>
            {actionError && !isBlockDialogOpen ? <p role="alert" className="mt-3 text-xs font-semibold text-destructive">{actionError}</p> : null}
        </article>
        <Dialog isOpen={isBlockDialogOpen} onOpenChange={(open) => { if (!open) closeBlockDialog() }} className="max-w-lg">
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><Ban className="size-5 text-destructive" />{copy.blockingTitle}</DialogTitle>
                    <DialogDescription>{copy.blockingDescription}</DialogDescription>
                </DialogHeader>
                <div className="mt-5 grid gap-4">
                    <label className="grid gap-1.5 text-sm font-bold text-foreground"><span>{copy.reason}</span><select value={reasonCode} onChange={(event) => { setReasonCode(event.target.value); setActionError(null) }} aria-label={copy.reason} className="select-with-icon h-11 appearance-none rounded-[var(--radius-control)] border border-border bg-background px-3 pr-9"><option value="">{copy.chooseReason}</option>{moderationReasons.map((reason) => <option key={reason.value} value={reason.value}>{ru ? reason.ru : reason.en}</option>)}</select></label>
                    <label className="grid gap-1.5 text-sm font-bold text-foreground"><span>{copy.details}</span><textarea value={details} onChange={(event) => { setDetails(event.target.value); setActionError(null) }} rows={3} maxLength={1_800} placeholder={copy.detailsPlaceholder} className="rounded-[var(--radius-control)] border border-border bg-background p-3 text-sm font-normal leading-6" /></label>
                    {actionError ? <p role="alert" className="text-sm font-bold text-destructive">{actionError}</p> : null}
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" disabled={updateState.isLoading} onClick={closeBlockDialog}>{copy.cancel}</Button>
                    <Button type="button" variant="destructive" loading={updateState.isLoading} onClick={() => void blockReview()}><Ban className="size-4" />{copy.confirmBlock}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </>
}

export function AdminReviewsPage() {
    const { locale, t } = useTranslation()
    const query = useGetAdminAutoCareReviewsQuery()
    const ru = locale === 'ru'
    const copy = ru
        ? { eyebrow: 'Модерация качества', title: 'Отзывы об автосервисах', description: 'Проверяйте автомобильные отзывы и сразу блокируйте мат, оскорбления, спам и другие нарушения.', empty: 'Отзывов для модерации пока нет.' }
        : { eyebrow: 'Quality moderation', title: 'Automotive service reviews', description: 'Review automotive feedback and quickly block profanity, insults, spam and other violations.', empty: 'No reviews require moderation yet.' }

    return <main className="min-h-full bg-background px-[var(--layout-gutter)] py-7 lg:py-10"><section className="mx-auto max-w-6xl"><PageHeader eyebrow={copy.eyebrow} title={copy.title} description={copy.description} />{query.isLoading && <ReviewsSkeleton label={t('common.loading')} />}{query.error && <div className="rounded-[var(--radius-panel)] border border-destructive/30 bg-card p-6"><p className="font-semibold text-destructive">{getApiErrorMessage(query.error, t('common.failedToLoad'))}</p><RetryButton className="mt-4" onRetry={query.refetch} label={t('common.retry')} /></div>}{query.data && (query.data.length === 0 ? <div className="rounded-[var(--radius-panel)] border border-dashed border-border bg-card p-8 text-center text-sm font-semibold text-muted-foreground">{copy.empty}</div> : <div className="grid gap-4 lg:grid-cols-2">{query.data.map((review) => <AdminReviewCard key={review.id} locale={locale} review={review} />)}</div>)}</section></main>
}
