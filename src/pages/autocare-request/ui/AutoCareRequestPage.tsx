import { useMemo, useState } from 'react'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router'

import { mapAutoCareProviderProfile, ServiceRequestChat, useAcceptAutoCareServiceQuoteMutation, useCreateAutoCareServiceAttachmentMutation, useCreateAutoCareServiceRequestMutation, useDeclineAutoCareServiceQuoteMutation, useGetAutoCareProviderProfileQuery, useGetAutoCareRepairTimelineQuery, useGetAutoCareServiceConversationQuery, useGetMyAutoCareFleetsQuery } from '@/entities/automotive-service'
import { routePaths } from '@/shared/constants/routes'
import { useGetMeQuery } from '@/features/auth'
import { useTranslation } from '@/shared/lib/useTranslation'
import { AutoCareRequestSkeleton } from '@/shared/ui/loading-skeleton'

import { RequestForm, type RequestFormPayload } from './RequestForm'
import { RequestOrderSummary, RequestSummary } from './RequestSummary'
import { RequestSteps } from './RequestSteps'
import { GuaranteeClaimCard } from './GuaranteeClaimCard'

export function AutoCareRequestPage() {
    const { id = '' } = useParams()
    const [searchParams] = useSearchParams()
    const { t } = useTranslation()
    const navigate = useNavigate()
    const location = useLocation()
    const { data: user } = useGetMeQuery()
    const requestedVehicleId = searchParams.get('vehicleId')
    const { data: fleets, isFetching: isFleetsFetching } = useGetMyAutoCareFleetsQuery(undefined, { skip: !user || !requestedVehicleId })
    const [submittedRequestId, setSubmittedRequestId] = useState<string | null>(null)
    const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null)
    const { data, isLoading, isError } = useGetAutoCareProviderProfileQuery(id, { skip: !id })
    const [createRequest, { isLoading: isSubmitting, error: submitError }] = useCreateAutoCareServiceRequestMutation()
    const [createAttachment] = useCreateAutoCareServiceAttachmentMutation()
    const provider = data ? mapAutoCareProviderProfile(data) : undefined
    const offering = useMemo(
        () => provider?.offerings.find((item) => item.serviceId === searchParams.get('service')) ?? provider?.offerings[0],
        [provider, searchParams],
    )
    const selectedVehicle = fleets?.flatMap((fleet) => fleet.vehicles).find((vehicle) => vehicle.id === requestedVehicleId)
    const initialVehicle = toRequestVehicleSnapshot(selectedVehicle?.vehicleSnapshot)

    if (isLoading) return <main className="min-h-full bg-background"><AutoCareRequestSkeleton label={t('common.loading')} /></main>
    if (isError || !provider || !offering || !data) {
        return <main className="mx-auto max-w-[var(--layout-public-max)] px-[var(--layout-gutter)] py-20 text-center"><h1 className="text-2xl font-black text-foreground">{t('autocare.providerNotFound')}</h1></main>
    }

    const handleSubmit = async (payload: RequestFormPayload) => {
        if (!user?.emailVerifiedAt) {
            navigate('/verify-email', { state: { from: location } })
            return
        }
        const requestKey = idempotencyKey ?? crypto.randomUUID()
        if (!idempotencyKey) setIdempotencyKey(requestKey)
        try {
            const result = await createRequest({
                providerId: data.id,
                locationId: data.location.id,
                offeringId: offering.id,
                preferredAt: payload.preferredAt,
                vehicleSnapshot: payload.vehicleSnapshot,
                contactSnapshot: payload.contactSnapshot,
                note: payload.note,
                idempotencyKey: requestKey,
            }).unwrap()
            await Promise.all(payload.files.map(async (file) => createAttachment({ requestId: result.id, fileName: file.name, contentType: file.type as 'image/jpeg' | 'image/png' | 'image/webp', size: file.size, contentBase64: await readFileAsBase64(file) }).unwrap()))
            setSubmittedRequestId(result.id)
            setIdempotencyKey(null)
        } catch {
            // RTK Query exposes the mutation error to the form; retain the key for a safe retry.
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
                    <div>{submittedRequestId ? <RequestFollowUp providerId={provider.id} requestId={submittedRequestId} /> : requestedVehicleId && isFleetsFetching ? <div className="rounded-[var(--radius-panel)] border border-border bg-card p-6 text-sm font-semibold text-muted-foreground">{t('common.loading')}</div> : <RequestForm providerId={data.id} locationId={data.location.id} offeringId={offering.id} initialVehicle={initialVehicle} onSubmit={handleSubmit} isSubmitting={isSubmitting} errorMessage={submitError ? 'Не удалось отправить заявку. Проверьте авторизацию и данные формы.' : undefined} />}</div>
                    <RequestOrderSummary provider={provider} offering={offering} />
                </div>
            </div>
        </main>
    )
}

function toRequestVehicleSnapshot(snapshot: Record<string, unknown> | undefined): RequestFormPayload['vehicleSnapshot'] {
    if (!snapshot) return null
    const make = String(snapshot.makeLabel ?? snapshot.make ?? snapshot.brand ?? '').trim()
    const model = String(snapshot.modelLabel ?? snapshot.model ?? '').trim()
    const year = Number(snapshot.year)
    return make && model && Number.isInteger(year) && year > 0 ? { make, model, year } : null
}

function readFileAsBase64(file: File) {
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(file)
    })
}

function RequestFollowUp({ providerId, requestId }: { providerId: string; requestId: string }) {
    const { t } = useTranslation()
    const { data } = useGetAutoCareServiceConversationQuery(requestId)
    const { data: timeline = [] } = useGetAutoCareRepairTimelineQuery(requestId)
    const [acceptQuote, { isLoading: isAcceptingQuote }] = useAcceptAutoCareServiceQuoteMutation()
    const [declineQuote, { isLoading: isDecliningQuote }] = useDeclineAutoCareServiceQuoteMutation()
    return <section className="grid gap-4 rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm sm:p-6"><div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-status-success-surface text-status-success-foreground"><CheckCircle2 className="size-5" /></span><div><h2 className="text-xl font-black text-foreground">{t('autocare.requestSubmittedTitle')}</h2><p className="mt-1 text-sm font-medium leading-6 text-muted-foreground">{t('autocare.requestSubmittedDescription')}</p><Link to={routePaths.serviceProviderDetails(providerId)} className="mt-2 inline-flex text-xs font-black text-primary">{t('autocare.requestBackToProfile')}</Link></div></div>{data?.request.quote && data.request.status === 'estimate_shared' ? <div className="rounded-[var(--radius-card)] border border-primary/30 bg-primary/5 p-4"><p className="text-xs font-black uppercase tracking-wide text-primary">{t('autocare.clientServiceRequestsQuote')}</p><p className="mt-2 text-2xl font-black text-foreground">{new Intl.NumberFormat(undefined, { style: 'currency', currency: data.request.quote.currencyCode, maximumFractionDigits: 0 }).format(data.request.quote.amountMinor / 100)}</p>{data.request.quote.lineItems?.length ? <div className="mt-3 space-y-1 border-t border-primary/15 pt-3 text-xs text-muted-foreground">{data.request.quote.lineItems.map((item) => <div key={`${item.title}-${item.kind}`} className="flex justify-between gap-3"><span>{item.title} × {item.quantity}</span><span className="font-bold text-foreground">{new Intl.NumberFormat(undefined, { style: 'currency', currency: data.request.quote?.currencyCode, maximumFractionDigits: 0 }).format(item.totalMinor / 100)}</span></div>)}</div> : null}{data.request.quote.note && <p className="mt-1 text-sm text-muted-foreground">{data.request.quote.note}</p>}<div className="mt-3 flex gap-2"><button type="button" disabled={isAcceptingQuote || isDecliningQuote} onClick={() => void acceptQuote(requestId)} className="h-9 rounded-[var(--radius-control)] bg-primary px-3 text-xs font-black text-primary-foreground">{t('autocare.clientServiceRequestsAcceptQuote')}</button><button type="button" disabled={isAcceptingQuote || isDecliningQuote} onClick={() => void declineQuote(requestId)} className="h-9 rounded-[var(--radius-control)] border border-border px-3 text-xs font-bold text-foreground">{t('autocare.clientServiceRequestsDeclineQuote')}</button></div></div> : null}{timeline.length ? <div className="rounded-[var(--radius-card)] border border-border bg-background p-4"><h3 className="text-sm font-black text-foreground">История ремонта</h3><ol className="mt-3 space-y-3">{timeline.map((event) => <li key={event.id} className="flex gap-3 text-xs"><span className="mt-1 size-2 shrink-0 rounded-full bg-primary" /><div><p className="font-bold text-foreground">{event.title}</p><p className="mt-0.5 text-muted-foreground">{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(event.createdAt))}{event.notes ? ` · ${event.notes}` : ''}</p></div></li>)}</ol></div> : null}<GuaranteeClaimCard requestId={requestId} /><ServiceRequestChat requestId={requestId} /></section>
}
