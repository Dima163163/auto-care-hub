import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router'

import { mapAutoCareProviderProfile, ServiceRequestChat, useAcceptAutoCareServiceQuoteMutation, useCreateAutoCareServiceAttachmentMutation, useCreateAutoCareServiceRequestMutation, useDeclineAutoCareServiceQuoteMutation, useGetAutoCareProviderProfileQuery, useGetAutoCareRepairTimelineQuery, useGetAutoCareServiceConversationQuery, useGetMyAutoCareFleetsQuery } from '@/entities/automotive-service'
import { ROUTES, routePaths } from '@/shared/constants/routes'
import { useGetMeQuery } from '@/features/auth'
import { useGetMyVehiclesQuery } from '@/entities/user'
import { useTranslation } from '@/shared/lib/useTranslation'
import { formatCurrency, formatDateTime } from '@/shared/lib/locale-format'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { AutoCareRequestSkeleton } from '@/shared/ui/loading-skeleton'
import { Skeleton } from '@/components/ui/skeleton'
import { getSupportedImageMimeType } from '@/shared/lib/media-upload'

import { RequestForm, type RequestFormPayload } from './RequestForm'
import { RequestOrderSummary, RequestSummary } from './RequestSummary'
import { RequestSteps } from './RequestSteps'
import { GuaranteeClaimCard } from './GuaranteeClaimCard'
import { toRequestVehicleSnapshot } from './request-vehicle-snapshot'

export function AutoCareRequestPage() {
    const { id = '' } = useParams()
    const [searchParams] = useSearchParams()
    const { t } = useTranslation()
    const navigate = useNavigate()
    const location = useLocation()
    const { data: user, isLoading: isUserLoading } = useGetMeQuery()
    const requestedVehicleId = searchParams.get('vehicleId')
    const { data: fleets, isFetching: isFleetsFetching } = useGetMyAutoCareFleetsQuery(undefined, { skip: user?.role !== 'client' || !requestedVehicleId })
    const { data: savedVehicles, isFetching: isVehiclesFetching } = useGetMyVehiclesQuery(undefined, { skip: user?.role !== 'client' || !requestedVehicleId })
    const [submittedRequestId, setSubmittedRequestId] = useState<string | null>(null)
    const [attachmentUploadErrorCount, setAttachmentUploadErrorCount] = useState(0)
    const { data, isLoading, isError } = useGetAutoCareProviderProfileQuery(id, { skip: !id })
    const [createRequest, { isLoading: isSubmitting, error: submitError }] = useCreateAutoCareServiceRequestMutation()
    const [createAttachment] = useCreateAutoCareServiceAttachmentMutation()
    const provider = data ? mapAutoCareProviderProfile(data) : undefined
    const offering = useMemo(
        () => provider?.offerings.find((item) => item.serviceId === searchParams.get('service')) ?? provider?.offerings[0],
        [provider, searchParams],
    )
    const selectedVehicle = fleets?.flatMap((fleet) => fleet.vehicles).find((vehicle) => vehicle.id === requestedVehicleId)
    const selectedSavedVehicle = savedVehicles?.find((vehicle) => vehicle.id === requestedVehicleId)
    const initialVehicle = toRequestVehicleSnapshot(selectedSavedVehicle ?? selectedVehicle?.vehicleSnapshot)
    const requestContextKey = [user?.id ?? 'anonymous', data?.id ?? id, data?.location.id ?? '', offering?.id ?? '', requestedVehicleId ?? 'none'].join(':')
    const requestOperationRef = useRef<{ contextKey: string; idempotencyKey: string | null; inFlight: boolean }>({ contextKey: requestContextKey, idempotencyKey: null, inFlight: false })
    const latestContextKeyRef = useRef(requestContextKey)
    useEffect(() => {
        latestContextKeyRef.current = requestContextKey
        requestOperationRef.current = { contextKey: requestContextKey, idempotencyKey: null, inFlight: false }
    }, [requestContextKey])

    if (isLoading) return <main className="min-h-full bg-background"><AutoCareRequestSkeleton label={t('common.loading')} /></main>
    if (isError || !provider || !offering || !data) {
        return <main className="mx-auto max-w-[var(--layout-public-max)] px-[var(--layout-gutter)] py-20 text-center"><h1 className="text-2xl font-black text-foreground">{t('autocare.providerNotFound')}</h1></main>
    }

    if (requestedVehicleId && !isUserLoading && user?.role === 'client' && !isFleetsFetching && !isVehiclesFetching && !selectedSavedVehicle && !selectedVehicle) {
        return <main className="mx-auto max-w-[var(--layout-public-max)] px-[var(--layout-gutter)] py-20"><section className="mx-auto max-w-xl rounded-[var(--radius-panel)] border border-border bg-card p-6 text-center shadow-sm"><h1 className="text-2xl font-black text-foreground">{t('autocare.vehicleUnavailableTitle')}</h1><p className="mt-2 text-sm font-medium leading-6 text-muted-foreground">{t('autocare.vehicleUnavailableDescription')}</p><Link to={ROUTES.profileVehicles} className="mt-5 inline-flex h-10 items-center rounded-[var(--radius-control)] bg-primary px-4 text-sm font-black text-primary-foreground">{t('autocare.vehicleUnavailableBack')}</Link></section></main>
    }

    const handleSubmit = async (payload: RequestFormPayload) => {
        if (!user?.emailVerifiedAt) {
            navigate('/verify-email', { state: { from: location } })
            return false
        }
        const operation = requestOperationRef.current
        if (operation.contextKey !== requestContextKey || latestContextKeyRef.current !== requestContextKey || operation.inFlight) return false
        operation.inFlight = true
        const requestKey = operation.idempotencyKey ?? crypto.randomUUID()
        operation.idempotencyKey = requestKey
        try {
            const result = await createRequest({
                providerId: data.id,
                locationId: data.location.id,
                offeringId: offering.id,
                preferredAt: payload.preferredAt,
                vehicleId: payload.vehicleId,
                vehicleSnapshot: payload.vehicleSnapshot,
                contactSnapshot: payload.contactSnapshot,
                note: payload.note,
                idempotencyKey: requestKey,
            }).unwrap()
            if (latestContextKeyRef.current !== requestContextKey) return false
            setSubmittedRequestId(result.id)
            operation.idempotencyKey = null
            const uploadResults = await Promise.allSettled(payload.files.map(async (file) => {
                if (latestContextKeyRef.current !== requestContextKey) throw new Error('Request context changed.')
                const contentType = getSupportedImageMimeType(file)
                if (!contentType) {
                    throw new Error(t('autocare.requestUnsupportedImage', { name: file.name }))
                }

                const contentBase64 = await readFileAsBase64(file)
                if (latestContextKeyRef.current !== requestContextKey) throw new Error('Request context changed.')
                return createAttachment({
                    requestId: result.id,
                    fileName: file.name,
                    contentType,
                    size: file.size,
                    contentBase64,
                }).unwrap()
            }))
            if (latestContextKeyRef.current !== requestContextKey) return false
            setAttachmentUploadErrorCount(uploadResults.filter((item) => item.status === 'rejected').length)
            return true
        } catch {
            // RTK Query exposes the mutation error to the form; retain the key for a safe retry.
            return false
        } finally {
            if (latestContextKeyRef.current === requestContextKey) operation.inFlight = false
        }
    }

    return (
        <main className="min-h-full bg-background">
            <section className="bg-hero-overlay pb-7 pt-5 text-primary-foreground sm:pb-9">
                <div className="mx-auto max-w-[var(--layout-operational-max)] px-[var(--layout-gutter)]">
                    <Link to={routePaths.serviceProviderDetails(provider.id)} className="inline-flex items-center gap-2 text-xs font-bold text-primary-foreground/70 hover:text-primary-foreground"><ArrowLeft className="size-3.5" />{t('autocare.providerBackToResults')}</Link>
                    <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">{t('autocare.requestTitle')}</h1>
                    <p className="mt-2 text-sm font-medium text-primary-foreground/70">{t('autocare.requestProviderConfirmation')}</p>
                    <div className="mt-6"><RequestSteps submitted={Boolean(submittedRequestId)} /></div>
                </div>
            </section>
            <div className="mx-auto max-w-[var(--layout-operational-max)] px-[var(--layout-gutter)] py-6 sm:py-8">
                <RequestSummary provider={provider} offering={offering} />
                <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                    <div>{submittedRequestId ? <><RequestFollowUp providerId={provider.id} requestId={submittedRequestId} />{attachmentUploadErrorCount > 0 ? <p role="status" className="mt-3 rounded-[var(--radius-card)] border border-status-warning-border bg-status-warning-surface px-4 py-3 text-xs font-bold text-status-warning-foreground">{t('autocare.chatUploadError')} ({attachmentUploadErrorCount})</p> : null}</> : requestedVehicleId && (isFleetsFetching || isVehiclesFetching) ? <div role="status" aria-label={t('common.loading')} className="rounded-[var(--radius-panel)] border border-border bg-card p-6"><Skeleton className="h-6 w-48" /><Skeleton className="mt-5 h-12 w-full" /><Skeleton className="mt-4 h-24 w-full" /><Skeleton className="mt-4 h-11 w-40 rounded-[var(--radius-control)]" /></div> : <RequestForm key={`${requestContextKey}:${location.search}`} draftKey={user?.id && data ? `autocare-request:${requestContextKey}` : null} providerId={data.id} locationId={data.location.id} offeringId={offering.id} serviceTimezone={data.location.timezone} initialVehicle={initialVehicle} initialVehicleId={selectedSavedVehicle?.id ?? null} initialContact={{ name: user?.name ?? '', email: user?.email ?? '', phone: user?.phone ?? '' }} onSubmit={handleSubmit} isSubmitting={isSubmitting} errorMessage={submitError ? t('autocare.requestSubmitError') : undefined} />}</div>
                    <RequestOrderSummary provider={provider} offering={offering} />
                </div>
            </div>
        </main>
    )
}

function readFileAsBase64(file: File) {
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(file)
    })
}

export function RequestFollowUp({ providerId, requestId }: { providerId: string; requestId: string }) {
    const { t, locale } = useTranslation()
    const { data } = useGetAutoCareServiceConversationQuery(requestId)
    const { data: timeline = [] } = useGetAutoCareRepairTimelineQuery(requestId)
    const [acceptQuote, { isLoading: isAcceptingQuote }] = useAcceptAutoCareServiceQuoteMutation()
    const [declineQuote, { isLoading: isDecliningQuote }] = useDeclineAutoCareServiceQuoteMutation()
    const [quoteError, setQuoteError] = useState<string | null>(null)
    const quoteRevision = data?.request.quoteHistory?.at(-1)
    const handleQuoteDecision = async (decision: 'accept' | 'decline') => {
        setQuoteError(null)
        try {
            const input = { requestId, quoteId: quoteRevision?.id ?? '', quoteVersion: quoteRevision?.version ?? 0 }
            await (decision === 'accept' ? acceptQuote(input) : declineQuote(input)).unwrap()
        } catch (error) {
            setQuoteError(getApiErrorMessage(error, t('autocare.clientServiceRequestsQuoteError')))
        }
    }
    return <section className="grid gap-4 rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm sm:p-6"><div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-status-success-surface text-status-success-foreground"><CheckCircle2 className="size-5" /></span><div><h2 className="text-xl font-black text-foreground">{t('autocare.requestSubmittedTitle')}</h2><p className="mt-1 text-sm font-medium leading-6 text-muted-foreground">{t('autocare.requestSubmittedDescription')}</p><Link to={routePaths.serviceProviderDetails(providerId)} className="mt-2 inline-flex text-xs font-black text-primary">{t('autocare.requestBackToProfile')}</Link></div></div>{data?.request.quote && (data.request.status === 'estimate_shared' || data.request.quote.status === 'expired') ? <div className="rounded-[var(--radius-card)] border border-primary/30 bg-primary/5 p-4"><p className="text-xs font-black uppercase tracking-wide text-primary">{t('autocare.clientServiceRequestsQuote')}</p><p className="mt-2 text-2xl font-black text-foreground">{formatCurrency(data.request.quote.amountMinor / 100, data.request.quote.currencyCode, locale)}</p>{data.request.quote.lineItems?.length ? <div className="mt-3 space-y-1 border-t border-primary/15 pt-3 text-xs text-muted-foreground">{data.request.quote.lineItems.map((item) => <div key={`${item.title}-${item.kind}`} className="flex justify-between gap-3"><span>{item.title} × {item.quantity}</span><span className="font-bold text-foreground">{formatCurrency(item.totalMinor / 100, data.request.quote?.currencyCode ?? 'RUB', locale)}</span></div>)}</div> : null}{data.request.quote.note && <p className="mt-1 text-sm text-muted-foreground">{data.request.quote.note}</p>}{(data.request.quote.status ?? 'pending') === 'pending' ? <div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={isAcceptingQuote || isDecliningQuote} onClick={() => void handleQuoteDecision('accept')} className="h-9 rounded-[var(--radius-control)] bg-primary px-3 text-xs font-black text-primary-foreground">{t('autocare.clientServiceRequestsAcceptQuote')}</button><button type="button" disabled={isAcceptingQuote || isDecliningQuote} onClick={() => void handleQuoteDecision('decline')} className="h-9 rounded-[var(--radius-control)] border border-border px-3 text-xs font-bold text-foreground">{t('autocare.clientServiceRequestsDeclineQuote')}</button>{quoteError ? <p role="alert" className="basis-full text-xs font-semibold text-destructive">{quoteError}</p> : null}</div> : data.request.quote.status === 'expired' ? <p className="mt-3 text-xs font-semibold text-destructive">{t('autocare.clientServiceRequestsQuoteExpired')}</p> : null}</div> : null}{timeline.length ? <div className="rounded-[var(--radius-card)] border border-border bg-background p-4"><h3 className="text-sm font-black text-foreground">{t('autocare.requestRepairHistory')}</h3><ol className="mt-3 space-y-3">{timeline.map((event) => <li key={event.id} className="flex gap-3 text-xs"><span className="mt-1 size-2 shrink-0 rounded-full bg-primary" /><div><p className="font-bold text-foreground">{event.title}</p><p className="mt-0.5 text-muted-foreground">{formatDateTime(event.createdAt, locale, { dateStyle: 'medium', timeStyle: 'short' })}{event.notes ? ` · ${event.notes}` : ''}</p></div></li>)}</ol></div> : null}<GuaranteeClaimCard requestId={requestId} /><ServiceRequestChat requestId={requestId} /></section>
}
