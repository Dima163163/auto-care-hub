import { AlertTriangle, CheckCircle2, RotateCcw, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import {
    useDeadLetterOutboxEventMutation,
    useGetOutboxHealthQuery,
    useRetryOutboxEventMutation,
} from '@/features/admin/api/adminApi'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { useTranslation } from '@/shared/lib/useTranslation'
import { Button } from '@/components/ui/button'
import { RetryButton } from '@/shared/ui/query-refresh-error'

const MAX_OUTBOX_ATTEMPTS = 5
const VISIBLE_EVENT_LIMIT = 8

export function AdminOutboxControlPanel() {
    const { locale, t } = useTranslation()
    const query = useGetOutboxHealthQuery()
    const [retryEvent, retryState] = useRetryOutboxEventMutation()
    const [deadLetterEvent, deadLetterState] = useDeadLetterOutboxEventMutation()
    const [pendingActionId, setPendingActionId] = useState<string | null>(null)

    const executeRetry = async (eventId: string) => {
        setPendingActionId(eventId)
        try {
            await retryEvent(eventId).unwrap()
            toast.success(locale === 'ru' ? 'Событие поставлено на повторную обработку.' : 'Event queued for retry.')
        } catch (error) {
            toast.error(getApiErrorMessage(error, t('common.tryAgainLater')))
        } finally {
            setPendingActionId(null)
        }
    }

    const executeDeadLetter = async (eventId: string) => {
        if (!window.confirm(locale === 'ru'
            ? 'Переместить событие в dead-letter? Повторная обработка будет отключена.'
            : 'Move this event to dead-letter? Further processing will be disabled.')) return

        setPendingActionId(eventId)
        try {
            await deadLetterEvent(eventId).unwrap()
            toast.success(locale === 'ru' ? 'Событие перемещено в dead-letter.' : 'Event moved to dead-letter.')
        } catch (error) {
            toast.error(getApiErrorMessage(error, t('common.tryAgainLater')))
        } finally {
            setPendingActionId(null)
        }
    }

    if (query.isLoading) {
        return <section className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm"><div role="status" className="h-32 animate-pulse rounded-[var(--radius-card)] bg-muted"><span className="sr-only">{t('common.loading')}</span></div></section>
    }

    if (query.error || !query.data) {
        return <section className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm"><div role="alert" className="rounded-[var(--radius-card)] border border-destructive/30 bg-destructive/5 p-4"><p className="text-sm font-semibold text-destructive">{getApiErrorMessage(query.error, t('common.failedToLoad'))}</p><RetryButton className="mt-3" onRetry={query.refetch} label={t('common.retry')} /></div></section>
    }

    const failedEvents = query.data.failedEvents.slice(0, VISIBLE_EVENT_LIMIT)
    const pending = query.data.counts.pending ?? 0
    const processing = query.data.counts.processing ?? 0
    const failed = query.data.counts.failed ?? 0
    const deadLetter = query.data.deadLetterCount
    const hasAttention = failed > 0 || deadLetter > 0 || query.data.abandonedCount > 0

    return <section className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm" aria-busy={query.isFetching || retryState.isLoading || deadLetterState.isLoading}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">{t('adminDashboard.operationsRail.outbox')}</p>
                <h2 className="mt-1 text-lg font-black text-foreground">{locale === 'ru' ? 'Ошибки доставки событий' : 'Event delivery failures'}</h2>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{locale === 'ru' ? 'Повторяйте только проверенные события. Перемещение в dead-letter требует явного подтверждения и фиксируется в аудите.' : 'Retry only verified events. Moving an event to dead-letter requires explicit confirmation and is recorded in the audit log.'}</p>
            </div>
            <span className={hasAttention ? 'inline-flex items-center gap-1.5 rounded-full bg-status-warning-surface px-2.5 py-1 text-xs font-black text-status-warning-foreground' : 'inline-flex items-center gap-1.5 rounded-full bg-status-success-surface px-2.5 py-1 text-xs font-black text-status-success-foreground'}>
                {hasAttention ? <AlertTriangle className="size-3.5" /> : <CheckCircle2 className="size-3.5" />}
                {hasAttention ? t('adminDashboard.operationsRail.thresholdBreaches') : t('adminDashboard.operationsRail.healthy')}
            </span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
                [t('adminDashboard.operationsRail.active'), pending + processing],
                [t('adminDashboard.operationsRail.failedItems'), failed],
                [t('adminDashboard.operationsRail.deadLetter'), deadLetter],
                [locale === 'ru' ? 'Заброшено' : 'Abandoned', query.data.abandonedCount],
            ].map(([label, value]) => <div key={String(label)} className="rounded-[var(--radius-card)] border border-border bg-background p-4"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-black tabular-nums text-foreground">{value}</p></div>)}
        </div>

        {failedEvents.length > 0 ? <div className="mt-5 space-y-3">{failedEvents.map((event) => {
            const isBusy = pendingActionId === event.id
            const canDeadLetter = event.attempts >= MAX_OUTBOX_ATTEMPTS
            return <article key={event.id} className="rounded-[var(--radius-card)] border border-border bg-background p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2"><code className="text-sm font-bold text-foreground">{event.type}</code><span className="rounded-full bg-secondary px-2 py-1 text-[11px] font-black text-muted-foreground">{event.attempts} {locale === 'ru' ? 'попыток' : 'attempts'}</span></div>
                        <p className="mt-2 break-all font-mono text-xs text-muted-foreground">{event.id}</p>
                        {event.lastError && <p className="mt-2 max-w-3xl break-words rounded-md bg-destructive/5 px-3 py-2 text-xs text-destructive">{event.lastError.slice(0, 320)}</p>}
                        <p className="mt-2 text-xs text-muted-foreground">{new Date(event.createdAt).toLocaleString(locale === 'ru' ? 'ru-RU' : undefined)}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                        <Button type="button" size="sm" variant="outline" disabled={isBusy || retryState.isLoading || deadLetterState.isLoading} loading={isBusy && retryState.isLoading} onClick={() => void executeRetry(event.id)}><RotateCcw className="size-3.5" />{t('adminDashboard.operationsRail.retry')}</Button>
                        {canDeadLetter && <Button type="button" size="sm" variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10" disabled={isBusy || retryState.isLoading || deadLetterState.isLoading} loading={isBusy && deadLetterState.isLoading} onClick={() => void executeDeadLetter(event.id)}><Trash2 className="size-3.5" />{t('adminDashboard.operationsRail.deadLetter')}</Button>}
                    </div>
                </div>
            </article>
        })}</div> : <p className="mt-5 flex items-center gap-2 rounded-[var(--radius-card)] bg-status-success/10 px-4 py-3 text-sm font-semibold text-status-success-foreground"><CheckCircle2 className="size-4" />{locale === 'ru' ? 'Ошибок доставки нет.' : 'No delivery failures.'}</p>}
    </section>
}
