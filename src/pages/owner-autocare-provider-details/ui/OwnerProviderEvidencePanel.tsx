import { AlertTriangle, BadgeCheck, FileCheck2, FileText, RefreshCw } from 'lucide-react'

import { useGetOwnerAutoCareProviderEvidenceQuery, type AutoCareApiProvider } from '@/entities/automotive-service'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { RetryButton } from '@/shared/ui/query-refresh-error'
import { StateCard } from '@/shared/ui/state-card'

type Props = { provider: AutoCareApiProvider; locale: string }

function formatDate(value: string, locale: string) {
    return new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en-US', { dateStyle: 'medium' }).format(new Date(value))
}

export function OwnerProviderEvidencePanel({ provider, locale }: Props) {
    const ru = locale === 'ru'
    const query = useGetOwnerAutoCareProviderEvidenceQuery(provider.id)
    if (query.isLoading) return <StateCard variant="loading" title={ru ? 'Загружаем документы и подтверждения…' : 'Loading documents and evidence…'} />
    if (query.isError) return <StateCard variant="error" title={ru ? 'Не удалось загрузить документы' : 'Could not load documents'} description={getApiErrorMessage(query.error, '')} action={<RetryButton onRetry={query.refetch} label={ru ? 'Повторить' : 'Retry'} />} />

    const evidence = query.data ?? []
    return <section className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-primary/10 text-primary"><FileCheck2 className="size-5" /></span><div><h2 className="text-base font-black text-foreground">{ru ? 'Документы и подтверждения' : 'Documents and evidence'}</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">{ru ? 'Здесь видны документы, фото и отзывы, переданные на проверку. Приватные файлы доступны только авторизованным участникам.' : 'Review documents, photos and reviews submitted for moderation. Private files are only available to authorized participants.'}</p></div></div>
        {evidence.length === 0 ? <div className="mt-5 rounded-[var(--radius-card)] border border-dashed border-border bg-background p-5 text-sm text-muted-foreground">{ru ? 'Подтверждения ещё не добавлены. Добавьте документы в форме изменения профиля.' : 'No evidence has been submitted yet. Add documents in the profile change form.'}</div> : <div className="mt-5 grid gap-3 md:grid-cols-2">{evidence.map((item) => {
            const status = item.status.toLowerCase()
            const isApproved = status === 'approved' || status === 'verified'
            const statusLabel = isApproved ? (ru ? 'Проверено' : 'Verified') : status === 'rejected' ? (ru ? 'Отклонено' : 'Rejected') : (ru ? 'На проверке' : 'Pending review')
            const statusClass = isApproved ? 'bg-status-success-surface text-status-success-foreground' : status === 'rejected' ? 'bg-destructive/10 text-destructive' : 'bg-secondary text-secondary-foreground'
            const isExpired = status === 'expired'
            return <article key={item.id} className="rounded-[var(--radius-card)] border border-border bg-background p-4"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-2"><span className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-primary/10 text-primary">{item.kind.includes('document') ? <FileText className="size-4" /> : <BadgeCheck className="size-4" />}</span><p className="truncate text-sm font-black text-foreground">{item.label}</p></div><span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-black ${statusClass}`}>{statusLabel}</span></div><p className="mt-3 text-xs text-muted-foreground">{ru ? 'Добавлено' : 'Submitted'}: {formatDate(item.createdAt, locale)}{item.verifiedAt ? ` · ${ru ? 'Проверено' : 'Verified'} ${formatDate(item.verifiedAt, locale)}` : ''}</p>{item.expiresAt && <p className={`mt-1 flex items-center gap-1 text-xs font-semibold ${isExpired ? 'text-destructive' : 'text-muted-foreground'}`}>{isExpired && <AlertTriangle className="size-3.5" />}{ru ? 'Действует до' : 'Expires'}: {formatDate(item.expiresAt, locale)}</p>}{item.notes && <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.notes}</p>}</article>
        })}</div>}
        {query.isFetching && !query.isLoading && <p className="mt-3 flex items-center gap-1 text-xs text-muted-foreground"><RefreshCw className="size-3 animate-spin" />{ru ? 'Обновляем…' : 'Refreshing…'}</p>}
    </section>
}
