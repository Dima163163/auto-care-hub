import { CheckCircle2, ClipboardPenLine, XCircle } from 'lucide-react'
import { useState } from 'react'

import {
    type AutoCareProviderChangeRequest,
    useDecideAdminAutoCareProviderChangeRequestMutation,
    useGetAdminAutoCareProviderChangeRequestsQuery,
} from '@/entities/automotive-service'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { RetryButton } from '@/shared/ui/query-refresh-error'

type Props = { locale: string }

const copy = {
    ru: {
        title: 'Изменения профилей сервисов',
        description: 'Проверяйте заявки на публикацию и изменения данных. Решение и комментарий попадут владельцу в уведомления.',
        empty: 'Новых заявок на проверку нет.',
        verification: 'Проверка сервиса',
        profile: 'Изменение профиля',
        approve: 'Одобрить',
        reject: 'Запросить уточнение',
        note: 'Комментарий для владельца',
        placeholder: 'Кратко объясните решение…',
        required: 'Добавьте комментарий перед принятием решения.',
        failed: 'Не удалось загрузить заявки на изменение.',
    },
    en: {
        title: 'Provider profile changes',
        description: 'Review publication and profile change requests. The owner receives the decision and note as a notification.',
        empty: 'No profile changes require review.',
        verification: 'Service verification',
        profile: 'Profile update',
        approve: 'Approve',
        reject: 'Request clarification',
        note: 'Note to owner',
        placeholder: 'Briefly explain the decision…',
        required: 'Add a note before deciding.',
        failed: 'Could not load profile change requests.',
    },
} as const

export function AdminProviderChangeRequestsPanel({ locale }: Props) {
    const text = locale === 'ru' ? copy.ru : copy.en
    const query = useGetAdminAutoCareProviderChangeRequestsQuery({ status: 'pending' })
    const [decide, decision] = useDecideAdminAutoCareProviderChangeRequestMutation()
    const [notes, setNotes] = useState<Record<string, string>>({})
    const [validationId, setValidationId] = useState<string | null>(null)
    const requests = query.data ?? []

    const submit = async (request: AutoCareProviderChangeRequest, status: 'approved' | 'rejected') => {
        const reason = notes[request.id]?.trim() ?? ''
        if (!reason) {
            setValidationId(request.id)
            return
        }
        setValidationId(null)
        await decide({ id: request.id, status, reason }).unwrap()
    }

    return <section className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-primary/10 text-primary"><ClipboardPenLine className="size-5" /></span><div><h2 className="text-lg font-black text-foreground">{text.title}</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">{text.description}</p></div></div>
        {query.isLoading && <div role="status" className="mt-5 h-28 animate-pulse rounded-[var(--radius-card)] bg-muted" />}
        {query.error && <div role="alert" className="mt-5 rounded-[var(--radius-card)] border border-destructive/30 bg-destructive/5 p-4"><p className="text-sm font-semibold text-destructive">{getApiErrorMessage(query.error, text.failed)}</p><RetryButton className="mt-3" onRetry={query.refetch} label={locale === 'ru' ? 'Повторить' : 'Retry'} /></div>}
        {!query.isLoading && !query.error && (requests.length === 0 ? <p className="mt-5 rounded-[var(--radius-card)] bg-secondary p-4 text-sm text-muted-foreground">{text.empty}</p> : <div className="mt-5 grid gap-3">{requests.map((request) => <article key={request.id} className="rounded-[var(--radius-card)] border border-border bg-background p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-black text-foreground">{request.kind === 'verification' ? text.verification : text.profile}</p><time className="text-xs text-muted-foreground">{new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(request.createdAt))}</time></div>{request.kind === 'profile_update' && <dl className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">{Object.entries(request.payload).map(([key, value]) => <div key={key} className="rounded-[var(--radius-control)] bg-card px-3 py-2"><dt className="font-bold text-foreground">{key}</dt><dd className="mt-1 break-words">{Array.isArray(value) ? value.join(', ') : String(value)}</dd></div>)}</dl>}<label className="mt-3 grid gap-2 text-xs font-bold text-muted-foreground"><span>{text.note}</span><textarea rows={2} value={notes[request.id] ?? ''} onChange={(event) => { setValidationId(null); setNotes((current) => ({ ...current, [request.id]: event.target.value })) }} placeholder={text.placeholder} className="rounded-[var(--radius-control)] border border-border bg-card p-3 text-sm font-normal text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" /></label>{validationId === request.id && <p className="mt-2 text-xs font-bold text-destructive">{text.required}</p>}<div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={decision.isLoading} onClick={() => void submit(request, 'approved')} className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-control)] bg-primary px-3 text-xs font-black text-primary-foreground disabled:opacity-50"><CheckCircle2 className="size-4" />{text.approve}</button><button type="button" disabled={decision.isLoading} onClick={() => void submit(request, 'rejected')} className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-control)] border border-border px-3 text-xs font-black text-foreground hover:border-destructive hover:text-destructive disabled:opacity-50"><XCircle className="size-4" />{text.reject}</button></div></article>)}</div>)}
    </section>
}
