import { Coins, Gift, WalletCards } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'

import {
    useGetOwnerAutoCareBonusLiabilityQuery,
    useGrantAutoCareBonusMutation,
} from '@/entities/automotive-service'
import type { AutoCareApiProvider } from '@/entities/automotive-service'
import { useGetOwnerClientsQuery } from '@/entities/user'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { formatDateTime } from '@/shared/lib/locale-format'
import { useTranslation } from '@/shared/lib/useTranslation'
import { RetryButton } from '@/shared/ui/query-refresh-error'
import { StateCard } from '@/shared/ui/state-card'

import { validateManualBonusGrant } from '../lib/manual-bonus-grant'

type Props = { provider: AutoCareApiProvider }

const validationMessageKey = {
    client: 'autocare.ownerProviderBonusValidationClient',
    points: 'autocare.ownerProviderBonusValidationPoints',
    reason: 'autocare.ownerProviderBonusValidationReason',
} as const

const entryTypeKey = {
    earn: 'autocare.ownerProviderBonusEntryEarn',
    redeem: 'autocare.ownerProviderBonusEntryRedeem',
    refund: 'autocare.ownerProviderBonusEntryRefund',
    expire: 'autocare.ownerProviderBonusEntryExpire',
    adjustment: 'autocare.ownerProviderBonusEntryAdjustment',
} as const

export function OwnerProviderBonusPanel({ provider }: Props) {
    const { locale, t } = useTranslation()
    const query = useGetOwnerAutoCareBonusLiabilityQuery(provider.id)
    const clientsQuery = useGetOwnerClientsQuery()
    const [grant, grantState] = useGrantAutoCareBonusMutation()
    const [clientId, setClientId] = useState('')
    const [points, setPoints] = useState('')
    const [reason, setReason] = useState('')
    const [grantMessage, setGrantMessage] = useState<string | null>(null)
    const [grantValidationField, setGrantValidationField] = useState<keyof typeof validationMessageKey | null>(null)

    if (query.isLoading) return <StateCard variant="loading" title={t('autocare.ownerProviderBonusLoading')} />
    if (query.error) return <StateCard variant="error" title={t('autocare.ownerProviderBonusLoadError')} description={getApiErrorMessage(query.error, t('autocare.ownerProviderBonusLoadError'))} action={<RetryButton onRetry={query.refetch} label={t('common.retry')} />} />
    const data = query.data
    if (!data) return null

    const submitGrant = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const validation = validateManualBonusGrant(clientId, points, reason)
        if (!validation.valid) {
            setGrantValidationField(validation.field)
            return
        }
        setGrantValidationField(null)

        try {
            await grant({
                providerId: provider.id,
                clientId,
                points: validation.points,
                reason: validation.reason,
                idempotencyKey: `manual-${provider.id}-${clientId}-${Date.now()}`,
            }).unwrap()
            setPoints('')
            setReason('')
            setGrantMessage(t('autocare.ownerProviderBonusSuccess'))
            await query.refetch()
        } catch {
            setGrantMessage(null)
        }
    }

    return <section className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start gap-3"><span className="flex size-10 items-center justify-center rounded-[var(--radius-control)] bg-primary/10 text-primary"><WalletCards className="size-5" /></span><div><h2 className="text-base font-black text-foreground">{t('autocare.ownerProviderBonusTitle')}</h2><p className="mt-1 text-sm text-muted-foreground">{t('autocare.ownerProviderBonusDescription')}</p></div></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2"><Metric label={t('autocare.ownerProviderBonusActiveBalances')} value={String(data.activeAccounts)} /><Metric label={t('autocare.ownerProviderBonusLiability')} value={String(data.liabilityPoints)} /></div>
        <form className="mt-5 rounded-[var(--radius-card)] border border-primary/20 bg-primary/5 p-4" onSubmit={(event) => void submitGrant(event)}>
            <div className="flex items-center gap-2"><Gift className="size-4 text-primary" /><h3 className="text-sm font-black text-foreground">{t('autocare.ownerProviderBonusManualTitle')}</h3></div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{t('autocare.ownerProviderBonusManualDescription')}</p>
            {clientsQuery.isLoading ? <p className="mt-3 text-xs font-semibold text-muted-foreground">{t('autocare.ownerProviderBonusClientsLoading')}</p> : clientsQuery.error ? <p role="alert" className="mt-3 text-xs font-semibold text-destructive">{getApiErrorMessage(clientsQuery.error, t('autocare.ownerProviderBonusClientsLoadError'))}</p> : <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px]">
                <label className="grid gap-1.5 text-xs font-black text-foreground"><span>{t('autocare.ownerProviderBonusClient')}</span><select required value={clientId} onChange={(event) => { setClientId(event.target.value); setGrantValidationField(null) }} aria-invalid={grantValidationField === 'client'} className="h-10 rounded-[var(--radius-control)] border border-border bg-background px-3 text-sm font-semibold text-foreground"><option value="">{t('autocare.ownerProviderBonusChooseClient')}</option>{(clientsQuery.data ?? []).map((client) => <option key={client.id} value={client.id}>{client.name} · {client.phone ?? client.email}</option>)}</select></label>
                <label className="grid gap-1.5 text-xs font-black text-foreground"><span>{t('autocare.ownerProviderBonusPoints')}</span><input required type="number" min="1" max="100000" step="1" value={points} onChange={(event) => { setPoints(event.target.value); setGrantValidationField(null) }} aria-invalid={grantValidationField === 'points'} className="h-10 rounded-[var(--radius-control)] border border-border bg-background px-3 text-sm font-semibold text-foreground" /></label>
                <label className="grid gap-1.5 text-xs font-black text-foreground sm:col-span-2"><span>{t('autocare.ownerProviderBonusReason')}</span><input required minLength={3} maxLength={240} value={reason} onChange={(event) => { setReason(event.target.value); setGrantValidationField(null) }} aria-invalid={grantValidationField === 'reason'} placeholder={t('autocare.ownerProviderBonusReasonPlaceholder')} className="h-10 rounded-[var(--radius-control)] border border-border bg-background px-3 text-sm font-semibold text-foreground" /></label>
                <button type="submit" disabled={grantState.isLoading || !clientsQuery.data?.length} className="inline-flex h-10 items-center justify-center rounded-[var(--radius-control)] bg-primary px-4 text-xs font-black text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-2">{grantState.isLoading ? t('autocare.ownerProviderBonusGranting') : t('autocare.ownerProviderBonusGrant')}</button>
            </div>}
            {grantValidationField && <p role="alert" className="mt-3 text-xs font-bold text-status-warning-foreground">{t(validationMessageKey[grantValidationField])}</p>}
            {grantState.error && <p role="alert" className="mt-3 text-xs font-bold text-destructive">{getApiErrorMessage(grantState.error, t('autocare.ownerProviderBonusGrantError'))}</p>}
            {grantMessage && <p role="status" className="mt-3 text-xs font-bold text-status-success-foreground">{grantMessage}</p>}
        </form>
        <div className="mt-5 space-y-2">{data.entries.length === 0 ? <p className="rounded-[var(--radius-card)] bg-secondary p-4 text-sm text-muted-foreground">{t('autocare.ownerProviderBonusEmpty')}</p> : data.entries.map((entry) => <div key={entry.id} className="flex items-center justify-between gap-3 rounded-[var(--radius-card)] border border-border p-3"><div className="min-w-0"><p className="truncate text-sm font-bold text-foreground">{entry.clientName}</p><p className="mt-1 truncate text-xs text-muted-foreground">{entryTypeLabel(entry.type, t)} · {entry.reason}</p>{entry.expiresAt ? <p className="mt-1 text-[11px] text-muted-foreground">{t('autocare.ownerProviderBonusExpires')}: {formatDateTime(entry.expiresAt, locale, { dateStyle: 'medium' })}</p> : null}</div><div className="shrink-0 text-right"><p className={`text-sm font-black ${entry.points > 0 ? 'text-status-success-foreground' : 'text-destructive'}`}>{entry.points > 0 ? '+' : ''}{entry.points}</p><p className="mt-1 text-[11px] text-muted-foreground">{formatDateTime(entry.createdAt, locale, { dateStyle: 'short' })}</p></div></div>)}</div>
    </section>
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-[var(--radius-card)] bg-secondary p-4"><Coins className="size-4 text-primary" /><p className="mt-2 text-2xl font-black text-foreground">{value}</p><p className="mt-1 text-xs font-semibold text-muted-foreground">{label}</p></div> }

function entryTypeLabel(type: keyof typeof entryTypeKey, t: ReturnType<typeof useTranslation>['t']) {
    return t(entryTypeKey[type])
}
