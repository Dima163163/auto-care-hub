import { Coins, Gift, WalletCards } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'

import {
    useGetOwnerAutoCareBonusLiabilityQuery,
    useGrantAutoCareBonusMutation,
    type AutoCareApiProvider,
} from '@/entities/automotive-service'
import { useGetOwnerClientsQuery } from '@/entities/user'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { RetryButton } from '@/shared/ui/query-refresh-error'
import { StateCard } from '@/shared/ui/state-card'

type Props = { provider: AutoCareApiProvider; locale: string }

export function OwnerProviderBonusPanel({ provider, locale }: Props) {
    const ru = locale === 'ru'
    const query = useGetOwnerAutoCareBonusLiabilityQuery(provider.id)
    const clientsQuery = useGetOwnerClientsQuery()
    const [grant, grantState] = useGrantAutoCareBonusMutation()
    const [clientId, setClientId] = useState('')
    const [points, setPoints] = useState('')
    const [reason, setReason] = useState('')
    const [grantMessage, setGrantMessage] = useState<string | null>(null)

    if (query.isLoading) return <StateCard variant="loading" title={ru ? 'Загружаем историю бонусов…' : 'Loading bonus history…'} />
    if (query.error) return <StateCard variant="error" title={ru ? 'Не удалось загрузить историю бонусов' : 'Could not load bonus history'} description={getApiErrorMessage(query.error, '')} action={<RetryButton onRetry={query.refetch} label={ru ? 'Повторить' : 'Retry'} />} />
    const data = query.data
    if (!data) return null

    const submitGrant = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const amount = Number(points)
        if (!clientId || !Number.isInteger(amount) || amount < 1 || amount > 100_000 || reason.trim().length < 3) return

        try {
            await grant({
                providerId: provider.id,
                clientId,
                points: amount,
                reason: reason.trim(),
                idempotencyKey: `manual-${provider.id}-${clientId}-${Date.now()}`,
            }).unwrap()
            setPoints('')
            setReason('')
            setGrantMessage(ru ? 'Бонус начислен и записан в аудит.' : 'Bonus granted and recorded in the audit trail.')
            await query.refetch()
        } catch {
            setGrantMessage(null)
        }
    }

    return <section className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start gap-3"><span className="flex size-10 items-center justify-center rounded-[var(--radius-control)] bg-primary/10 text-primary"><WalletCards className="size-5" /></span><div><h2 className="text-base font-black text-foreground">{ru ? 'Бонусы и обязательства' : 'Bonuses and liability'}</h2><p className="mt-1 text-sm text-muted-foreground">{ru ? 'Остатки и движения по бонусам клиентов вашего сервиса.' : 'Customer bonus balances and movements for this service.'}</p></div></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2"><Metric label={ru ? 'Активных балансов' : 'Active balances'} value={String(data.activeAccounts)} /><Metric label={ru ? 'Обязательства, баллов' : 'Liability, points'} value={String(data.liabilityPoints)} /></div>
        <form className="mt-5 rounded-[var(--radius-card)] border border-primary/20 bg-primary/5 p-4" onSubmit={(event) => void submitGrant(event)}>
            <div className="flex items-center gap-2"><Gift className="size-4 text-primary" /><h3 className="text-sm font-black text-foreground">{ru ? 'Начислить бонус вручную' : 'Grant a manual bonus'}</h3></div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{ru ? 'Начисление ограничено 100 000 баллами и сохраняется в аудите.' : 'The grant is capped at 100,000 points and retained in the audit trail.'}</p>
            {clientsQuery.isLoading ? <p className="mt-3 text-xs font-semibold text-muted-foreground">{ru ? 'Загружаем клиентов…' : 'Loading clients…'}</p> : clientsQuery.error ? <p className="mt-3 text-xs font-semibold text-destructive">{getApiErrorMessage(clientsQuery.error, ru ? 'Не удалось загрузить клиентов.' : 'Could not load clients.')}</p> : <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px]">
                <label className="grid gap-1.5 text-xs font-black text-foreground"><span>{ru ? 'Клиент' : 'Customer'}</span><select required value={clientId} onChange={(event) => setClientId(event.target.value)} className="h-10 rounded-[var(--radius-control)] border border-border bg-background px-3 text-sm font-semibold text-foreground"><option value="">{ru ? 'Выберите клиента' : 'Choose a customer'}</option>{(clientsQuery.data ?? []).map((client) => <option key={client.id} value={client.id}>{client.name} · {client.phone ?? client.email}</option>)}</select></label>
                <label className="grid gap-1.5 text-xs font-black text-foreground"><span>{ru ? 'Баллы' : 'Points'}</span><input required type="number" min="1" max="100000" step="1" value={points} onChange={(event) => setPoints(event.target.value)} className="h-10 rounded-[var(--radius-control)] border border-border bg-background px-3 text-sm font-semibold text-foreground" /></label>
                <label className="grid gap-1.5 text-xs font-black text-foreground sm:col-span-2"><span>{ru ? 'Причина' : 'Reason'}</span><input required minLength={3} maxLength={240} value={reason} onChange={(event) => setReason(event.target.value)} placeholder={ru ? 'Например: компенсация после визита' : 'For example: visit compensation'} className="h-10 rounded-[var(--radius-control)] border border-border bg-background px-3 text-sm font-semibold text-foreground" /></label>
                <button type="submit" disabled={grantState.isLoading || !clientsQuery.data?.length} className="inline-flex h-10 items-center justify-center rounded-[var(--radius-control)] bg-primary px-4 text-xs font-black text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-2">{grantState.isLoading ? (ru ? 'Начисляем…' : 'Granting…') : (ru ? 'Начислить бонус' : 'Grant bonus')}</button>
            </div>}
            {grantState.error && <p role="alert" className="mt-3 text-xs font-bold text-destructive">{getApiErrorMessage(grantState.error, ru ? 'Не удалось начислить бонус.' : 'Could not grant bonus.')}</p>}
            {grantMessage && <p role="status" className="mt-3 text-xs font-bold text-status-success-foreground">{grantMessage}</p>}
        </form>
        <div className="mt-5 space-y-2">{data.entries.length === 0 ? <p className="rounded-[var(--radius-card)] bg-secondary p-4 text-sm text-muted-foreground">{ru ? 'Операций с бонусами пока нет.' : 'There are no bonus transactions yet.'}</p> : data.entries.slice(0, 12).map((entry) => <div key={entry.id} className="flex items-center justify-between gap-3 rounded-[var(--radius-card)] border border-border p-3"><div className="min-w-0"><p className="truncate text-sm font-bold text-foreground">{entry.clientName}</p><p className="mt-1 truncate text-xs text-muted-foreground">{entry.reason}</p></div><div className="shrink-0 text-right"><p className={`text-sm font-black ${entry.points > 0 ? 'text-status-success-foreground' : 'text-destructive'}`}>{entry.points > 0 ? '+' : ''}{entry.points}</p><p className="mt-1 text-[11px] text-muted-foreground">{new Intl.DateTimeFormat(ru ? 'ru-RU' : 'en-US', { dateStyle: 'short' }).format(new Date(entry.createdAt))}</p></div></div>)}</div>
    </section>
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-[var(--radius-card)] bg-secondary p-4"><Coins className="size-4 text-primary" /><p className="mt-2 text-2xl font-black text-foreground">{value}</p><p className="mt-1 text-xs font-semibold text-muted-foreground">{label}</p></div> }
