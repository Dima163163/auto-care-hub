import { Check, CheckCheck, Clock3, Copy, EyeOff, Flag, MessageCircle, MoreHorizontal, Paperclip, Percent, Send, Sparkles, Trash2, X } from 'lucide-react'
import { useEffect, useReducer, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent, KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from 'react'

import {
    useCreateAutoCareServiceAttachmentMutation,
    useCreateAutoCareServiceMessageMutation,
    useCreateAutoCareServiceOfferMutation,
    useCreateAutoCareChatReportMutation,
    useDeleteAutoCareChatMessageMutation,
    useDecideAutoCareServiceOfferMutation,
    useGetAutoCareRequestChatThreadQuery,
    useGetMyAutoCareChatReportsQuery,
    useLazyGetMyAutoCareChatReportsQuery,
    useGetAutoCareServiceConversationQuery,
    useGetAutoCareAttachmentObjectUrlQuery,
    useMarkAutoCareServiceConversationReadMutation,
    type AutoCareChatReport,
    type AutoCareServiceMessage,
} from '@/entities/automotive-service'
import { validateChatAttachment } from '@/entities/automotive-service/lib/chat-attachment'
import { validateChatOffer } from '@/entities/automotive-service/lib/chat-offer-validation'
import { useGetMeQuery } from '@/features/auth'
import { getApiErrorMessage, getApiErrorState } from '@/shared/api/getApiErrorMessage'
import { resolveQueryViewState } from '@/shared/api/query-view-state'
import { connectServiceChat } from '@/entities/automotive-service/lib/service-chat'
import { useTranslation } from '@/shared/lib/useTranslation'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/shared/lib/locale-format'
import { Dialog, DialogContent, DialogTitle } from '@/shared/ui/dialog'
import { QueryStateCard } from '@/shared/ui/query-state-card'
import { Dropdown } from '@/shared/ui/dropdown/Dropdown'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog'
import type { TranslationKey } from '@/shared/lib/i18n'

type ServiceRequestChatProps = { requestId: string; ownerMode?: boolean }

export function ServiceRequestChat({ requestId, ownerMode = false }: ServiceRequestChatProps) {
    const { locale, t } = useTranslation()
    const viewer = useGetMeQuery()
    const canUseChat = Boolean(viewer.data)
    const requestChat = useGetAutoCareRequestChatThreadQuery(requestId, { skip: !canUseChat })
    const chatId = requestChat.data?.id
    const ownReports = useGetMyAutoCareChatReportsQuery({ chatId: chatId ?? '', limit: 50 }, { skip: !chatId, pollingInterval: 30_000, refetchOnFocus: true, refetchOnReconnect: true, refetchOnMountOrArgChange: true })
    const [fetchOwnReportPage, ownReportPageState] = useLazyGetMyAutoCareChatReportsQuery()
    const [ownReportPages, setOwnReportPages] = useState<{ chatId: string | undefined; items: AutoCareChatReport[]; nextCursor: string | null; failed: boolean }>({ chatId: undefined, items: [], nextCursor: null, failed: false })
    const activeOwnReportPages = ownReportPages.chatId === chatId ? ownReportPages : { chatId, items: [], nextCursor: ownReports.data?.nextCursor ?? null, failed: false }
    const ownReportItems = [...(ownReports.data?.items ?? []), ...activeOwnReportPages.items.filter((report) => !(ownReports.data?.items ?? []).some((baseReport) => baseReport.id === report.id))]
    const hasPendingReportByViewer = ownReportItems.some((report) => report.status === 'pending')
    // WebSocket events invalidate the conversation on changes. Focus/reconnect
    // refetches provide a bounded fallback without running a second permanent
    // polling loop for every open chat.
    const [beforeCursor, setBeforeCursor] = useState<string | undefined>(undefined)
    const [messageState, dispatchMessages] = useReducer(conversationMessagesReducer, { requestId, pages: new Map<string, AutoCareServiceMessage[]>(), items: [] })
    const conversation = useGetAutoCareServiceConversationQuery({ requestId, beforeCursor, limit: 50 }, { refetchOnMountOrArgChange: true, refetchOnFocus: true, refetchOnReconnect: true, skip: !canUseChat })
    const { refetch } = conversation
    const [markRead] = useMarkAutoCareServiceConversationReadMutation()
    const [sendMessage, sendState] = useCreateAutoCareServiceMessageMutation()
    const [createOffer, offerState] = useCreateAutoCareServiceOfferMutation()
    const [decideOffer, decideState] = useDecideAutoCareServiceOfferMutation()
    const [uploadAttachment, uploadState] = useCreateAutoCareServiceAttachmentMutation()
    const [createReport, reportState] = useCreateAutoCareChatReportMutation()
    const [deleteMessage] = useDeleteAutoCareChatMessageMutation()
    const [message, setMessage] = useState('')
    const [realtimeConnected, setRealtimeConnected] = useState(false)
    const [showOffer, setShowOffer] = useState(false)
    const [offerType, setOfferType] = useState<'discount' | 'alternative'>('discount')
    const [offerTitle, setOfferTitle] = useState(() => t('autocare.chatOfferDefaultTitle'))
    const [offerDescription, setOfferDescription] = useState('')
    const [discountPercent, setDiscountPercent] = useState('10')
    const [couponCode, setCouponCode] = useState('')
    const [offerAmount, setOfferAmount] = useState('')
    const [actionError, setActionError] = useState<string | null>(null)
    const [selectedAttachment, setSelectedAttachment] = useState<{ url: string } | null>(null)
    const [reportingMessage, setReportingMessage] = useState<AutoCareServiceMessage | null>(null)
    const [reportCategory, setReportCategory] = useState<'harassment' | 'threat' | 'fraud' | 'other'>('harassment')
    const [reportDescription, setReportDescription] = useState('')
    const [reportValidationError, setReportValidationError] = useState(false)
    const [hiddenMessageState, setHiddenMessageState] = useState(() => ({ userId: viewer.data?.id, messageIds: readHiddenMessageIds(viewer.data?.id) }))
    const hiddenMessageIds = hiddenMessageState.userId === viewer.data?.id ? hiddenMessageState.messageIds : emptyHiddenMessageIds
    const [currentTime, setCurrentTime] = useState<number | null>(null)
    const pendingMessage = useRef<{ key: string; body: string } | null>(null)
    const conversationErrorState = getApiErrorState(conversation.error)
    const conversationState = resolveQueryViewState({
        isLoading: conversation.isLoading,
        isFetching: conversation.isFetching,
        isError: conversation.isError,
        hasData: Boolean(conversation.data),
        hasResults: Boolean(conversation.data),
        isOffline: conversationErrorState === 'offline',
        isPermissionDenied: conversationErrorState === 'permission-denied',
        isSuspended: conversationErrorState === 'suspended',
        isStale: conversationErrorState === 'stale',
        isSessionExpired: conversationErrorState === 'session-expired',
    })
    const moderationReviewActive = Boolean(conversation.data?.moderationReviewActive || hasPendingReportByViewer)
    const messagesProtected = Boolean(conversation.data?.messagesProtected || hasPendingReportByViewer)

    const messages = messageState.items

    const loadOlderOwnReports = async () => {
        if (!chatId || !activeOwnReportPages.nextCursor || ownReportPageState.isFetching) return
        try {
            const page = await fetchOwnReportPage({ chatId, limit: 50, cursor: activeOwnReportPages.nextCursor }, true).unwrap()
            setOwnReportPages((current) => {
                const existing = current.chatId === chatId ? current.items : []
                const knownIds = new Set([...(ownReports.data?.items ?? []).map((report) => report.id), ...existing.map((report) => report.id)])
                return { chatId, items: [...existing, ...page.items.filter((report) => !knownIds.has(report.id))], nextCursor: page.nextCursor, failed: false }
            })
        } catch {
            setOwnReportPages((current) => current.chatId === chatId
                ? { ...current, failed: true }
                : { chatId, items: [], nextCursor: activeOwnReportPages.nextCursor, failed: true })
        }
    }

    useEffect(() => {
        let active = true
        const userId = viewer.data?.id
        const timer = window.setTimeout(() => {
            if (active) setHiddenMessageState({ userId, messageIds: readHiddenMessageIds(userId) })
        }, 0)
        return () => {
            active = false
            window.clearTimeout(timer)
        }
    }, [viewer.data?.id])

    useEffect(() => {
        const updateTime = () => setCurrentTime(Date.now())
        const startTimer = window.setTimeout(updateTime, 0)
        const interval = window.setInterval(updateTime, 30_000)
        return () => {
            window.clearTimeout(startTimer)
            window.clearInterval(interval)
        }
    }, [])

    useEffect(() => {
        if (!conversation.data) return
        dispatchMessages({ requestId, pageKey: beforeCursor ?? 'latest', messages: conversation.data.messages })
    }, [beforeCursor, conversation.data, requestId])

    useEffect(() => {
        if (!canUseChat) return
        void markRead(requestId)
        return connectServiceChat(requestId, (event) => {
            if (event.type === 'presence' && typeof event.payload.connected === 'boolean') {
                setRealtimeConnected(event.payload.connected)
                return
            }
            void refetch()
            void markRead(requestId)
        })
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
        } catch (error) {
            setActionError(getApiErrorMessage(error, t('autocare.chatSendError')))
        }
    }

    const submitOffer = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setActionError(null)
        const validation = validateChatOffer({
            type: offerType,
            title: offerTitle,
            description: offerDescription,
            discountPercent,
            couponCode,
            amount: offerAmount,
        })
        if (!validation.valid) {
            setActionError(t('autocare.chatOfferValidation'))
            return
        }

        try {
            await createOffer({ requestId, type: offerType, title: validation.title, description: validation.description, discountPercent: validation.discountPercent, couponCode: validation.couponCode, amountMinor: validation.amountMinor, currencyCode: validation.currencyCode, expiresAt: offerType === 'discount' ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() : null }).unwrap()
            setShowOffer(false)
            setOfferDescription('')
        } catch (error) {
            setActionError(getApiErrorMessage(error, t('autocare.chatSendError')))
        }
    }

    const upload = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        const validation = validateChatAttachment(file)
        if (!file || !validation.valid) {
            setActionError(t('autocare.chatUploadError'))
            event.target.value = ''
            return
        }
        setActionError(null)
        try {
            const contentBase64 = await readFileAsBase64(file)
            await uploadAttachment({ requestId, fileName: file.name, contentType: validation.contentType, size: file.size, contentBase64 }).unwrap()
            event.target.value = ''
        } catch (error) {
            setActionError(getApiErrorMessage(error, t('autocare.chatUploadError')))
        } finally {
            event.target.value = ''
        }
    }

    const decide = async (messageId: string, decision: 'accept' | 'decline') => {
        setActionError(null)
        try {
            await decideOffer({ requestId, messageId, decision }).unwrap()
        } catch (error) {
            setActionError(getApiErrorMessage(error, t('autocare.chatOfferDecisionError')))
        }
    }

    const copyMessage = async (body: string) => {
        try {
            await navigator.clipboard.writeText(body)
        } catch {
            setActionError(t('autocare.chatCopyError'))
        }
    }

    const hideMessageForMe = (messageId: string) => {
        const next = new Set(hiddenMessageIds)
        next.add(messageId)
        const bounded = new Set(Array.from(next).slice(-250))
        setHiddenMessageState({ userId: viewer.data?.id, messageIds: bounded })
        writeHiddenMessageIds(viewer.data?.id, bounded)
    }

    const removeMessageForEveryone = async (messageId: string) => {
        if (!chatId) return
        setActionError(null)
        try {
            await deleteMessage({ chatId, messageId }).unwrap()
            void refetch()
        } catch (error) {
            setActionError(getApiErrorMessage(error, t('autocare.chatDeleteError')))
        }
    }

    const submitReport = async () => {
        if (!chatId || !reportingMessage) return
        if (reportCategory === 'threat' && reportDescription.trim().length < 20) {
            setReportValidationError(true)
            return
        }
        setActionError(null)
        setReportValidationError(false)
        try {
            await createReport({ chatId, messageId: reportingMessage.id, category: reportCategory, description: reportDescription.trim() || null, acknowledgeFullThreadReview: true }).unwrap()
            setReportingMessage(null)
            setReportDescription('')
        } catch (error) {
            setActionError(getApiErrorMessage(error, t('autocare.chatReportError')))
        }
    }

    const attachments = conversation.data?.attachments ?? []
    const olderMessagesCursor = conversation.data?.previousCursor ?? null
    const canUseConversation = isConversationReady(conversationState)
    return <><section className="rounded-[var(--radius-panel)] border border-border bg-card shadow-sm"><div className="flex items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-5"><div className="flex items-center gap-2"><span className="flex size-9 items-center justify-center rounded-[var(--radius-control)] bg-primary/10 text-primary"><MessageCircle className="size-4" /></span><div><h3 className="text-sm font-black text-foreground">{t('autocare.chatTitle')}</h3><p className="text-[11px] font-semibold text-muted-foreground">{t('autocare.chatDescription')}</p></div></div><span className={`inline-flex items-center gap-1.5 text-[11px] font-bold ${realtimeConnected ? 'text-status-success-foreground' : 'text-muted-foreground'}`}><span className={`size-2 rounded-full ${realtimeConnected ? 'bg-status-success-foreground' : 'bg-muted-foreground'}`} />{realtimeConnected ? t('autocare.chatOnline') : t('autocare.chatReconnecting')}</span></div>{actionError && <p role="alert" className="border-b border-destructive/20 bg-destructive/5 px-4 py-2 text-xs font-bold text-destructive">{actionError}</p>}{moderationReviewActive ? <p role="status" className="border-b border-border bg-status-warning-surface px-4 py-2 text-xs font-semibold text-status-warning-foreground">{t('autocare.chatReportPendingActionsNotice')}</p> : messagesProtected ? <p role="status" className="border-b border-border bg-status-warning-surface px-4 py-2 text-xs font-semibold text-status-warning-foreground">{t('autocare.chatEvidencePreservedNotice')}</p> : null}<div className="max-h-[470px] min-h-[220px] space-y-3 overflow-y-auto bg-secondary/60 p-4 sm:p-5" aria-busy={conversationState === 'loading'}>{conversationState === 'loading' ? <div role="status" aria-label={t('autocare.chatLoading')} className="space-y-3"><Skeleton className="h-14 w-3/4 rounded-[var(--radius-card)]" /><Skeleton className="ml-auto h-16 w-2/3 rounded-[var(--radius-card)]" /><Skeleton className="h-12 w-1/2 rounded-[var(--radius-card)]" /></div> : null}{canUseConversation && olderMessagesCursor ? <button type="button" onClick={() => setBeforeCursor(olderMessagesCursor)} disabled={conversation.isFetching} className="mx-auto flex h-8 items-center rounded-[var(--radius-control)] border border-border bg-card px-3 text-xs font-black text-primary disabled:opacity-60">{conversation.isFetching ? t('autocare.chatLoading') : t('autocare.chatLoadOlder')}</button> : null}{!canUseConversation && conversationState !== 'loading' ? <QueryStateCard state={conversationState} error={conversation.error} onRetry={conversation.refetch} /> : null}{canUseConversation && conversationState === 'stale-error' ? <QueryStateCard state="stale-error" error={conversation.error} onRetry={conversation.refetch} /> : null}{canUseConversation && messages.length ? messages.map((item) => !hiddenMessageIds.has(item.id) ? <ChatMessage key={item.id} message={item} own={item.senderId === viewer.data?.id} locale={locale} ownerMode={ownerMode} onDecision={(decision) => void decide(item.id, decision)} deciding={decideState.isLoading} reportStatus={ownReportItems.find((report) => report.messageId === item.id)} allowActions={Boolean(chatId && !ownReports.isLoading) && item.kind === 'text' && Boolean(item.body)} allowReport={!moderationReviewActive} allowDelete={item.senderId === viewer.data?.id && item.kind === 'text' && currentTime !== null && currentTime - Date.parse(item.createdAt) >= 0 && currentTime - Date.parse(item.createdAt) <= 5 * 60_000 && !messagesProtected && !ownReportItems.some((report) => report.messageId === item.id && report.status === 'pending')} onCopy={() => void copyMessage(item.body ?? '')} onDelete={() => void removeMessageForEveryone(item.id)} onHide={() => hideMessageForMe(item.id)} onReport={() => { setReportingMessage(item); setReportCategory('harassment'); setReportDescription(''); setReportValidationError(false) }} labels={t} /> : null) : canUseConversation && conversationState !== 'loading' ? <p className="text-center text-xs font-semibold text-muted-foreground">{t('autocare.chatEmpty')}</p> : null}{canUseConversation && attachments.length ? <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{attachments.map((attachment) => <PrivateAttachmentButton key={attachment.id} requestId={requestId} attachmentId={attachment.id} onOpen={(url) => setSelectedAttachment({ url })} label={t('autocare.chatAttachmentView')} errorLabel={t('common.tryAgainLater')} />)}</div> : null}</div>{activeOwnReportPages.nextCursor && <div className="border-t border-border bg-secondary/30 px-4 py-3"><button type="button" onClick={() => void loadOlderOwnReports()} disabled={ownReportPageState.isFetching} className="mx-auto flex min-h-9 items-center rounded-[var(--radius-control)] border border-border bg-card px-3 text-xs font-black text-primary disabled:opacity-60">{ownReportPageState.isFetching ? t('autocare.chatLoading') : t('autocare.chatLoadOlderReports')}</button>{activeOwnReportPages.failed && <p role="alert" className="mt-2 text-center text-xs font-semibold text-destructive">{t('autocare.chatLoadReportsFailed')}</p>}</div>}<div className="border-t border-border p-4 sm:p-5"><form className="flex items-end gap-2" onSubmit={(event) => void submitMessage(event)}><label aria-label={t('autocare.chatAttachFile')} className="inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-control)] border border-border text-muted-foreground hover:border-primary hover:text-primary"><Paperclip className="size-4" /><input data-testid="service-request-attachment-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void upload(event)} disabled={!canUseConversation || sendState.isLoading || uploadState.isLoading} className="sr-only" /></label><textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={2} disabled={!canUseConversation} placeholder={t('autocare.chatPlaceholder')} className="min-h-10 min-w-0 flex-1 resize-none rounded-[var(--radius-control)] border border-border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60" /><button type="submit" disabled={!canUseConversation || sendState.isLoading || !message.trim()} aria-label={t('autocare.chatSend')} className="inline-flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-primary text-primary-foreground disabled:opacity-50"><Send className="size-4" /></button></form><div className="mt-3 flex flex-wrap items-center justify-between gap-2"><span className="text-[11px] text-muted-foreground">{uploadState.isLoading ? t('autocare.chatUploading') : t('autocare.chatAttachmentHint')}</span>{ownerMode && <button type="button" onClick={() => setShowOffer((value) => !value)} disabled={!canUseConversation} className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-control)] border border-primary/30 px-3 text-xs font-black text-primary hover:bg-primary/5 disabled:opacity-50"><Sparkles className="size-3.5" />{t('autocare.chatOfferButton')}</button>}</div>{showOffer && ownerMode && <form className="mt-4 grid gap-3 rounded-[var(--radius-card)] border border-primary/20 bg-primary/5 p-4" onSubmit={(event) => void submitOffer(event)}><div className="flex items-center justify-between"><p className="text-xs font-black text-foreground">{t('autocare.chatOfferTitle')}</p><button type="button" onClick={() => setShowOffer(false)} aria-label={t('common.close')} className="text-muted-foreground hover:text-foreground"><X className="size-4" /></button></div><div className="grid gap-2 sm:grid-cols-2"><label className="grid gap-1 text-xs font-bold">{t('autocare.chatOfferType')}<select value={offerType} onChange={(event) => { if (isChatOfferType(event.target.value)) setOfferType(event.target.value) }} className="h-9 rounded-[var(--radius-control)] border border-border bg-background px-2 text-xs"><option value="discount">{t('autocare.chatOfferDiscount')}</option><option value="alternative">{t('autocare.chatOfferAlternative')}</option></select></label><label className="grid gap-1 text-xs font-bold">{t('autocare.chatOfferTitleLabel')}<input value={offerTitle} onChange={(event) => setOfferTitle(event.target.value)} className="h-9 rounded-[var(--radius-control)] border border-border bg-background px-2 text-xs" /></label></div>{offerType === 'discount' ? <div className="grid gap-2 sm:grid-cols-2"><label className="grid gap-1 text-xs font-bold">{t('autocare.chatOfferDiscountLabel')}<span className="relative"><Percent className="pointer-events-none absolute left-2 top-2.5 size-3 text-muted-foreground" /><input type="number" min="1" max="100" value={discountPercent} onChange={(event) => setDiscountPercent(event.target.value)} className="h-9 w-full rounded-[var(--radius-control)] border border-border bg-background pl-7 pr-2 text-xs" /></span></label><label className="grid gap-1 text-xs font-bold">{t('autocare.chatOfferCouponLabel')}<input value={couponCode} onChange={(event) => setCouponCode(event.target.value.toUpperCase())} maxLength={32} placeholder="AC-..." className="h-9 rounded-[var(--radius-control)] border border-border bg-background px-2 text-xs uppercase" /></label></div> : <label className="grid gap-1 text-xs font-bold">{t('autocare.chatOfferAmountLabel')}<input inputMode="decimal" value={offerAmount} onChange={(event) => setOfferAmount(event.target.value)} className="h-9 rounded-[var(--radius-control)] border border-border bg-background px-2 text-xs" /></label>}<label className="grid gap-1 text-xs font-bold">{t('autocare.chatOfferDescriptionLabel')}<textarea rows={2} value={offerDescription} onChange={(event) => setOfferDescription(event.target.value)} placeholder={t('autocare.chatOfferDescriptionPlaceholder')} className="rounded-[var(--radius-control)] border border-border bg-background p-2 text-xs" /></label><button type="submit" disabled={offerState.isLoading} className="inline-flex h-9 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-primary px-3 text-xs font-black text-primary-foreground disabled:opacity-60"><Sparkles className="size-3.5" />{offerState.isLoading ? t('autocare.chatOfferSending') : t('autocare.chatOfferSend')}</button></form>}</div></section><Dialog isOpen={Boolean(selectedAttachment)} onOpenChange={(open) => { if (!open) setSelectedAttachment(null) }} className="max-w-4xl bg-hero-overlay p-3 sm:p-5"><DialogContent><div className="flex items-center justify-between gap-3"><DialogTitle className="text-primary-foreground">{t('autocare.chatAttachmentView')}</DialogTitle><button type="button" aria-label={t('common.close')} onClick={() => setSelectedAttachment(null)} className="flex size-9 items-center justify-center rounded-[var(--radius-control)] text-primary-foreground hover:bg-primary-foreground/10"><X className="size-5" /></button></div>{selectedAttachment && <img src={selectedAttachment.url} alt={t('autocare.chatAttachmentView')} className="mt-4 max-h-[75vh] w-full rounded-[var(--radius-card)] object-contain" />}</DialogContent></Dialog><ConfirmDialog isOpen={Boolean(reportingMessage)} title={t('autocare.chatReportConfirmTitle')} description={t('autocare.chatReportConfirmDescription')} confirmLabel={t('autocare.chatReportConfirmSubmit')} loadingLabel={t('autocare.chatReportSending')} isLoading={reportState.isLoading} confirmVariant="destructive" onCancel={() => { setReportingMessage(null); setReportValidationError(false) }} onConfirm={() => void submitReport()}>{reportingMessage ? <div className="grid gap-3"><p className="rounded-[var(--radius-control)] border border-border bg-background p-3 text-sm text-foreground">{reportingMessage.body}</p><label className="grid gap-1 text-xs font-bold text-foreground"><span>{t('autocare.chatReportCategory')}</span><select value={reportCategory} onChange={(event) => { if (isChatReportCategory(event.target.value)) { setReportCategory(event.target.value); setReportValidationError(false) } }} className="h-10 rounded-[var(--radius-control)] border border-border bg-background px-3"><option value="harassment">{t('autocare.chatReportCategoryHarassment')}</option><option value="threat">{t('autocare.chatReportCategoryThreat')}</option><option value="fraud">{t('autocare.chatReportCategoryFraud')}</option><option value="other">{t('autocare.chatReportCategoryOther')}</option></select></label><label className="grid gap-1 text-xs font-bold text-foreground"><span>{t('autocare.chatReportDetails')}</span><textarea maxLength={2000} rows={3} value={reportDescription} onChange={(event) => { setReportDescription(event.target.value); setReportValidationError(false) }} aria-invalid={reportValidationError || undefined} className="rounded-[var(--radius-control)] border border-border bg-background p-3 text-sm font-normal" /></label>{reportValidationError ? <p role="alert" className="text-xs font-bold text-destructive">{t('autocare.chatReportThreatDetailsRequired')}</p> : null}</div> : null}</ConfirmDialog></>
}

type ConversationMessagesState = { requestId: string; pages: Map<string, AutoCareServiceMessage[]>; items: AutoCareServiceMessage[] }
type ConversationMessagesAction = { requestId: string; pageKey: string; messages: AutoCareServiceMessage[] }

function PrivateAttachmentButton({ requestId, attachmentId, onOpen, label, errorLabel }: { requestId: string; attachmentId: string; onOpen: (url: string) => void; label: string; errorLabel: string }) {
    const { data: objectUrl, isLoading, isError, refetch } = useGetAutoCareAttachmentObjectUrlQuery(
        { channel: 'request', requestId, attachmentId },
        { refetchOnMountOrArgChange: true },
    )

    return <button type="button" data-testid="service-request-attachment" disabled={isLoading} aria-busy={isLoading} aria-label={isError ? `${label}: ${errorLabel}` : label} aria-invalid={isError || undefined} onClick={() => { if (objectUrl) onOpen(objectUrl); else if (isError) void refetch() }} className="group relative overflow-hidden rounded-[var(--radius-control)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40 disabled:cursor-wait"><img src={objectUrl} alt={isError ? errorLabel : label} className="aspect-[4/3] w-full object-cover transition group-hover:scale-105" loading="lazy" sizes="(min-width: 768px) 33vw, 50vw" /><span className="sr-only">{isError ? errorLabel : label}</span></button>
}

function conversationMessagesReducer(state: ConversationMessagesState, action: ConversationMessagesAction): ConversationMessagesState {
    const pages = action.requestId === state.requestId ? new Map(state.pages) : new Map<string, AutoCareServiceMessage[]>()
    pages.set(action.pageKey, action.messages)
    const merged = Array.from(pages.values()).flat()
    const items = Array.from(new Map(merged.map((item) => [item.id, item])).values())
        .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id))
    return { requestId: action.requestId, pages, items }
}

function isConversationReady(state: string): boolean {
    return state === 'success' || state === 'refreshing' || state === 'empty' || state === 'stale-error'
}

function ChatMessage({ message, own, locale, ownerMode, onDecision, deciding, reportStatus, allowActions, allowDelete, allowReport, onCopy, onDelete, onHide, onReport, labels }: {
    message: AutoCareServiceMessage
    own: boolean
    locale: string
    ownerMode: boolean
    onDecision: (decision: 'accept' | 'decline') => void
    deciding: boolean
    reportStatus?: { status: 'pending' | 'resolved' | 'dismissed'; assignedModeratorId: string | null; overturnedAt?: string | null } | undefined
    allowActions: boolean
    allowDelete: boolean
    allowReport: boolean
    onCopy: () => void
    onDelete: () => void
    onHide: () => void
    onReport: () => void
    labels: (key: TranslationKey) => string
}) {
    const timeLabel = formatChatDate(message.createdAt, locale)
    const actionButton = useRef<HTMLButtonElement | null>(null)
    const holdTimer = useRef<number | null>(null)
    const visibleActions = allowActions && !message.deletedAt && !reportStatus
    const items = visibleActions ? [
        { label: labels('autocare.chatCopy'), value: 'copy', icon: <Copy className="size-4" /> },
        ...(own ? allowDelete
            ? [{ label: labels('autocare.chatDeleteForEveryone'), value: 'delete', icon: <Trash2 className="size-4" /> }]
            : [{ label: labels('autocare.chatHideForMe'), value: 'hide', icon: <EyeOff className="size-4" /> }]
            : allowReport ? [{ label: labels('autocare.chatReportAction'), value: 'report', icon: <Flag className="size-4" /> }] : []),
    ] : []
    const cancelHold = () => {
        if (holdTimer.current !== null) window.clearTimeout(holdTimer.current)
        holdTimer.current = null
    }
    const openNativeMenu = (event: ReactMouseEvent<HTMLElement> | ReactKeyboardEvent<HTMLElement>) => {
        event.stopPropagation()
        event.preventDefault()
        actionButton.current?.click()
    }
    const selectAction = (value: string) => {
        if (value === 'copy') onCopy()
        if (value === 'delete') onDelete()
        if (value === 'hide') onHide()
        if (value === 'report') onReport()
    }

    return <div className={`flex ${own ? 'justify-end' : 'justify-start'}`} onContextMenu={visibleActions ? openNativeMenu : undefined} onPointerDown={(event) => {
        if (!visibleActions || event.pointerType !== 'touch') return
        cancelHold()
        holdTimer.current = window.setTimeout(() => actionButton.current?.click(), 550)
    }} onPointerMove={cancelHold} onPointerUp={cancelHold} onPointerCancel={cancelHold} onKeyDown={(event) => {
        if ((event.shiftKey && event.key === 'F10' || event.key === 'ContextMenu') && visibleActions) openNativeMenu(event)
    }}>
        <article tabIndex={visibleActions ? 0 : undefined} aria-label={visibleActions ? labels('autocare.chatMessageActionsHint') : undefined} className={`max-w-[min(92%,520px)] touch-pan-y rounded-[var(--radius-card)] border px-3 py-2.5 shadow-sm ${own ? 'border-primary/20 bg-primary text-primary-foreground' : 'border-border bg-card text-foreground'}`}>
            <div className={`mb-1 flex items-center gap-1 text-[10px] font-bold ${own ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                {timeLabel}{own && (message.readAt ? <CheckCheck className="size-3.5" /> : message.deliveredAt ? <Check className="size-3.5" /> : <Clock3 className="size-3" />)}
                {visibleActions ? <Dropdown
                    items={items}
                    onSelect={selectAction}
                    align="right"
                    className="ml-auto"
                    trigger={(triggerProps) => <button {...triggerProps} ref={actionButton} type="button" aria-label={labels('autocare.chatMessageActions')} className="inline-flex size-7 items-center justify-center rounded-[var(--radius-control)] text-current hover:bg-current/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onContextMenu={openNativeMenu} onKeyDown={(event) => {
                        triggerProps.onKeyDown(event)
                        if ((event.shiftKey && event.key === 'F10') || event.key === 'ContextMenu') openNativeMenu(event)
                    }}><MoreHorizontal className="size-4" /></button>}
                /> : null}
            </div>
            {message.deletedAt ? <p className="text-sm italic opacity-75">{labels('autocare.chatMessageDeleted')}</p> : message.body && message.kind !== 'offer' ? <p className="whitespace-pre-wrap text-sm leading-6">{message.body}</p> : null}
            {reportStatus ? <p role="status" className="mt-2 text-[10px] font-bold opacity-80">{reportStatus.overturnedAt ? labels('autocare.chatReportOverturned') : reportStatus.status === 'pending' ? reportStatus.assignedModeratorId ? labels('autocare.chatReportAssigned') : labels('autocare.chatReportReceived') : labels(reportStatus.status === 'resolved' ? 'autocare.chatReportResolved' : 'autocare.chatReportDismissed')}</p> : null}
            {message.offer && <OfferCard offer={message.offer} locale={locale} ownerMode={ownerMode} onDecision={onDecision} deciding={deciding} labels={labels} />}
        </article>
    </div>
}
function OfferCard({ offer, locale, ownerMode, onDecision, deciding, labels }: { offer: NonNullable<AutoCareServiceMessage['offer']>; locale: string; ownerMode: boolean; onDecision: (decision: 'accept' | 'decline') => void; deciding: boolean; labels: (key: 'autocare.chatOfferPending' | 'autocare.chatOfferAccepted' | 'autocare.chatOfferDeclined' | 'autocare.chatOfferAccept' | 'autocare.chatOfferDecline') => string }) {
    const statusLabel = offer.status === 'pending' ? labels('autocare.chatOfferPending') : offer.status === 'accepted' ? labels('autocare.chatOfferAccepted') : labels('autocare.chatOfferDeclined')
    return <div className="mt-1 rounded-[var(--radius-control)] border border-primary/20 bg-primary/5 p-3"><div className="flex items-center gap-2 text-sm font-black"><Sparkles className="size-4 text-primary" />{offer.title}</div>{offer.description && <p className="mt-1 text-xs leading-5 text-muted-foreground">{offer.description}</p>}{offer.discountPercent && <p className="mt-2 text-lg font-black text-primary">−{offer.discountPercent}%</p>}{offer.amountMinor !== null && offer.currencyCode && <p className="mt-2 text-lg font-black text-foreground">{formatCurrency(offer.amountMinor / 100, offer.currencyCode, locale)}</p>}{offer.couponCode && <p className="mt-2 rounded bg-background px-2 py-1 text-center text-xs font-black tracking-widest text-primary">{offer.couponCode}</p>}<p className="mt-2 text-[10px] font-bold text-muted-foreground">{statusLabel}</p>{!ownerMode && offer.status === 'pending' && <div className="mt-3 flex gap-2"><button type="button" disabled={deciding} onClick={() => onDecision('accept')} className="h-8 flex-1 rounded-[var(--radius-control)] bg-primary px-2 text-[11px] font-black text-primary-foreground">{labels('autocare.chatOfferAccept')}</button><button type="button" disabled={deciding} onClick={() => onDecision('decline')} className="h-8 flex-1 rounded-[var(--radius-control)] border border-border px-2 text-[11px] font-black text-foreground">{labels('autocare.chatOfferDecline')}</button></div>}</div>
}

function formatChatDate(value: string, locale: string) {
    const date = new Date(value)
    const now = new Date()
    const day = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const time = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(date)
    const dayDelta = Math.round((day - today) / 86_400_000)
    if (dayDelta === 0 || dayDelta === -1) {
        const relative = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(dayDelta, 'day')
        return `${relative.slice(0, 1).toLocaleUpperCase(locale)}${relative.slice(1)}, ${time}`
    }
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function readFileAsBase64(file: File) {
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(file)
    })
}

const HIDDEN_CHAT_MESSAGES_STORAGE_PREFIX = 'autocare.chat-hidden.v1:'
const MAX_HIDDEN_CHAT_MESSAGES = 250
const emptyHiddenMessageIds = new Set<string>()

function readHiddenMessageIds(userId: string | undefined): Set<string> {
    if (!userId || typeof window === 'undefined') return new Set()
    try {
        const value: unknown = JSON.parse(window.localStorage.getItem(`${HIDDEN_CHAT_MESSAGES_STORAGE_PREFIX}${userId}`) ?? 'null')
        if (typeof value !== 'object' || value === null || !('version' in value) || value.version !== 1 || !('messageIds' in value) || !Array.isArray(value.messageIds)) return new Set()
        return new Set(value.messageIds.filter((id): id is string => typeof id === 'string' && id.length > 0 && id.length <= 128).slice(-MAX_HIDDEN_CHAT_MESSAGES))
    } catch {
        return new Set()
    }
}

function writeHiddenMessageIds(userId: string | undefined, messageIds: Set<string>) {
    if (!userId || typeof window === 'undefined') return
    try {
        window.localStorage.setItem(`${HIDDEN_CHAT_MESSAGES_STORAGE_PREFIX}${userId}`, JSON.stringify({ version: 1, messageIds: Array.from(messageIds).slice(-MAX_HIDDEN_CHAT_MESSAGES) }))
    } catch {
        // Hiding remains effective for the current session when browser storage is unavailable.
    }
}

function isChatOfferType(value: string): value is 'discount' | 'alternative' {
    return value === 'discount' || value === 'alternative'
}

function isChatReportCategory(value: string): value is 'harassment' | 'threat' | 'fraud' | 'other' {
    return value === 'harassment' || value === 'threat' || value === 'fraud' || value === 'other'
}
