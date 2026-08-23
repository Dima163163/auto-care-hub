import { CheckCircle2, Gavel, XCircle } from 'lucide-react'
import { useState } from 'react'

import {
    type AutoCareAppeal,
    useDecideAdminAutoCareAppealMutation,
    useGetAdminAutoCareAppealsQuery,
} from '@/entities/automotive-service'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { useTranslation } from '@/shared/lib/useTranslation'
import { Button } from '@/components/ui/button'
import { RetryButton } from '@/shared/ui/query-refresh-error'

const copy = {
    ru: {
        title: 'Апелляции и пересмотр решений',
        description: 'Проверяйте обращения сервисов и клиентов, не раскрывая лишние персональные данные.',
        empty: 'Новых апелляций нет.',
        reason: 'Причина обращения',
        accept: 'Принять',
        reject: 'Отклонить',
        decisionReason: 'Комментарий решения',
        placeholder: 'Объясните решение минимум в одном предложении…',
        failed: 'Не удалось загрузить очередь апелляций.',
        saved: 'Решение сохранено',
        subjects: { provider: 'Профиль сервиса', review: 'Отзыв', suspension: 'Блокировка', catalog: 'Каталог' },
    },
    en: {
        title: 'Appeals and decisions',
        description: 'Review provider and customer appeals without exposing unnecessary personal data.',
        empty: 'No pending appeals.',
        reason: 'Appeal reason',
        accept: 'Accept',
        reject: 'Reject',
        decisionReason: 'Decision note',
        placeholder: 'Explain the decision in at least one sentence…',
        failed: 'Could not load the appeal queue.',
        saved: 'Decision saved',
        subjects: { provider: 'Provider profile', review: 'Review', suspension: 'Suspension', catalog: 'Catalog' },
    },
}

export function AdminAutoCareAppealsPanel() {
    const { locale, t } = useTranslation()
    const text = locale === 'ru' ? copy.ru : copy.en
    const query = useGetAdminAutoCareAppealsQuery({ status: 'pending' })
    const [decide, decisionState] = useDecideAdminAutoCareAppealMutation()
    const [notes, setNotes] = useState<Record<string, string>>({})
    const [savedId, setSavedId] = useState<string | null>(null)
    const pending = query.data ?? []

    const submit = async (appeal: AutoCareAppeal, status: 'accepted' | 'rejected') => {
        const reason = notes[appeal.id]?.trim() ?? ''
        if (!reason) return
        await decide({ id: appeal.id, status, reason }).unwrap()
        setSavedId(appeal.id)
    }

    return <section className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-primary/10 text-primary"><Gavel className="size-5" /></span><div><h2 className="text-lg font-black text-foreground">{text.title}</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">{text.description}</p></div></div>
        {query.isLoading && <div role="status" className="mt-5 h-24 animate-pulse rounded-[var(--radius-card)] bg-muted"><span className="sr-only">{t('common.loading')}</span></div>}
        {query.error && <div role="alert" className="mt-5 rounded-[var(--radius-card)] border border-destructive/30 bg-destructive/5 p-4"><p className="text-sm font-semibold text-destructive">{getApiErrorMessage(query.error, text.failed)}</p><RetryButton className="mt-3" onRetry={query.refetch} label={t('common.retry')} /></div>}
        {!query.isLoading && !query.error && (pending.length === 0 ? <p className="mt-5 rounded-[var(--radius-card)] bg-secondary p-4 text-sm text-muted-foreground">{text.empty}</p> : <div className="mt-5 grid gap-3">{pending.map((appeal) => <article key={appeal.id} className="rounded-[var(--radius-card)] border border-border bg-background p-4"><div className="flex flex-wrap items-center justify-between gap-2"><span className="rounded-full bg-primary/10 px-2 py-1 text-[11px] font-black text-primary">{text.subjects[appeal.subject]}</span><time className="text-xs text-muted-foreground">{new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en-US', { dateStyle: 'medium' }).format(new Date(appeal.createdAt))}</time></div><p className="mt-3 text-sm leading-6 text-foreground"><b>{text.reason}:</b> {appeal.reason}</p><label className="mt-3 grid gap-2 text-xs font-bold text-muted-foreground"><span>{text.decisionReason}</span><textarea rows={2} value={notes[appeal.id] ?? ''} onChange={(event) => { setSavedId(null); setNotes((current) => ({ ...current, [appeal.id]: event.target.value })) }} placeholder={text.placeholder} className="rounded-[var(--radius-control)] border border-border bg-card p-3 text-sm font-normal text-foreground" /></label><div className="mt-3 flex flex-wrap items-center gap-2"><Button type="button" size="sm" onClick={() => void submit(appeal, 'accepted')} loading={decisionState.isLoading} disabled={!notes[appeal.id]?.trim()}><CheckCircle2 className="mr-1.5 size-4" />{text.accept}</Button><Button type="button" size="sm" variant="outline" onClick={() => void submit(appeal, 'rejected')} loading={decisionState.isLoading} disabled={!notes[appeal.id]?.trim()}><XCircle className="mr-1.5 size-4" />{text.reject}</Button>{savedId === appeal.id && <span className="text-xs font-bold text-status-success-foreground">{text.saved}</span>}</div></article>)}</div>)}
    </section>
}
