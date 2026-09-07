import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Save, ShieldCheck, SlidersHorizontal } from 'lucide-react'

import { useGetAutoCareMarketsQuery, useGetSuperAdminTrustPolicyQuery, useUpdateSuperAdminTrustPolicyMutation } from '@/entities/automotive-service'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { useTranslation } from '@/shared/lib/useTranslation'
import { RetryButton } from '@/shared/ui/query-refresh-error'

const inputClassName = 'mt-1 h-10 w-full rounded-[var(--radius-control)] border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring'
const buttonClassName = 'inline-flex h-10 items-center gap-2 rounded-[var(--radius-control)] bg-primary px-3 text-xs font-black text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60'

type Draft = {
    policyVersion: string
    trustedMinimumRating: string
    trustedMinimumReviews: string
    trustedMinimumCompletedVisits: string
    trustedMaxNoShowRate: string
    trustedMaxComplaintRate: string
    trustedMaxResponseTimeMinutes: string
    reassessmentIntervalHours: string
    rolloutEnabled: boolean
    rolloutPercentage: string
    rolloutMarketIds: string[]
}

function toDraft(policy: NonNullable<ReturnType<typeof useGetSuperAdminTrustPolicyQuery>['data']>): Draft {
    return {
        policyVersion: policy.policyVersion,
        trustedMinimumRating: String(policy.trustedMinimumRating),
        trustedMinimumReviews: String(policy.trustedMinimumReviews),
        trustedMinimumCompletedVisits: String(policy.trustedMinimumCompletedVisits),
        trustedMaxNoShowRate: String(Math.round(policy.trustedMaxNoShowRate * 100)),
        trustedMaxComplaintRate: String(Math.round(policy.trustedMaxComplaintRate * 100)),
        trustedMaxResponseTimeMinutes: String(policy.trustedMaxResponseTimeMinutes),
        reassessmentIntervalHours: String(policy.reassessmentIntervalHours),
        rolloutEnabled: policy.rollout.enabled,
        rolloutPercentage: String(policy.rollout.percentage),
        rolloutMarketIds: policy.rollout.marketIds,
    }
}

export function SuperAdminTrustPolicyPanel() {
    const { t } = useTranslation()
    const text = {
        title: t('superAdminTrustPolicy.title'),
        description: t('superAdminTrustPolicy.description'),
        policyVersion: t('superAdminTrustPolicy.policyVersion'),
        rating: t('superAdminTrustPolicy.rating'),
        reviews: t('superAdminTrustPolicy.reviews'),
        visits: t('superAdminTrustPolicy.visits'),
        noShow: t('superAdminTrustPolicy.noShow'),
        complaints: t('superAdminTrustPolicy.complaints'),
        response: t('superAdminTrustPolicy.response'),
        interval: t('superAdminTrustPolicy.interval'),
        rollout: t('superAdminTrustPolicy.rollout'),
        percentage: t('superAdminTrustPolicy.percentage'),
        markets: t('superAdminTrustPolicy.markets'),
        allMarkets: t('superAdminTrustPolicy.allMarkets'),
        save: t('superAdminTrustPolicy.save'),
        saving: t('superAdminTrustPolicy.saving'),
        saved: t('superAdminTrustPolicy.saved'),
        retry: t('superAdminTrustPolicy.retry'),
        loading: t('superAdminTrustPolicy.loading'),
        failed: t('superAdminTrustPolicy.failed'),
        invalid: t('superAdminTrustPolicy.invalid'),
    }
    const policyQuery = useGetSuperAdminTrustPolicyQuery()
    const marketsQuery = useGetAutoCareMarketsQuery()
    const [updatePolicy, updateState] = useUpdateSuperAdminTrustPolicyMutation()
    const [draft, setDraft] = useState<Draft | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [saved, setSaved] = useState(false)

    const markets = marketsQuery.data ?? []
    const formDraft = draft ?? (policyQuery.data ? toDraft(policyQuery.data) : null)
    if (policyQuery.isLoading) return <section className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm"><div role="status" className="h-28 animate-pulse rounded-[var(--radius-card)] bg-muted"><span className="sr-only">{text.loading}</span></div></section>
    if (policyQuery.error) return <section className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm"><div role="alert" className="rounded-[var(--radius-card)] border border-destructive/30 bg-destructive/5 p-4"><p className="text-sm font-semibold text-destructive">{getApiErrorMessage(policyQuery.error, text.failed)}</p><RetryButton className="mt-3" onRetry={policyQuery.refetch} label={text.retry} /></div></section>
    if (!formDraft) return <section className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm"><div role="status" className="h-28 animate-pulse rounded-[var(--radius-card)] bg-muted"><span className="sr-only">{text.loading}</span></div></section>

    const update = (key: keyof Draft, value: string | boolean) => { setSaved(false); setError(null); setDraft((current) => ({ ...(current ?? formDraft), [key]: value })) }
    const toggleMarket = (marketId: string) => setDraft((current) => {
        const base = current ?? formDraft
        const selected = base.rolloutMarketIds.includes(marketId)
        return { ...base, rolloutMarketIds: selected ? base.rolloutMarketIds.filter((id) => id !== marketId) : [...base.rolloutMarketIds, marketId] }
    })
    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const activeDraft = draft ?? formDraft
        const toNumber = (value: string) => Number(value)
        const numericDraftValues = [
            activeDraft.trustedMinimumRating,
            activeDraft.trustedMinimumReviews,
            activeDraft.trustedMinimumCompletedVisits,
            activeDraft.trustedMaxNoShowRate,
            activeDraft.trustedMaxComplaintRate,
            activeDraft.trustedMaxResponseTimeMinutes,
            activeDraft.reassessmentIntervalHours,
            activeDraft.rolloutPercentage,
        ]
        const values = {
            trustedMinimumRating: toNumber(activeDraft.trustedMinimumRating), trustedMinimumReviews: toNumber(activeDraft.trustedMinimumReviews), trustedMinimumCompletedVisits: toNumber(activeDraft.trustedMinimumCompletedVisits),
            trustedMaxNoShowRate: toNumber(activeDraft.trustedMaxNoShowRate) / 100, trustedMaxComplaintRate: toNumber(activeDraft.trustedMaxComplaintRate) / 100, trustedMaxResponseTimeMinutes: toNumber(activeDraft.trustedMaxResponseTimeMinutes), reassessmentIntervalHours: toNumber(activeDraft.reassessmentIntervalHours), rolloutPercentage: toNumber(activeDraft.rolloutPercentage),
        }
        if (numericDraftValues.some((value) => value.trim() === '') || Object.values(values).some((value) => !Number.isFinite(value)) || values.trustedMinimumRating < 0 || values.trustedMinimumRating > 5 || values.trustedMaxNoShowRate < 0 || values.trustedMaxNoShowRate > 1 || values.trustedMaxComplaintRate < 0 || values.trustedMaxComplaintRate > 1 || values.rolloutPercentage < 0 || values.rolloutPercentage > 100) { setError(text.invalid); return }
        try {
            setError(null)
            const result = await updatePolicy({ policyVersion: activeDraft.policyVersion, trustedMinimumRating: values.trustedMinimumRating, trustedMinimumReviews: values.trustedMinimumReviews, trustedMinimumCompletedVisits: values.trustedMinimumCompletedVisits, trustedMaxNoShowRate: values.trustedMaxNoShowRate, trustedMaxComplaintRate: values.trustedMaxComplaintRate, trustedMaxResponseTimeMinutes: values.trustedMaxResponseTimeMinutes, reassessmentIntervalHours: values.reassessmentIntervalHours, rollout: { enabled: activeDraft.rolloutEnabled, marketIds: activeDraft.rolloutMarketIds, percentage: values.rolloutPercentage } }).unwrap()
            setDraft(toDraft(result))
            setSaved(true)
        } catch (reason) {
            console.error('Failed to update super-admin trust policy', reason)
            setError(reason instanceof Error ? reason.message : text.invalid)
        }
    }

    return <section className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm"><div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-primary/10 text-primary"><ShieldCheck className="size-5" /></span><div><h2 className="flex items-center gap-2 text-lg font-black text-foreground"><SlidersHorizontal className="size-5 text-primary" />{text.title}</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{text.description}</p></div></div><form onSubmit={(event) => void submit(event)} className="mt-5"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Field label={text.policyVersion}><input value={formDraft.policyVersion} onChange={(event) => update('policyVersion', event.target.value)} className={inputClassName} /></Field><Field label={text.rating}><input type="number" min="0" max="5" step="0.1" value={formDraft.trustedMinimumRating} onChange={(event) => update('trustedMinimumRating', event.target.value)} className={inputClassName} /></Field><Field label={text.reviews}><input type="number" min="0" value={formDraft.trustedMinimumReviews} onChange={(event) => update('trustedMinimumReviews', event.target.value)} className={inputClassName} /></Field><Field label={text.visits}><input type="number" min="0" value={formDraft.trustedMinimumCompletedVisits} onChange={(event) => update('trustedMinimumCompletedVisits', event.target.value)} className={inputClassName} /></Field><Field label={text.noShow}><input type="number" min="0" max="100" value={formDraft.trustedMaxNoShowRate} onChange={(event) => update('trustedMaxNoShowRate', event.target.value)} className={inputClassName} /></Field><Field label={text.complaints}><input type="number" min="0" max="100" value={formDraft.trustedMaxComplaintRate} onChange={(event) => update('trustedMaxComplaintRate', event.target.value)} className={inputClassName} /></Field><Field label={text.response}><input type="number" min="1" value={formDraft.trustedMaxResponseTimeMinutes} onChange={(event) => update('trustedMaxResponseTimeMinutes', event.target.value)} className={inputClassName} /></Field><Field label={text.interval}><input type="number" min="1" value={formDraft.reassessmentIntervalHours} onChange={(event) => update('reassessmentIntervalHours', event.target.value)} className={inputClassName} /></Field></div><div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]"><div className="rounded-[var(--radius-card)] border border-border bg-background p-4"><label className="flex items-center gap-2 text-sm font-bold text-foreground"><input type="checkbox" checked={formDraft.rolloutEnabled} onChange={(event) => update('rolloutEnabled', event.target.checked)} />{text.rollout}</label><Field label={text.percentage}><input type="number" min="0" max="100" value={formDraft.rolloutPercentage} onChange={(event) => update('rolloutPercentage', event.target.value)} className={inputClassName} /></Field></div><div className="rounded-[var(--radius-card)] border border-border bg-background p-4"><p className="text-xs font-black uppercase tracking-wide text-muted-foreground">{text.markets}</p><label className="mt-3 flex items-center gap-2 text-sm font-semibold text-foreground"><input type="checkbox" checked={formDraft.rolloutMarketIds.length === 0} onChange={() => setDraft((current) => ({ ...(current ?? formDraft), rolloutMarketIds: [] }))} />{text.allMarkets}</label><div className="mt-3 grid max-h-36 gap-2 overflow-auto sm:grid-cols-2">{markets.map((market) => <label key={market.id} className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-foreground"><input type="checkbox" checked={formDraft.rolloutMarketIds.includes(market.id)} onChange={() => toggleMarket(market.id)} />{market.cityName} <span className="text-muted-foreground">({market.countryCode})</span></label>)}</div></div></div>{(error || saved) && <p role={error ? 'alert' : 'status'} className={`mt-3 text-xs font-bold ${error ? 'text-destructive' : 'text-status-success-foreground'}`}>{error ?? text.saved}</p>}<button type="submit" disabled={updateState.isLoading} className={`${buttonClassName} mt-4`}><Save className="size-4" />{updateState.isLoading ? text.saving : text.save}</button></form></section>
}

function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="text-xs font-bold text-muted-foreground"><span>{label}</span>{children}</label> }
