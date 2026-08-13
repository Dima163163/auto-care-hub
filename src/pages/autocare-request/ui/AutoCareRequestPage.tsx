import { useMemo, useState } from 'react'
import { ArrowLeft, CheckCircle2, MessageCircle } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router'

import { mapAutoCareProviderProfile, useCreateAutoCareServiceMessageMutation, useGetAutoCareServiceConversationQuery, useCreateAutoCareServiceAttachmentMutation, useCreateAutoCareServiceRequestMutation, useGetAutoCareProviderProfileQuery } from '@/entities/automotive-service'
import { routePaths } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'

import { RequestForm, type RequestFormPayload } from './RequestForm'
import { RequestOrderSummary, RequestSummary } from './RequestSummary'
import { RequestSteps } from './RequestSteps'

export function AutoCareRequestPage() {
    const { id = '' } = useParams()
    const [searchParams] = useSearchParams()
    const { t } = useTranslation()
    const [submittedRequestId, setSubmittedRequestId] = useState<string | null>(null)
    const { data, isLoading, isError } = useGetAutoCareProviderProfileQuery(id, { skip: !id })
    const [createRequest, { isLoading: isSubmitting, error: submitError }] = useCreateAutoCareServiceRequestMutation()
    const provider = data ? mapAutoCareProviderProfile(data) : undefined
    const offering = useMemo(
        () => provider?.offerings.find((item) => item.serviceId === searchParams.get('service')) ?? provider?.offerings[0],
        [provider, searchParams],
    )

    if (isLoading) return <main className="mx-auto max-w-[var(--layout-public-max)] px-[var(--layout-gutter)] py-20 text-center"><p className="text-sm font-semibold text-muted-foreground">Loading provider…</p></main>
    if (isError || !provider || !offering || !data) {
        return <main className="mx-auto max-w-[var(--layout-public-max)] px-[var(--layout-gutter)] py-20 text-center"><h1 className="text-2xl font-black text-foreground">{t('autocare.providerNotFound')}</h1></main>
    }

    const handleSubmit = async (payload: RequestFormPayload) => {
        const result = await createRequest({
            providerId: data.id,
            locationId: data.location.id,
            offeringId: offering.id,
            preferredAt: payload.preferredAt,
            vehicleSnapshot: payload.vehicleSnapshot,
            contactSnapshot: payload.contactSnapshot,
            note: payload.note,
        }).unwrap()
        setSubmittedRequestId(result.id)
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
                    <div>{submittedRequestId ? <RequestFollowUp providerId={provider.id} requestId={submittedRequestId} /> : <RequestForm onSubmit={handleSubmit} isSubmitting={isSubmitting} errorMessage={submitError ? 'Не удалось отправить заявку. Проверьте авторизацию и данные формы.' : undefined} />}</div>
                    <RequestOrderSummary provider={provider} offering={offering} />
                </div>
            </div>
        </main>
    )
}

function RequestFollowUp({ providerId, requestId }: { providerId: string; requestId: string }) {
    const { t } = useTranslation()
    const { data } = useGetAutoCareServiceConversationQuery(requestId)
    const [sendMessage, { isLoading: isSending }] = useCreateAutoCareServiceMessageMutation()
    const [uploadAttachment] = useCreateAutoCareServiceAttachmentMutation()
    const [message, setMessage] = useState('')
    const [uploading, setUploading] = useState(false)
    const submitMessage = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!message.trim()) return
        await sendMessage({ requestId, body: message }).unwrap()
        setMessage('')
    }
    const upload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return
        setUploading(true)
        const contentBase64 = await readFileAsBase64(file)
        await uploadAttachment({ requestId, fileName: file.name, contentType: file.type as 'image/jpeg' | 'image/png' | 'image/webp', size: file.size, contentBase64 }).unwrap()
        setUploading(false)
        event.target.value = ''
    }
    return <section className="grid gap-4 rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm sm:p-6"><div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-status-success-surface text-status-success-foreground"><CheckCircle2 className="size-5" /></span><div><h2 className="text-xl font-black text-foreground">{t('autocare.requestSubmittedTitle')}</h2><p className="mt-1 text-sm font-medium leading-6 text-muted-foreground">{t('autocare.requestSubmittedDescription')}</p><Link to={routePaths.serviceProviderDetails(providerId)} className="mt-2 inline-flex text-xs font-black text-primary">{t('autocare.requestBackToProfile')}</Link></div></div><div className="border-t border-border pt-4"><div className="flex items-center gap-2 text-sm font-black text-foreground"><MessageCircle className="size-4 text-primary" />Переписка по заявке</div><div className="mt-3 grid gap-2">{data?.messages.map((item) => <p key={item.id} className="rounded-[var(--radius-control)] bg-secondary px-3 py-2 text-sm text-foreground">{item.body}</p>) ?? <p className="text-xs text-muted-foreground">Сообщений пока нет.</p>}</div><form className="mt-3 flex gap-2" onSubmit={(event) => void submitMessage(event)}><input value={message} onChange={(event) => setMessage(event.target.value)} className="h-10 min-w-0 flex-1 rounded-[var(--radius-control)] border border-border bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/40" placeholder="Напишите сервису" /><button disabled={isSending} className="inline-flex h-10 items-center rounded-[var(--radius-control)] bg-primary px-3 text-xs font-black text-primary-foreground">Отправить</button></form><label className="mt-2 inline-flex h-10 cursor-pointer items-center justify-center rounded-[var(--radius-control)] border border-dashed border-border text-xs font-bold text-muted-foreground hover:border-primary hover:text-primary">{uploading ? 'Загрузка…' : 'Добавить фото повреждения'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void upload(event)} className="sr-only" /></label></div></section>
}

function readFileAsBase64(file: File) {
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(file)
    })
}
