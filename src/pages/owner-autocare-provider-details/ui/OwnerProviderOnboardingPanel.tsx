import { BadgeCheck, ShieldCheck } from 'lucide-react'
import { useState } from 'react'

import {
    useCancelOwnerAutoCareProviderChangeRequestMutation,
    useCreateOwnerAutoCareProviderChangeRequestMutation,
    useGetOwnerAutoCareProviderChangeRequestsQuery,
    type AutoCareApiProvider,
} from '@/entities/automotive-service'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { formatDateTime } from '@/shared/lib/locale-format'
import { useTranslation } from '@/shared/lib/useTranslation'
import { RetryButton } from '@/shared/ui/query-refresh-error'
import { StateCard } from '@/shared/ui/state-card'

import { OwnerProviderProfileChangeForm } from './OwnerProviderProfileChangeForm'

type Props = { provider: AutoCareApiProvider; locale: string }

const statusLabelKey = {
    pending: 'autocare.ownerProviderOnboardingStatusPending',
    approved: 'autocare.ownerProviderOnboardingStatusApproved',
    rejected: 'autocare.ownerProviderOnboardingStatusRejected',
    cancelled: 'autocare.ownerProviderOnboardingStatusCancelled',
} as const

export function OwnerProviderOnboardingPanel({ provider, locale }: Props) {
    const { t } = useTranslation()
    const query = useGetOwnerAutoCareProviderChangeRequestsQuery(provider.id)
    const [createRequest, createState] = useCreateOwnerAutoCareProviderChangeRequestMutation()
    const [cancelRequest, cancelState] = useCancelOwnerAutoCareProviderChangeRequestMutation()
    const [cancelError, setCancelError] = useState<string | null>(null)
    const verificationPending = query.data?.some((request) => request.status === 'pending' && request.kind === 'verification') ?? false
    const profilePending = query.data?.some((request) => request.status === 'pending' && request.kind === 'profile_update') ?? false

    const requestVerification = async () => {
        try {
            await createRequest({ providerId: provider.id, kind: 'verification' }).unwrap()
        } catch {
            return
        }
    }
    const submitProfileUpdate = async (payload: Record<string, unknown>) => {
        await createRequest({ providerId: provider.id, kind: 'profile_update', payload }).unwrap()
    }

    const cancel = async (requestId: string) => {
        setCancelError(null)
        try {
            await cancelRequest({ providerId: provider.id, requestId }).unwrap()
        } catch (reason) {
            setCancelError(getApiErrorMessage(reason, t('autocare.ownerProviderOnboardingCancelError')))
        }
    }

    if (query.isLoading) return <StateCard variant="loading" title={t('autocare.ownerProviderOnboardingLoading')} />
    if (query.error) return <StateCard variant="error" title={t('autocare.ownerProviderOnboardingLoadError')} description={getApiErrorMessage(query.error, '')} action={<RetryButton onRetry={query.refetch} label={t('common.retry')} />} />

    const allOffers = provider.locations?.flatMap((branch) => branch.offers) ?? provider.offers ?? []
    const checks = [
        { done: Boolean(provider.description && provider.phone && provider.location.address), label: t('autocare.ownerProviderOnboardingProfileCheck') },
        { done: Boolean(provider.coverImageUrl || provider.galleryImageUrls.length), label: t('autocare.ownerProviderOnboardingPhotosCheck') },
        { done: allOffers.length > 0, label: t('autocare.ownerProviderOnboardingCatalogCheck') },
        { done: provider.verified, label: t('autocare.ownerProviderOnboardingVerificationCheck') },
    ]
    return <section className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-primary/10 text-primary"><BadgeCheck className="size-5" /></span><div><h2 className="text-base font-black text-foreground">{t('autocare.ownerProviderOnboardingTitle')}</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">{t('autocare.ownerProviderOnboardingDescription')}</p></div></div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">{checks.map((check) => <div key={check.label} className="flex items-center gap-2 rounded-[var(--radius-card)] bg-secondary px-3 py-2 text-sm font-semibold text-foreground"><ShieldCheck className={`size-4 ${check.done ? 'text-status-success-foreground' : 'text-muted-foreground'}`} />{check.label}</div>)}</div>
        {!provider.verified && <button type="button" disabled={createState.isLoading || verificationPending} onClick={() => void requestVerification()} className="mt-5 inline-flex h-10 items-center gap-2 rounded-[var(--radius-control)] bg-primary px-4 text-xs font-black text-primary-foreground disabled:opacity-50"><BadgeCheck className="size-4" />{verificationPending ? t('autocare.ownerProviderOnboardingVerificationPending') : t('autocare.ownerProviderOnboardingSubmitVerification')}</button>}
        <OwnerProviderProfileChangeForm provider={provider} disabled={createState.isLoading || profilePending} onSubmit={submitProfileUpdate} />
        {createState.error && <p role="alert" className="mt-3 text-xs font-bold text-destructive">{getApiErrorMessage(createState.error, t('autocare.ownerProviderOnboardingSubmitError'))}</p>}
        {cancelError && <p role="alert" className="mt-3 text-xs font-bold text-destructive">{cancelError}</p>}
        <div className="mt-5 space-y-2">{query.data?.map((request) => <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-border p-3"><div><p className="text-sm font-bold text-foreground">{request.kind === 'verification' ? t('autocare.ownerProviderOnboardingVerificationRequest') : t('autocare.ownerProviderOnboardingProfileRequest')}</p><p className="mt-1 text-xs text-muted-foreground">{formatDateTime(request.createdAt, locale, { dateStyle: 'medium' })}{request.reviewReason ? ` · ${request.reviewReason}` : ''}</p></div><div className="flex items-center gap-2"><span className="rounded-full bg-secondary px-2 py-1 text-[11px] font-black text-foreground">{t(statusLabelKey[request.status])}</span>{request.status === 'pending' && <button type="button" disabled={cancelState.isLoading} onClick={() => void cancel(request.id)} className="text-xs font-black text-destructive hover:underline disabled:opacity-50">{cancelState.isLoading ? t('autocare.ownerProviderOnboardingCancelLoading') : t('autocare.ownerProviderOnboardingCancel')}</button>}</div></div>)}</div>
    </section>
}
