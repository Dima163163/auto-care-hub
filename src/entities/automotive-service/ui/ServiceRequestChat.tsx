import { Check, CheckCheck, Clock3, MessageCircle, Paperclip, Percent, Send, Sparkles, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'

import {
    useCreateAutoCareServiceAttachmentMutation,
    useCreateAutoCareServiceMessageMutation,
    useCreateAutoCareServiceOfferMutation,
    useDecideAutoCareServiceOfferMutation,
    useGetAutoCareServiceConversationQuery,
    useMarkAutoCareServiceConversationReadMutation,
    type AutoCareServiceMessage,
} from '@/entities/automotive-service'
import { useGetMeQuery } from '@/features/auth'
import { API_BASE_URL } from '@/shared/config/api'
import { connectServiceChat } from '@/entities/automotive-service/lib/service-chat'
import { useTranslation } from '@/shared/lib/useTranslation'

type ServiceRequestChatProps = { requestId: string; ownerMode?: boolean }

export function ServiceRequestChat({ requestId, ownerMode = false }: ServiceRequestChatProps) {
    const { locale, t } = useTranslation()
    const viewer = useGetMeQuery()
    const canUseChat = Boolean(viewer.data)
    const conversation = useGetAutoCareServiceConversationQuery(requestId, { pollingInterval: 15_000, skip: !canUseChat })
    const { refetch } = conversation
    const [markRead] = useMarkAutoCareServiceConversationReadMutation()
    const [sendMessage, sendState] = useCreateAutoCareServiceMessageMutation()
    const [createOffer, offerState] = useCreateAutoCareServiceOfferMutation()
    const [decideOffer, decideState] = useDecideAutoCareServiceOfferMutation()
    const [uploadAttachment, uploadState] = useCreateAutoCareServiceAttachmentMutation()
    const [message, setMessage] = useState('')
    const [showOffer, setShowOffer] = useState(false)
    const [offerType, setOfferType] = useState<'discount' | 'alternative'>('discount')
    const [offerTitle, setOfferTitle] = useState(() => t('autocare.chatOfferDefaultTitle'))
    const [offerDescription, setOfferDescription] = useState('')
    const [discountPercent, setDiscountPercent] = useState('10')
    const [couponCode, setCouponCode] = useState('')
    const [offerAmount, setOfferAmount] = useState('')
    const [actionError, setActionError] = useState<string | null>(null)
    const pendingMessage = useRef<{ key: string; body: string } | null>(null)

    useEffect(() => {
        if (!canUseChat) return
        void markRead(requestId)
        return connectServiceChat(requestId, () => { void refetch(); void markRead(requestId) })
    }, [canUseChat, markRead, refetch, requestId])

    const submitMessage = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!message.trim()) return
        setActionError(null)
        const body = message.trim()
        const pending = pendingMessage.current?.body === body
            ? pendingMessage.current
            : { key: crypto.randomUUID(), body }
        pendingMessage.current = pending
        try {
            await sendMessage({ requestId, body, idempotencyKey: pending.key }).unwrap()
            setMessage('')
            pendingMessage.current = null
        } catch {
            setActionError(t('autocare.chatSendError'))
        }
    }

    const submitOffer = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!offerTitle.trim()) return
        setActionError(null)
        try {
            await createOffer({ requestId, type: offerType, title: offerTitle.trim(), description: offerDescription.trim() || null, discountPercent: offerType === 'discount' ? Number(discountPercent) : null, couponCode: offerType === 'discount' ? couponCode.trim().toUpperCase() || null : null, amountMinor: offerType === 'alternative' && offerAmount ? Math.round(Number(offerAmount) * 100) : null, currencyCode: offerType === 'alternative' && offerAmount ? 'RUB' : null, expiresAt: offerType === 'discount' ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : null }).unwrap()
            setShowOffer(false)
            setOfferDescription('')
        } catch {
            setActionError(t('autocare.chatSendError'))
        }
    }

    const upload = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return
        setActionError(null)
        try {
            const contentBase64 = await readFileAsBase64(file)
            await uploadAttachment({ requestId, fileName: file.name, contentType: file.type as 'image/jpeg' | 'image/png' | 'image/webp', size: file.size, contentBase64 }).unwrap()
            event.target.value = ''
        } catch {
            setActionError(t('autocare.chatUploadError'))
        }
    }

    return <section className="rounded-[var(--radius-panel)] border border-border bg-card shadow-sm"><div className="flex items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-5"><div className="flex items-center gap-2"><span className="flex size-9 items-center justify-center rounded-[var(--radius-control)] bg-primary/10 text-primary"><MessageCircle className="size-4" /></span><div><h3 className="text-sm font-black text-foreground">{t('autocare.chatTitle')}</h3><p className="text-[11px] font-semibold text-muted-foreground">{t('autocare.chatDescription')}</p></div></div><span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-status-success-foreground"><span className="size-2 rounded-full bg-status-success-foreground" />{t('autocare.chatOnline')}</span></div>{actionError && <p role="alert" className="border-b border-destructive/20 bg-destructive/5 px-4 py-2 text-xs font-bold text-destructive">{actionError}</p>}<div className="max-h-[470px] min-h-[220px] space-y-3 overflow-y-auto bg-secondary/60 p-4 sm:p-5">{conversation.isLoading ? <p className="text-xs text-muted-foreground">{t('autocare.chatLoading')}</p> : conversation.data?.messages.length ? conversation.data.messages.map((item) => <ChatMessage key={item.id} message={item} own={item.senderId === viewer.data?.id} locale={locale} ownerMode={ownerMode} onDecision={(decision) => void decideOffer({ requestId, messageId: item.id, decision })} deciding={decideState.isLoading} labels={t} />) : <p className="text-center text-xs font-semibold text-muted-foreground">{t('autocare.chatEmpty')}</p>}{conversation.data?.attachments.length ? <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{conversation.data.attachments.map((attachment) => <img key={attachment.id} src={toAttachmentUrl(attachment.url)} alt={t('autocare.chatDescription')} className="aspect-[4/3] w-full rounded-[var(--radius-control)] object-cover" loading="lazy" />)}</div> : null}</div><div className="border-t border-border p-4 sm:p-5"><form className="flex items-end gap-2" onSubmit={(event) => void submitMessage(event)}><label className="inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-control)] border border-border text-muted-foreground hover:border-primary hover:text-primary"><Paperclip className="size-4" /><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void upload(event)} className="sr-only" /></label><textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={2} placeholder={t('autocare.chatPlaceholder')} className="min-h-10 min-w-0 flex-1 resize-none rounded-[var(--radius-control)] border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/40" /><button type="submit" disabled={sendState.isLoading || !message.trim()} aria-label={t('autocare.chatSend')} className="inline-flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-primary text-primary-foreground disabled:opacity-50"><Send className="size-4" /></button></form><div className="mt-3 flex flex-wrap items-center justify-between gap-2"><span className="text-[11px] text-muted-foreground">{uploadState.isLoading ? t('autocare.chatUploading') : t('autocare.chatAttachmentHint')}</span>{ownerMode && <button type="button" onClick={() => setShowOffer((value) => !value)} className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-control)] border border-primary/30 px-3 text-xs font-black text-primary hover:bg-primary/5"><Sparkles className="size-3.5" />{t('autocare.chatOfferButton')}</button>}</div>{showOffer && ownerMode && <form className="mt-4 grid gap-3 rounded-[var(--radius-card)] border border-primary/20 bg-primary/5 p-4" onSubmit={(event) => void submitOffer(event)}><div className="flex items-center justify-between"><p className="text-xs font-black text-foreground">{t('autocare.chatOfferTitle')}</p><button type="button" onClick={() => setShowOffer(false)} aria-label={t('common.close')} className="text-muted-foreground hover:text-foreground"><X className="size-4" /></button></div><div className="grid gap-2 sm:grid-cols-2"><label className="grid gap-1 text-xs font-bold">{t('autocare.chatOfferType')}<select value={offerType} onChange={(event) => setOfferType(event.target.value as 'discount' | 'alternative')} className="h-9 rounded-[var(--radius-control)] border border-border bg-background px-2 text-xs"><option value="discount">{t('autocare.chatOfferDiscount')}</option><option value="alternative">{t('autocare.chatOfferAlternative')}</option></select></label><label className="grid gap-1 text-xs font-bold">{t('autocare.chatOfferTitleLabel')}<input value={offerTitle} onChange={(event) => setOfferTitle(event.target.value)} className="h-9 rounded-[var(--radius-control)] border border-border bg-background px-2 text-xs" /></label></div>{offerType === 'discount' ? <div className="grid gap-2 sm:grid-cols-2"><label className="grid gap-1 text-xs font-bold">{t('autocare.chatOfferDiscountLabel')}<span className="relative"><Percent className="pointer-events-none absolute left-2 top-2.5 size-3 text-muted-foreground" /><input type="number" min="1" max="100" value={discountPercent} onChange={(event) => setDiscountPercent(event.target.value)} className="h-9 w-full rounded-[var(--radius-control)] border border-border bg-background pl-7 pr-2 text-xs" /></span></label><label className="grid gap-1 text-xs font-bold">{t('autocare.chatOfferCouponLabel')}<input value={couponCode} onChange={(event) => setCouponCode(event.target.value.toUpperCase())} maxLength={32} placeholder="AC-..." className="h-9 rounded-[var(--radius-control)] border border-border bg-background px-2 text-xs uppercase" /></label></div> : <label className="grid gap-1 text-xs font-bold">{t('autocare.chatOfferAmountLabel')}<input inputMode="decimal" value={offerAmount} onChange={(event) => setOfferAmount(event.target.value)} className="h-9 rounded-[var(--radius-control)] border border-border bg-background px-2 text-xs" /></label>}<label className="grid gap-1 text-xs font-bold">{t('autocare.chatOfferDescriptionLabel')}<textarea rows={2} value={offerDescription} onChange={(event) => setOfferDescription(event.target.value)} placeholder={t('autocare.chatOfferDescriptionPlaceholder')} className="rounded-[var(--radius-control)] border border-border bg-background p-2 text-xs" /></label><button type="submit" disabled={offerState.isLoading} className="inline-flex h-9 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-primary px-3 text-xs font-black text-primary-foreground disabled:opacity-60"><Sparkles className="size-3.5" />{offerState.isLoading ? t('autocare.chatOfferSending') : t('autocare.chatOfferSend')}</button></form>}</div></section>
}

function ChatMessage({ message, own, locale, ownerMode, onDecision, deciding, labels }: { message: AutoCareServiceMessage; own: boolean; locale: string; ownerMode: boolean; onDecision: (decision: 'accept' | 'decline') => void; deciding: boolean; labels: (key: 'autocare.chatOfferPending' | 'autocare.chatOfferAccepted' | 'autocare.chatOfferDeclined' | 'autocare.chatOfferAccept' | 'autocare.chatOfferDecline') => string }) {
    const timeLabel = formatChatDate(message.createdAt, locale)
    return <div className={`flex ${own ? 'justify-end' : 'justify-start'}`}><article className={`max-w-[min(92%,520px)] rounded-[var(--radius-card)] border px-3 py-2.5 shadow-sm ${own ? 'border-primary/20 bg-primary text-primary-foreground' : 'border-border bg-card text-foreground'}`}><p className={`mb-1 flex items-center gap-1 text-[10px] font-bold ${own ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{timeLabel}{own && (message.readAt ? <CheckCheck className="size-3.5" /> : message.deliveredAt ? <Check className="size-3.5" /> : <Clock3 className="size-3" />)}</p>{message.body && message.kind !== 'offer' && <p className="whitespace-pre-wrap text-sm leading-6">{message.body}</p>}{message.offer && <OfferCard offer={message.offer} ownerMode={ownerMode} onDecision={onDecision} deciding={deciding} labels={labels} />}</article></div>
}

function OfferCard({ offer, ownerMode, onDecision, deciding, labels }: { offer: NonNullable<AutoCareServiceMessage['offer']>; ownerMode: boolean; onDecision: (decision: 'accept' | 'decline') => void; deciding: boolean; labels: (key: 'autocare.chatOfferPending' | 'autocare.chatOfferAccepted' | 'autocare.chatOfferDeclined' | 'autocare.chatOfferAccept' | 'autocare.chatOfferDecline') => string }) {
    const statusLabel = offer.status === 'pending' ? labels('autocare.chatOfferPending') : offer.status === 'accepted' ? labels('autocare.chatOfferAccepted') : labels('autocare.chatOfferDeclined')
    return <div className="mt-1 rounded-[var(--radius-control)] border border-primary/20 bg-primary/5 p-3"><div className="flex items-center gap-2 text-sm font-black"><Sparkles className="size-4 text-primary" />{offer.title}</div>{offer.description && <p className="mt-1 text-xs leading-5 text-muted-foreground">{offer.description}</p>}{offer.discountPercent && <p className="mt-2 text-lg font-black text-primary">−{offer.discountPercent}%</p>}{offer.amountMinor !== null && offer.currencyCode && <p className="mt-2 text-lg font-black text-foreground">{new Intl.NumberFormat(undefined, { style: 'currency', currency: offer.currencyCode, maximumFractionDigits: 0 }).format(offer.amountMinor / 100)}</p>}{offer.couponCode && <p className="mt-2 rounded bg-background px-2 py-1 text-center text-xs font-black tracking-widest text-primary">{offer.couponCode}</p>}<p className="mt-2 text-[10px] font-bold text-muted-foreground">{statusLabel}</p>{!ownerMode && offer.status === 'pending' && <div className="mt-3 flex gap-2"><button type="button" disabled={deciding} onClick={() => onDecision('accept')} className="h-8 flex-1 rounded-[var(--radius-control)] bg-primary px-2 text-[11px] font-black text-primary-foreground">{labels('autocare.chatOfferAccept')}</button><button type="button" disabled={deciding} onClick={() => onDecision('decline')} className="h-8 flex-1 rounded-[var(--radius-control)] border border-border px-2 text-[11px] font-black text-foreground">{labels('autocare.chatOfferDecline')}</button></div>}</div>
}

function formatChatDate(value: string, locale: string) {
    const date = new Date(value)
    const now = new Date()
    const day = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const time = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(date)
    if (day === today) return locale === 'ru' ? `Сегодня, ${time}` : `Today, ${time}`
    if (day === today - 86_400_000) return locale === 'ru' ? `Вчера, ${time}` : `Yesterday, ${time}`
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function toAttachmentUrl(path: string) {
    if (path.startsWith('http')) return path
    return `${API_BASE_URL}${path}`
}

function readFileAsBase64(file: File) {
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(file)
    })
}
