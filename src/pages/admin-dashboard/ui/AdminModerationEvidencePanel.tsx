import { CheckCircle2, FileImage, FileText, MessageSquareText, Star, XCircle } from 'lucide-react'
import { useState } from 'react'

import {
    type AdminAutoCareModerationEvidence,
    useDecideAdminAutoCareModerationEvidenceMutation,
    useGetAdminAutoCareModerationEvidenceQuery,
} from '@/entities/automotive-service'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { useTranslation } from '@/shared/lib/useTranslation'
import { RetryButton } from '@/shared/ui/query-refresh-error'
import { Button } from '@/components/ui/button'

type EvidenceFilter = 'pending' | 'approved' | 'rejected' | 'all'
type EvidenceKindFilter = 'all' | 'provider_gallery' | 'provider_document' | 'review'

const copy = {
    ru: {
        title: 'Материалы для модерации',
        description: 'Проверяйте медиа сервиса, текст отзывов и вложения до публикации. Решение записывается в аудит.',
        filter: 'Статус материалов',
        kindFilter: 'Тип материала',
        all: 'Все',
        allKinds: 'Все типы',
        pending: 'Ожидают',
        approved: 'Одобрены',
        rejected: 'Отклонены',
        empty: 'Материалов с выбранным статусом нет.',
        provider: 'Сервис',
        review: 'Отзыв',
        media: 'Фото сервиса',
        gallery: 'Галерея',
        document: 'Документ сервиса',
        privateDocument: 'Приватный документ. Просмотр доступен только авторизованным модераторам.',
        documentReference: 'Ключ хранения',
        documentExpires: 'Действует до',
        author: 'Автор',
        reviewStatus: 'Статус отзыва',
        note: 'Комментарий модератора',
        placeholder: 'Укажите основание решения…',
        required: 'Добавьте комментарий перед принятием решения.',
        approve: 'Одобрить',
        reject: 'Отклонить',
        decided: 'Решение сохранено',
        failedDecision: 'Не удалось сохранить решение. Проверьте материал и повторите попытку.',
        failed: 'Не удалось загрузить материалы для модерации.',
        noMedia: 'Фото для просмотра отсутствует.',
        pendingReview: 'На проверке',
        approvedReview: 'Опубликован',
        rejectedReview: 'Отклонён',
    },
    en: {
        title: 'Moderation evidence',
        description: 'Review service media, review text and attachments before publication. Every decision is recorded in audit history.',
        filter: 'Evidence status',
        kindFilter: 'Evidence type',
        all: 'All',
        allKinds: 'All types',
        pending: 'Pending',
        approved: 'Approved',
        rejected: 'Rejected',
        empty: 'No evidence matches this status.',
        provider: 'Provider',
        review: 'Review',
        media: 'Provider media',
        gallery: 'Gallery',
        document: 'Provider document',
        privateDocument: 'Private document. Available only to authorized moderators.',
        documentReference: 'Storage key',
        documentExpires: 'Expires',
        author: 'Author',
        reviewStatus: 'Review status',
        note: 'Moderator note',
        placeholder: 'State the basis for the decision…',
        required: 'Add a note before making a decision.',
        approve: 'Approve',
        reject: 'Reject',
        decided: 'Decision saved',
        failedDecision: 'Could not save the decision. Check the evidence and try again.',
        failed: 'Could not load moderation evidence.',
        noMedia: 'No image is available for review.',
        pendingReview: 'Pending review',
        approvedReview: 'Published',
        rejectedReview: 'Rejected',
    },
} as const

type EvidenceCopy = (typeof copy)[keyof typeof copy]

function reviewStatusText(status: NonNullable<AdminAutoCareModerationEvidence['review']>['status'], text: EvidenceCopy) {
    return status === 'approved' ? text.approvedReview : status === 'rejected' ? text.rejectedReview : text.pendingReview
}

function evidenceKindIcon(kind: AdminAutoCareModerationEvidence['kind']) {
    if (kind === 'review') return <MessageSquareText className="size-5" />
    if (kind === 'provider_document' || kind === 'registration_document') return <FileText className="size-5" />
    return <FileImage className="size-5" />
}

function isDocumentEvidence(kind: AdminAutoCareModerationEvidence['kind']) {
    return kind === 'provider_document' || kind === 'registration_document'
}

export function AdminModerationEvidencePanel() {
    const { locale, t } = useTranslation()
    const text = locale === 'ru' ? copy.ru : copy.en
    const [filter, setFilter] = useState<EvidenceFilter>('pending')
    const [kindFilter, setKindFilter] = useState<EvidenceKindFilter>('all')
    const query = useGetAdminAutoCareModerationEvidenceQuery(filter === 'all' ? undefined : { status: filter })
    const [decide, decision] = useDecideAdminAutoCareModerationEvidenceMutation()
    const [notes, setNotes] = useState<Record<string, string>>({})
    const [validationId, setValidationId] = useState<string | null>(null)
    const [savedId, setSavedId] = useState<string | null>(null)
    const visibleEvidence = query.data?.filter((evidence) => {
        if (kindFilter === 'all') return true
        if (kindFilter === 'provider_gallery') return evidence.kind === 'provider_gallery'
        if (kindFilter === 'provider_document') return evidence.kind === 'provider_document' || evidence.kind === 'registration_document'
        return evidence.kind === kindFilter
    }) ?? []

    const submit = async (evidence: AdminAutoCareModerationEvidence, status: 'approved' | 'rejected') => {
        const reason = notes[evidence.id]?.trim() ?? ''
        if (!reason) {
            setValidationId(evidence.id)
            return
        }
        setValidationId(null)
        try {
            await decide({ id: evidence.id, status, reason }).unwrap()
            setSavedId(evidence.id)
        } catch {
            setSavedId(null)
        }
    }

    return <section id="admin-moderation-evidence" className="scroll-mt-24 rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-primary/10 text-primary"><FileImage className="size-5" /></span><div><h2 className="text-lg font-black text-foreground">{text.title}</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{text.description}</p></div></div>
            <div className="flex flex-wrap gap-3"><label className="grid shrink-0 gap-1 text-xs font-bold text-muted-foreground"><span>{text.filter}</span><select value={filter} onChange={(event) => setFilter(event.target.value as EvidenceFilter)} className="h-9 min-w-36 cursor-pointer appearance-none rounded-[var(--radius-control)] border border-border bg-card px-3 text-sm font-semibold text-foreground"><option value="pending">{text.pending}</option><option value="approved">{text.approved}</option><option value="rejected">{text.rejected}</option><option value="all">{text.all}</option></select></label><label className="grid shrink-0 gap-1 text-xs font-bold text-muted-foreground"><span>{text.kindFilter}</span><select value={kindFilter} onChange={(event) => setKindFilter(event.target.value as EvidenceKindFilter)} className="h-9 min-w-36 cursor-pointer appearance-none rounded-[var(--radius-control)] border border-border bg-card px-3 text-sm font-semibold text-foreground"><option value="all">{text.allKinds}</option><option value="provider_gallery">{text.gallery}</option><option value="provider_document">{text.document}</option><option value="review">{text.review}</option></select></label></div>
        </div>
        {query.isLoading && <div role="status" className="mt-5 h-48 animate-pulse rounded-[var(--radius-card)] bg-muted"><span className="sr-only">{t('common.loading')}</span></div>}
        {query.error && <div role="alert" className="mt-5 rounded-[var(--radius-card)] border border-destructive/30 bg-destructive/5 p-4"><p className="text-sm font-semibold text-destructive">{getApiErrorMessage(query.error, text.failed)}</p><RetryButton className="mt-3" onRetry={query.refetch} label={t('common.retry')} /></div>}
        {decision.error && <div role="alert" className="mt-5 rounded-[var(--radius-card)] border border-destructive/30 bg-destructive/5 p-4 text-sm font-semibold text-destructive">{getApiErrorMessage(decision.error, text.failedDecision)}</div>}
        {!query.isLoading && !query.error && (visibleEvidence.length === 0 ? <p className="mt-5 rounded-[var(--radius-card)] bg-secondary p-4 text-sm text-muted-foreground">{text.empty}</p> : <div className="mt-5 grid gap-3">{visibleEvidence.map((evidence) => <article key={evidence.id} className="rounded-[var(--radius-card)] border border-border bg-background p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="flex min-w-0 items-center gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-primary/10 text-primary">{evidenceKindIcon(evidence.kind)}</span><div className="min-w-0"><p className="font-black text-foreground">{evidence.label}</p><p className="mt-1 truncate text-xs text-muted-foreground">{text.provider}: {evidence.provider.name}{evidence.provider.address ? ` · ${evidence.provider.address}` : ''}</p></div></div><div className="flex shrink-0 items-center gap-2"><span className="rounded-full bg-secondary px-2 py-1 text-[11px] font-black text-muted-foreground">{evidence.kind === 'review' ? text.review : isDocumentEvidence(evidence.kind) ? text.document : text.media}</span><time className="text-xs text-muted-foreground">{new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(evidence.createdAt))}</time></div></div>
                {evidence.review ? <div className="mt-4 rounded-[var(--radius-control)] border border-border bg-card p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-black text-foreground">{text.author}: {evidence.review.authorName} · {evidence.review.vehicleLabel}</p><span className="inline-flex items-center gap-1 text-xs font-bold text-status-warning-foreground"><Star className="size-3.5 fill-current" />{evidence.review.rating}/5</span></div><p className="mt-2 text-sm leading-6 text-muted-foreground">{evidence.review.text}</p>{evidence.review.photoUrls.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{evidence.review.photoUrls.map((url) => <img key={url} src={url} alt="" loading="lazy" className="size-20 rounded-[var(--radius-control)] border border-border object-cover" />)}</div>}<p className="mt-3 text-xs font-semibold text-muted-foreground">{text.reviewStatus}: {reviewStatusText(evidence.review.status, text)}</p></div> : isDocumentEvidence(evidence.kind) ? <div className="mt-4 rounded-[var(--radius-control)] border border-border bg-card p-3"><div className="flex items-center gap-2 text-sm font-bold text-foreground"><FileText className="size-4 text-primary" />{text.document}</div><p className="mt-2 text-sm leading-6 text-muted-foreground">{text.privateDocument}</p><dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2"><div><dt className="font-semibold text-muted-foreground">{text.documentReference}</dt><dd className="mt-1 break-all font-mono text-foreground">{evidence.reference || '—'}</dd></div>{evidence.expiresAt && <div><dt className="font-semibold text-muted-foreground">{text.documentExpires}</dt><dd className="mt-1 text-foreground">{new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en-US', { dateStyle: 'medium' }).format(new Date(evidence.expiresAt))}</dd></div>}</dl></div> : evidence.reference ? <figure className="mt-4 overflow-hidden rounded-[var(--radius-control)] border border-border bg-card"><img src={evidence.reference} alt={evidence.label} loading="lazy" className="max-h-72 w-full object-cover" /></figure> : <p className="mt-4 rounded-[var(--radius-control)] bg-secondary p-3 text-sm text-muted-foreground">{text.noMedia}</p>}
                {evidence.status === 'pending' ? <><label className="mt-4 grid gap-2 text-xs font-bold text-muted-foreground"><span>{text.note}</span><textarea rows={2} value={notes[evidence.id] ?? ''} onChange={(event) => { setValidationId(null); setSavedId(null); setNotes((current) => ({ ...current, [evidence.id]: event.target.value })) }} placeholder={text.placeholder} className="rounded-[var(--radius-control)] border border-border bg-card p-3 text-sm font-normal text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" /></label>{validationId === evidence.id && <p className="mt-2 text-xs font-bold text-destructive">{text.required}</p>}<div className="mt-3 flex flex-wrap items-center gap-2"><Button type="button" size="sm" loading={decision.isLoading} disabled={decision.isLoading} onClick={() => void submit(evidence, 'approved')}><CheckCircle2 className="mr-1.5 size-4" />{text.approve}</Button><Button type="button" size="sm" variant="outline" loading={decision.isLoading} disabled={decision.isLoading} onClick={() => void submit(evidence, 'rejected')}><XCircle className="mr-1.5 size-4" />{text.reject}</Button>{savedId === evidence.id && <span role="status" className="text-xs font-bold text-status-success-foreground">{text.decided}</span>}</div></> : <p className="mt-4 rounded-[var(--radius-control)] bg-secondary px-3 py-2 text-sm text-muted-foreground">{text.note}: {evidence.notes || '—'}</p>}</article>)}</div>)}
    </section>
}
