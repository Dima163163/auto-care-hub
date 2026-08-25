import { useMemo, useState } from 'react'
import { MessageSquareQuote, Send } from 'lucide-react'

import { useCreateAutoCareBroadcastOfferMutation, useGetOwnerAutoCareBroadcastRequestsQuery, useGetOwnerAutoCareProvidersQuery } from '@/entities/automotive-service'
import { useTranslation } from '@/shared/lib/useTranslation'

export function OwnerBroadcastRequestsPanel() {
    const { locale } = useTranslation()
    const { data: requests = [] } = useGetOwnerAutoCareBroadcastRequestsQuery()
    const { data: providers = [] } = useGetOwnerAutoCareProvidersQuery()
    const [createOffer, offerState] = useCreateAutoCareBroadcastOfferMutation()
    const [amount, setAmount] = useState('')
    const [activeId, setActiveId] = useState<string | null>(null)
    const copy = locale === 'ru'
        ? { title: 'Запросы от клиентов', text: 'Отвечайте на один запрос вместе с другими подходящими сервисами.', empty: 'Подходящих открытых запросов пока нет.', amount: 'Цена предложения, ₽', send: 'Отправить предложение', sent: 'Предложение отправлено' }
        : { title: 'Customer requests', text: 'Respond to an open request alongside other matching providers.', empty: 'No matching open requests yet.', amount: 'Offer price', send: 'Send offer', sent: 'Offer sent' }
    const providerByService = useMemo(() => new Map(providers.flatMap((provider) => (provider.offers ?? []).map((offer) => [offer.serviceDefinitionId, provider] as const))), [providers])
    const submit = async (requestId: string, serviceDefinitionId: string) => {
        const provider = providerByService.get(serviceDefinitionId) ?? providers[0]
        const value = Math.round(Number(amount) * 100)
        if (!provider || !Number.isFinite(value) || value <= 0) return
        const currencyCode = provider.offers?.find((offer) => offer.serviceDefinitionId === serviceDefinitionId)?.currencyCode ?? provider.offers?.[0]?.currencyCode ?? 'RUB'
        await createOffer({ broadcastId: requestId, locationId: provider.location.id, amountMinor: value, currencyCode }).unwrap()
        setAmount('')
        setActiveId(null)
    }
    return <section className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm"><div className="flex items-start gap-3"><span className="flex size-10 items-center justify-center rounded-[var(--radius-control)] bg-primary/10 text-primary"><MessageSquareQuote className="size-5" /></span><div><h2 className="text-lg font-black text-foreground">{copy.title}</h2><p className="mt-1 text-sm text-muted-foreground">{copy.text}</p></div></div>{requests.length === 0 ? <p className="mt-4 rounded-[var(--radius-control)] bg-background p-3 text-xs font-semibold text-muted-foreground">{copy.empty}</p> : <div className="mt-4 space-y-3">{requests.slice(0, 4).map((request) => <article key={request.id} className="rounded-[var(--radius-card)] border border-border bg-background p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-black text-foreground">{request.serviceSlug}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{request.issueDescription}</p></div><span className="rounded-full bg-status-success-surface px-2 py-1 text-[10px] font-bold text-status-success-foreground">{request.offers.length}</span></div>{activeId === request.id ? <div className="mt-3 flex gap-2"><input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" placeholder={copy.amount} className="h-9 min-w-0 flex-1 rounded-[var(--radius-control)] border border-border bg-card px-3 text-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/40" /><button type="button" disabled={offerState.isLoading} onClick={() => void submit(request.id, request.serviceDefinitionId)} className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-control)] bg-primary px-3 text-xs font-black text-primary-foreground disabled:opacity-50"><Send className="size-3.5" />{copy.send}</button></div> : <button type="button" onClick={() => setActiveId(request.id)} className="mt-3 text-xs font-black text-primary">{copy.send}</button>}</article>)}</div>}{offerState.isSuccess ? <p className="mt-3 text-xs font-bold text-status-success-foreground">{copy.sent}</p> : null}</section>
}
