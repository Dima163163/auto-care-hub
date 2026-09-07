import { CheckCircle2, Gavel, XCircle } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
    type AutoCareAppeal,
    useDecideAdminAutoCareAppealMutation,
    useGetAdminAutoCareAppealsQuery,
} from '@/entities/automotive-service'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { formatDateTime } from '@/shared/lib/locale-format'
import { useTranslation } from '@/shared/lib/useTranslation'
import { RetryButton } from '@/shared/ui/query-refresh-error'

type AppealFilter = AutoCareAppeal['status'] | 'all'
type SubjectFilter = AutoCareAppeal['subject'] | 'all'

export function AdminAutoCareAppealsPanel() {
    const { locale, t } = useTranslation()
    const text = {
        title: t('adminAppeals.title'),
        description: t('adminAppeals.description'),
        empty: t('adminAppeals.empty'),
        reason: t('adminAppeals.reason'),
        evidence: t('adminAppeals.evidence'),
        accept: t('adminAppeals.accept'),
        reject: t('adminAppeals.reject'),
        decisionReason: t('adminAppeals.decisionReason'),
        placeholder: t('adminAppeals.placeholder'),
        required: t('adminAppeals.required'),
        failed: t('adminAppeals.failed'),
        saved: t('adminAppeals.saved'),
        failedDecision: t('adminAppeals.failedDecision'),
        status: t('adminAppeals.status'),
        subject: t('adminAppeals.subject'),
        all: t('adminAppeals.all'),
        statuses: {
            pending: t('adminAppeals.statusPending'),
            accepted: t('adminAppeals.statusAccepted'),
            rejected: t('adminAppeals.statusRejected'),
            withdrawn: t('adminAppeals.statusWithdrawn'),
        },
        subjects: {
            provider: t('adminAppeals.subjectProvider'),
            review: t('adminAppeals.subjectReview'),
            suspension: t('adminAppeals.subjectSuspension'),
            catalog: t('adminAppeals.subjectCatalog'),
        },
        decided: t('adminAppeals.decided'),
    }
    const [status, setStatus] = useState<AppealFilter>('pending')
    const [subject, setSubject] = useState<SubjectFilter>('all')
    const query = useGetAdminAutoCareAppealsQuery({
        ...(status === 'all' ? {} : { status }),
        ...(subject === 'all' ? {} : { subject }),
    })
    const [decide, decisionState] = useDecideAdminAutoCareAppealMutation()
    const [notes, setNotes] = useState<Record<string, string>>({})
    const [validationId, setValidationId] = useState<string | null>(null)
    const [savedId, setSavedId] = useState<string | null>(null)
    const appeals = query.data ?? []

    const submit = async (appeal: AutoCareAppeal, nextStatus: 'accepted' | 'rejected') => {
        const reason = notes[appeal.id]?.trim() ?? ''
        if (!reason) {
            setValidationId(appeal.id)
            return
        }
        setValidationId(null)
        try {
            await decide({ id: appeal.id, status: nextStatus, reason }).unwrap()
            setSavedId(appeal.id)
        } catch {
            setSavedId(null)
        }
    }

    return (
        <section id="admin-appeals" className="scroll-mt-24 rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-primary/10 text-primary"><Gavel className="size-5" /></span><div><h2 className="text-lg font-black text-foreground">{text.title}</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{text.description}</p></div></div>
                <div className="grid grid-cols-2 gap-2">
                    <label className="grid gap-1 text-xs font-bold text-muted-foreground"><span>{text.status}</span><select value={status} onChange={(event) => setStatus(event.target.value as AppealFilter)} className="h-9 cursor-pointer appearance-none rounded-[var(--radius-control)] border border-border bg-card px-3 text-sm font-semibold text-foreground"><option value="all">{text.all}</option>{Object.entries(text.statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                    <label className="grid gap-1 text-xs font-bold text-muted-foreground"><span>{text.subject}</span><select value={subject} onChange={(event) => setSubject(event.target.value as SubjectFilter)} className="h-9 cursor-pointer appearance-none rounded-[var(--radius-control)] border border-border bg-card px-3 text-sm font-semibold text-foreground"><option value="all">{text.all}</option>{Object.entries(text.subjects).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                </div>
            </div>

            {query.isLoading ? <div role="status" className="mt-5 h-24 animate-pulse rounded-[var(--radius-card)] bg-muted"><span className="sr-only">{t('common.loading')}</span></div> : null}
            {query.error ? <div role="alert" className="mt-5 rounded-[var(--radius-card)] border border-destructive/30 bg-destructive/5 p-4"><p className="text-sm font-semibold text-destructive">{getApiErrorMessage(query.error, text.failed)}</p><RetryButton className="mt-3" onRetry={query.refetch} label={t('common.retry')} /></div> : null}
            {decisionState.error ? <div role="alert" className="mt-5 rounded-[var(--radius-card)] border border-destructive/30 bg-destructive/5 p-4 text-sm font-semibold text-destructive">{getApiErrorMessage(decisionState.error, text.failedDecision)}</div> : null}

            {!query.isLoading && !query.error ? appeals.length === 0 ? (
                <p className="mt-5 rounded-[var(--radius-card)] bg-secondary p-4 text-sm text-muted-foreground">{text.empty}</p>
            ) : (
                <div className="mt-5 grid gap-3">
                    {appeals.map((appeal) => (
                        <article key={appeal.id} className="rounded-[var(--radius-card)] border border-border bg-background p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-primary/10 px-2 py-1 text-[11px] font-black text-primary">{text.subjects[appeal.subject]}</span><span className="rounded-full bg-secondary px-2 py-1 text-[11px] font-black text-muted-foreground">{text.statuses[appeal.status]}</span></div><time className="text-xs text-muted-foreground">{formatDateTime(appeal.createdAt, locale, { dateStyle: 'medium', timeStyle: 'short' })}</time></div>
                            <p className="mt-3 text-sm leading-6 text-foreground"><b>{text.reason}:</b> {appeal.reason}</p>
                            <p className="mt-2 text-xs font-semibold text-muted-foreground">{text.evidence}: {appeal.evidenceIds.length}</p>
                            {appeal.status === 'pending' ? <>
                                <label className="mt-3 grid gap-2 text-xs font-bold text-muted-foreground"><span>{text.decisionReason}</span><textarea rows={2} value={notes[appeal.id] ?? ''} onChange={(event) => { setSavedId(null); setValidationId(null); setNotes((current) => ({ ...current, [appeal.id]: event.target.value })) }} placeholder={text.placeholder} className="rounded-[var(--radius-control)] border border-border bg-card p-3 text-sm font-normal text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" /></label>
                                {validationId === appeal.id ? <p role="alert" className="mt-2 text-xs font-bold text-destructive">{text.required}</p> : null}
                                <div className="mt-3 flex flex-wrap items-center gap-2"><Button type="button" size="sm" onClick={() => void submit(appeal, 'accepted')} loading={decisionState.isLoading} disabled={decisionState.isLoading}><CheckCircle2 className="mr-1.5 size-4" />{text.accept}</Button><Button type="button" size="sm" variant="outline" onClick={() => void submit(appeal, 'rejected')} loading={decisionState.isLoading} disabled={decisionState.isLoading}><XCircle className="mr-1.5 size-4" />{text.reject}</Button>{savedId === appeal.id ? <span role="status" className="text-xs font-bold text-status-success-foreground">{text.saved}</span> : null}</div>
                            </> : <p className="mt-3 rounded-[var(--radius-control)] bg-secondary px-3 py-2 text-sm text-muted-foreground"><b>{text.decided}:</b> {appeal.decisionReason ?? t('common.notProvided')}</p>}
                        </article>
                    ))}
                </div>
            ) : null}
        </section>
    )
}
