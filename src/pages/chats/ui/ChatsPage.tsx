import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent } from 'react'
import { Copy, EyeOff, Flag, LifeBuoy, MessageCircle, MoreHorizontal, Paperclip, Plus, Send, Trash2, Wrench } from 'lucide-react'
import { Link, useLocation, useSearchParams } from 'react-router'

import {
    ServiceRequestChat,
    connectAutoCareChat,
    useCreateAutoCareChatMessageMutation,
    useCreateAutoCareChatAttachmentMutation,
    useGetAutoCareAttachmentObjectUrlQuery,
    useCreateAutoCareChatMutation,
    useCreateAutoCareAppealMutation,
    useCreateAutoCareChatReportMutation,
    useDeleteAutoCareChatMessageMutation,
    useGetAutoCareChatQuery,
    useGetAutoCareChatsQuery,
    useGetMyAutoCareChatReportsQuery,
    useGetAdminAutoCareChatReportsQuery,
    useMarkAutoCareChatReadMutation,
    type AutoCareChatReport,
    type AutoCareChatThread,
    type AutoCareServiceMessage,
} from '@/entities/automotive-service'
import { validateChatAttachment } from '@/entities/automotive-service/lib/chat-attachment'
import { useGetMeQuery } from '@/features/auth'
import { ROUTES } from '@/shared/constants/routes'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { formatDateTime } from '@/shared/lib/locale-format'
import type { TranslationKey } from '@/shared/lib/i18n'
import { useTranslation } from '@/shared/lib/useTranslation'
import { PageHeader } from '@/shared/ui/page-header'
import { ChatConversationSkeleton, SplitListSkeleton } from '@/shared/ui/loading-skeleton'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog'
import { Dropdown } from '@/shared/ui/dropdown/Dropdown'

type ChatsPageProps = { workspace?: 'client' | 'owner' | 'admin' | 'super_admin' }
const emptyThreads: AutoCareChatThread[] = []

function getChatErrorMessage(error: unknown, fallback: string) {
    if (error instanceof Error && !('data' in error)) return fallback
    return getApiErrorMessage(error, fallback)
}

const emptyChatReports: AutoCareChatReport[] = []
const emptyHiddenMessages = new Set<string>()
const hiddenChatMessagesStoragePrefix = 'autocare.chat-hidden.v1:'
const maxHiddenChatMessages = 250

function readHiddenChatMessages(userId: string | undefined) {
    if (!userId || typeof window === 'undefined') return new Set<string>()
    try {
        const value: unknown = JSON.parse(window.localStorage.getItem(`${hiddenChatMessagesStoragePrefix}${userId}`) ?? 'null')
        if (typeof value !== 'object' || value === null || !('version' in value) || value.version !== 1 || !('messageIds' in value) || !Array.isArray(value.messageIds)) return new Set<string>()
        return new Set(value.messageIds.filter((id): id is string => typeof id === 'string' && id.length > 0 && id.length <= 128).slice(-maxHiddenChatMessages))
    } catch {
        return new Set<string>()
    }
}

function writeHiddenChatMessages(userId: string | undefined, messageIds: Set<string>) {
    if (!userId || typeof window === 'undefined') return
    try {
        window.localStorage.setItem(`${hiddenChatMessagesStoragePrefix}${userId}`, JSON.stringify({ version: 1, messageIds: Array.from(messageIds).slice(-maxHiddenChatMessages) }))
    } catch {
        // Keep the in-memory hidden state when local storage is unavailable.
    }
}

export function ChatsPage({ workspace }: ChatsPageProps) {
    const { t, locale } = useTranslation()
    const { data: user } = useGetMeQuery()
    const location = useLocation()
    const emergencyReason = user?.role === 'super_admin' ? readEmergencyReason(location.state) : undefined
    const [searchParams, setSearchParams] = useSearchParams()
    const role = workspace ?? user?.role ?? 'client'
    const { data: loadedThreads, isLoading, isSuccess: isThreadsLoaded } = useGetAutoCareChatsQuery()
    const threads = loadedThreads ?? emptyThreads
    const [createChat, createState] = useCreateAutoCareChatMutation()
    const [createAppeal, appealState] = useCreateAutoCareAppealMutation()
    const [appealReason, setAppealReason] = useState('')
    const [appealError, setAppealError] = useState<unknown>(null)
    const [appealValidationError, setAppealValidationError] = useState(false)
    const [selectedId, setSelectedId] = useState<string | null>(() => searchParams.get('chat'))
    const [chatActionError, setChatActionError] = useState<unknown>(null)
    const providerCreationAttemptedRef = useRef<string | null>(null)
    const requestId = searchParams.get('request')
    const providerId = searchParams.get('providerId')
    const providerThread = providerId ? threads.find((thread) => thread.providerId === providerId && thread.type === 'provider_inquiry') : undefined
    const supportThread = threads.find((thread) => thread.type === 'support' && !thread.providerId && !thread.requestId)
    const canOpenSupport = role === 'client' || role === 'owner'
    const orderedThreads = useMemo(() => {
        const visibleThreads = canOpenSupport && supportThread ? threads.filter((thread) => thread.id !== supportThread.id) : threads
        return [...visibleThreads].sort((left, right) => {
            const leftSupport = left.type === 'support' ? 1 : 0
            const rightSupport = right.type === 'support' ? 1 : 0
            return rightSupport - leftSupport || (right.updatedAt ?? '').localeCompare(left.updatedAt ?? '')
        })
    }, [canOpenSupport, supportThread, threads])
    const activeId = selectedId && threads.some((thread) => thread.id === selectedId)
        ? selectedId
        : providerThread?.id ?? threads.find((thread) => thread.requestId === requestId)?.id ?? threads[0]?.id ?? null
    const activeThread = threads.find((thread) => thread.id === activeId) ?? null
    const activeRestriction = activeThread?.moderationRestriction ?? null
    const reportId = searchParams.get('report')
    const moderationReports = useGetAdminAutoCareChatReportsQuery({ status: 'pending' }, { skip: role !== 'admin', refetchOnFocus: true, refetchOnReconnect: true })
    const moderatorGrant = moderationReports.data?.items.find((report) => report.id === reportId && report.threadId === activeThread?.id && report.assignedModeratorId === user?.id && report.messageId)

    useEffect(() => {
        if (!providerId || role !== 'client' || !isThreadsLoaded || createState.isLoading || providerCreationAttemptedRef.current === providerId) return
        const existing = threads.find((thread) => thread.providerId === providerId && thread.type === 'provider_inquiry')
        if (existing) {
            setSearchParams({ chat: existing.id })
            return
        }
        providerCreationAttemptedRef.current = providerId
        const startProviderChat = async () => {
            try {
                setChatActionError(null)
                const thread = await createChat({ type: 'provider_inquiry', providerId, subject: t('autocare.chatWorkspaceGeneral') }).unwrap()
                setSearchParams({ chat: thread.id })
            } catch (error) {
                setChatActionError(error)
            }
        }
        void startProviderChat()
    }, [createChat, createState.isLoading, isThreadsLoaded, providerId, role, setSearchParams, t, threads])

    const selectThread = (thread: AutoCareChatThread) => {
        setChatActionError(null)
        setSelectedId(thread.id)
        setSearchParams({ chat: thread.id })
    }

    const createStandaloneChat = async (type: 'support' | 'admin_escalation') => {
        setChatActionError(null)
        try {
            const thread = await createChat({ type, subject: type === 'support' ? t('autocare.chatWorkspaceSupportSubject') : t('autocare.chatWorkspaceEscalation') }).unwrap()
            selectThread(thread)
        } catch (error) {
            setChatActionError(error)
        }
    }

    const openSupport = () => {
        if (supportThread) {
            selectThread(supportThread)
            return
        }
        void createStandaloneChat('support')
    }

    const retryChatAction = () => {
        setChatActionError(null)
        providerCreationAttemptedRef.current = null
    }

    const submitRestrictionAppeal = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const reason = appealReason.trim()
        if (!activeRestriction || reason.length < 20) {
            setAppealValidationError(true)
            return
        }
        setAppealValidationError(false)
        setAppealError(null)
        try {
            await createAppeal({ subject: 'chat_restriction', subjectId: activeRestriction.id, reason }).unwrap()
            setAppealReason('')
        } catch (error) {
            setAppealError(error)
        }
    }

    if (isLoading) {
        return <main className="min-h-full bg-background px-[var(--layout-gutter)] py-7 lg:py-10"><div className="mx-auto max-w-7xl"><PageHeader eyebrow={t('autocare.chatWorkspaceEyebrow')} title={t('autocare.chatWorkspaceTitle')} description={t('autocare.chatWorkspaceDescription')} /><div className="mt-6"><SplitListSkeleton label={t('common.loading')} /></div></div></main>
    }

    return <main className="min-h-full bg-background px-[var(--layout-gutter)] py-7 lg:py-10"><div className="mx-auto max-w-7xl"><PageHeader eyebrow={t('autocare.chatWorkspaceEyebrow')} title={t('autocare.chatWorkspaceTitle')} description={t('autocare.chatWorkspaceDescription')} />{chatActionError ? <div role="alert" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-card)] border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm font-semibold text-destructive"><span>{getApiErrorMessage(chatActionError, t('common.tryAgainLater'))}</span><button type="button" onClick={retryChatAction} className="rounded-[var(--radius-control)] border border-destructive/30 px-3 py-1.5 text-xs font-black text-destructive hover:bg-destructive/10">{t('common.retry')}</button></div> : null}<div className="mt-6 grid min-h-[620px] gap-4 lg:grid-cols-[minmax(260px,0.34fr)_minmax(0,1fr)]"><aside className="overflow-hidden rounded-[var(--radius-panel)] border border-border bg-card shadow-sm"><div className="flex items-center justify-between border-b border-border px-4 py-4"><h2 className="text-sm font-black text-foreground">{t('autocare.chatWorkspaceTitle')}</h2><span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-black text-primary">{threads.length}</span></div><div className="max-h-[600px] overflow-y-auto p-2">{canOpenSupport && <SupportThreadItem active={supportThread?.id === activeId} isLoading={createState.isLoading} unreadCount={supportThread?.unreadCount ?? 0} onSelect={openSupport} t={t} />}{orderedThreads.length === 0 && !supportThread && !canOpenSupport ? <p className="p-4 text-sm text-muted-foreground">{t('autocare.chatWorkspaceEmpty')}</p> : orderedThreads.map((thread) => <ThreadItem key={thread.id} thread={thread} active={thread.id === activeId} onSelect={() => selectThread(thread)} t={t} pinned={thread.type === 'support'} />)}</div></aside><section className="min-w-0">{activeRestriction && (role === 'client' || role === 'owner') ? <div className="mb-3 rounded-[var(--radius-card)] border border-status-warning/30 bg-status-warning/5 p-4"><p className="text-sm font-black text-foreground">{t(activeRestriction.state === 'active' ? 'autocare.chatRestrictionActive' : 'autocare.chatRestrictionExpired', { date: formatDateTime(activeRestriction.expiresAt, locale, { dateStyle: 'medium', timeStyle: 'short' }) })}</p><p className="mt-2 text-sm leading-6 text-muted-foreground">{activeRestriction.reason}</p>{activeRestriction.appealStatus === 'pending' ? <p role="status" className="mt-3 text-sm font-bold text-primary">{t('autocare.chatRestrictionAppealPending')}</p> : <form className="mt-3 grid gap-2" onSubmit={(event) => void submitRestrictionAppeal(event)}><label className="grid gap-1 text-xs font-bold text-muted-foreground"><span>{t('autocare.chatRestrictionAppealReason')}</span><textarea rows={3} minLength={20} maxLength={4_000} required value={appealReason} onChange={(event) => { setAppealValidationError(false); setAppealError(null); setAppealReason(event.target.value) }} className="rounded-[var(--radius-control)] border border-border bg-background p-3 text-sm font-normal text-foreground" /></label>{appealValidationError && <p role="alert" className="text-xs font-bold text-destructive">{t('autocare.chatRestrictionAppealRequired')}</p>}{appealError !== null && <p role="alert" className="text-xs font-bold text-destructive">{getChatErrorMessage(appealError, t('autocare.chatRestrictionAppealFailed'))}</p>}<button type="submit" disabled={appealState.isLoading || appealReason.trim().length < 20} className="inline-flex h-9 w-fit items-center justify-center rounded-[var(--radius-control)] bg-primary px-3 text-xs font-black text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60">{appealState.isLoading ? t('autocare.chatRestrictionAppealSending') : t('autocare.chatRestrictionAppealSubmit')}</button></form>}</div> : null}{activeThread?.requestId && (role === 'admin' || role === 'super_admin') ? <GenericChatConversation key={`${activeThread.id}:${user?.id ?? ''}`} chatId={activeThread.id} readOnly emergencyReason={emergencyReason} moderationAccessExpiresAt={moderatorGrant?.accessExpiresAt ?? undefined} /> : activeThread?.requestId ? <ServiceRequestChat requestId={activeThread.requestId} ownerMode={role === 'owner'} /> : activeThread ? <GenericChatConversation key={`${activeThread.id}:${user?.id ?? ''}`} chatId={activeThread.id} readOnly={role === 'admin' || role === 'super_admin'} emergencyReason={emergencyReason} moderationAccessExpiresAt={moderatorGrant?.accessExpiresAt ?? undefined} /> : <div className="flex min-h-[620px] items-center justify-center rounded-[var(--radius-panel)] border border-dashed border-border bg-card p-8 text-center"><div><MessageCircle className="mx-auto size-9 text-primary" /><p className="mt-4 text-sm font-black text-foreground">{role === 'admin' ? t('autocare.chatWorkspaceModeratorEmptyTitle') : t('autocare.chatWorkspaceSelect')}</p>{role === 'admin' ? <><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{t('autocare.chatWorkspaceModeratorEmptyDescription')}</p><Link to={`${ROUTES.adminDashboard}#admin-chat-reports`} className="mx-auto mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-primary px-4 text-xs font-black text-primary-foreground">{t('autocare.chatWorkspaceModeratorQueue')}</Link></> : <QuickChatAction role={role} onCreate={(type) => void createStandaloneChat(type)} t={t} />}</div></div>}</section></div></div></main>
}

function SupportThreadItem({ active, isLoading, unreadCount, onSelect, t }: { active: boolean; isLoading: boolean; unreadCount: number; onSelect: () => void; t: (key: TranslationKey, params?: Record<string, string | number>) => string }) {
    return <button type="button" onClick={onSelect} disabled={isLoading} className={`mb-2 flex w-full items-center gap-3 rounded-[var(--radius-control)] border border-primary/30 p-3 text-left transition ${active ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-foreground hover:bg-primary/15'} disabled:cursor-wait disabled:opacity-70`}><span className={`flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] ${active ? 'bg-primary-foreground/15' : 'bg-primary/15 text-primary'}`}><LifeBuoy className="size-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-black">{t('autocare.chatWorkspaceSupport')}</span><span className={`mt-1 block truncate text-[10px] font-semibold ${active ? 'text-primary-foreground/75' : 'text-muted-foreground'}`}>{t('autocare.chatWorkspaceSupportHint')}</span></span>{unreadCount > 0 && <span className="rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-black text-primary-foreground">{unreadCount}</span>}</button>
}

function ThreadItem({ thread, active, onSelect, t, pinned = false }: { thread: AutoCareChatThread; active: boolean; onSelect: () => void; t: (key: TranslationKey, params?: Record<string, string | number>) => string; pinned?: boolean }) {
    const label = thread.type === 'service_request' ? t('autocare.chatWorkspaceRequest') : thread.type === 'provider_inquiry' ? t('autocare.chatWorkspaceProviderInquiry') : thread.type === 'support' ? t('autocare.chatWorkspaceSupportType') : t('autocare.chatWorkspaceEscalation')
    return <button type="button" onClick={onSelect} className={`w-full rounded-[var(--radius-control)] p-3 text-left transition ${active ? 'bg-primary/10 text-primary' : pinned ? 'bg-primary/[0.04] text-foreground hover:bg-primary/[0.08]' : 'text-foreground hover:bg-secondary'}`}><div className="flex items-start gap-3"><span className={`flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] ${active ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'}`}>{pinned ? <LifeBuoy className="size-4" /> : <MessageCircle className="size-4" />}</span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-black">{thread.subject}</span><span className="mt-1 block truncate text-[10px] font-semibold text-muted-foreground">{thread.providerName ?? label}</span></span>{thread.unreadCount > 0 && <span className="rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-black text-primary-foreground">{thread.unreadCount}</span>}</div></button>
}

function GenericChatConversation({ chatId, readOnly = false, emergencyReason, moderationAccessExpiresAt }: { chatId: string; readOnly?: boolean; emergencyReason?: string; moderationAccessExpiresAt?: string }) {
    const { t, locale } = useTranslation()
    const { data: user } = useGetMeQuery()
    const [beforeCursor, setBeforeCursor] = useState<string | undefined>(undefined)
    const [grantState, setGrantState] = useState<'checking' | 'active' | 'expired'>('checking')
    const grantExpiresAt = moderationAccessExpiresAt ? Date.parse(moderationAccessExpiresAt) : Number.NaN
    useEffect(() => {
        const updateGrantState = window.setTimeout(() => {
            if (!readOnly || emergencyReason || (Number.isFinite(grantExpiresAt) && grantExpiresAt > Date.now())) setGrantState('active')
            else setGrantState('expired')
        }, 0)
        const expiryTimer = readOnly && !emergencyReason && Number.isFinite(grantExpiresAt)
            ? window.setTimeout(() => setGrantState('expired'), Math.max(0, grantExpiresAt - Date.now()))
            : undefined
        return () => {
            window.clearTimeout(updateGrantState)
            if (expiryTimer !== undefined) window.clearTimeout(expiryTimer)
        }
    }, [emergencyReason, grantExpiresAt, readOnly])
    const canRead = !readOnly || Boolean(emergencyReason) || grantState === 'active'
    const { data, isLoading, isFetching, isUninitialized, isError, refetch } = useGetAutoCareChatQuery({ chatId, beforeCursor, limit: 50, ...(emergencyReason ? { emergencyReason } : {}) }, { skip: !canRead, refetchOnMountOrArgChange: canRead })
    const [messageState, dispatchMessages] = useReducer(conversationMessagesReducer, { chatId, pages: new Map<string, AutoCareServiceMessage[]>(), items: [] })
    const [sendMessage, sendState] = useCreateAutoCareChatMessageMutation()
    const [markRead] = useMarkAutoCareChatReadMutation()
    const [uploadAttachment, uploadState] = useCreateAutoCareChatAttachmentMutation()
    const ownReports = useGetMyAutoCareChatReportsQuery({ chatId, limit: 50 }, { skip: readOnly, pollingInterval: 30_000, refetchOnFocus: true, refetchOnReconnect: true, refetchOnMountOrArgChange: true })
    const [createReport, reportState] = useCreateAutoCareChatReportMutation()
    const [deleteChatMessage] = useDeleteAutoCareChatMessageMutation()
    const [message, setMessage] = useState('')
    const pendingMessage = useRef<{ key: string; body: string } | null>(null)
    const [attachmentError, setAttachmentError] = useState(false)
    const [messageError, setMessageError] = useState<unknown>(null)
    const [actionError, setActionError] = useState<string | null>(null)
    const [reportingMessage, setReportingMessage] = useState<AutoCareServiceMessage | null>(null)
    const [reportCategory, setReportCategory] = useState<'harassment' | 'threat' | 'fraud' | 'other'>('harassment')
    const [reportDescription, setReportDescription] = useState('')
    const [reportValidationError, setReportValidationError] = useState(false)
    const [currentTime, setCurrentTime] = useState<number | null>(null)
    const [hiddenMessageState, setHiddenMessageState] = useState(() => ({ userId: user?.id, messageIds: readHiddenChatMessages(user?.id) }))
    const hiddenMessageIds = hiddenMessageState.userId === user?.id ? hiddenMessageState.messageIds : emptyHiddenMessages
    const ownReportItems = ownReports.data?.items ?? emptyChatReports
    const hasPendingReportByViewer = ownReportItems.some((report) => report.messageId !== null && report.status === 'pending')
    const moderationReviewActive = Boolean(data?.moderationReviewActive || hasPendingReportByViewer)
    const messagesProtected = Boolean(data?.messagesProtected || hasPendingReportByViewer)
    useEffect(() => {
        if (isLoading || isUninitialized) return
        if (!readOnly) void markRead(chatId)
        return connectAutoCareChat(chatId, () => {
            try {
                void refetch()
            } catch {
                // A realtime event can race query teardown; keep it from
                // turning an otherwise recoverable chat update into a route error.
            }
            if (!readOnly) void markRead(chatId)
        }, emergencyReason)
    }, [chatId, emergencyReason, isLoading, isUninitialized, markRead, readOnly, refetch])
    const messages = messageState.items
    useEffect(() => {
        const timer = window.setTimeout(() => setHiddenMessageState({ userId: user?.id, messageIds: readHiddenChatMessages(user?.id) }), 0)
        return () => window.clearTimeout(timer)
    }, [user?.id])
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
        if (!data) return
        dispatchMessages({ chatId, pageKey: beforeCursor ?? 'latest', messages: data.messages })
    }, [beforeCursor, chatId, data])
    const submit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const body = message.trim()
        if (!body) return

        setMessageError(null)
        const pending = pendingMessage.current?.body === body
            ? pendingMessage.current
            : { key: crypto.randomUUID(), body }
        pendingMessage.current = pending
        try {
            await sendMessage({ chatId, body, idempotencyKey: pending.key }).unwrap()
            setMessage('')
            pendingMessage.current = null
        } catch (error) {
            // Keep the draft in place so a transient API failure can be retried.
            setMessageError(error)
        }
    }
    const upload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        const validation = validateChatAttachment(file)
        if (!file || !validation.valid) {
            setAttachmentError(true)
            event.target.value = ''
            return
        }
        setAttachmentError(false)
        try {
            await uploadAttachment({ chatId, fileName: file.name, contentType: validation.contentType, size: file.size, contentBase64: await readFileAsBase64(file) }).unwrap()
        } catch {
            setAttachmentError(true)
        } finally {
            event.target.value = ''
        }
    }
    const copyMessage = async (body: string) => {
        try {
            await navigator.clipboard.writeText(body)
            setActionError(null)
        } catch {
            setActionError(t('autocare.chatCopyError'))
        }
    }
    const hideMessageForMe = (messageId: string) => {
        const next = new Set(hiddenMessageIds)
        next.add(messageId)
        const bounded = new Set(Array.from(next).slice(-maxHiddenChatMessages))
        setHiddenMessageState({ userId: user?.id, messageIds: bounded })
        writeHiddenChatMessages(user?.id, bounded)
    }
    const removeMessageForEveryone = async (messageId: string) => {
        try {
            setActionError(null)
            await deleteChatMessage({ chatId, messageId }).unwrap()
            void refetch()
        } catch (error) {
            setActionError(getChatErrorMessage(error, t('autocare.chatDeleteError')))
        }
    }
    const submitReport = async () => {
        if (!reportingMessage) return
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
            setActionError(getChatErrorMessage(error, t('autocare.chatReportError')))
        }
    }
    if (readOnly && grantState === 'checking') return <ChatConversationSkeleton label={t('common.loading')} />
    if (readOnly && (!canRead || isError)) return <section role="alert" className="rounded-[var(--radius-panel)] border border-border bg-card p-6"><p className="text-sm font-bold text-muted-foreground">{t(canRead ? 'autocare.chatReadError' : 'autocare.chatReadAccessExpired')}</p>{canRead && <button type="button" onClick={() => void refetch()} className="mt-3 rounded-[var(--radius-control)] border border-border px-3 py-2 text-xs font-black text-foreground">{t('common.retry')}</button>}</section>
    if (isLoading) return <ChatConversationSkeleton label={t('common.loading')} />
    if (isError && !data) return <section className="rounded-[var(--radius-panel)] border border-border bg-card p-6"><p role="alert" className="text-sm font-bold text-destructive">{t('autocare.chatReadError')}</p><button type="button" onClick={() => void refetch()} className="mt-3 rounded-[var(--radius-control)] border border-border px-3 py-2 text-xs font-black text-foreground">{t('common.retry')}</button></section>
    return <><section className="flex min-h-[620px] flex-col overflow-hidden rounded-[var(--radius-panel)] border border-border bg-card shadow-sm">{readOnly ? <p className="border-b border-border bg-secondary/50 px-4 py-2 text-xs font-semibold text-muted-foreground" role="note">{emergencyReason ? t('autocare.chatEmergencyReadNotice') : t('autocare.chatModeratorReadOnly')}</p> : null}<header className="flex items-center justify-between border-b border-border px-5 py-4"><div className="flex min-w-0 items-center gap-3"><span className="flex size-10 items-center justify-center rounded-[var(--radius-control)] bg-primary/10 text-primary"><Wrench className="size-4" /></span><div className="min-w-0"><h2 className="truncate text-sm font-black text-foreground">{data?.thread.subject ?? t('autocare.chatWorkspaceGeneral')}</h2><p className="text-[11px] font-semibold text-muted-foreground">{data?.thread.providerName ?? t('autocare.chatWorkspaceGeneral')}</p></div></div><span className="text-[11px] font-bold text-status-success-foreground">● {t('autocare.chatOnline')}</span></header>{actionError && !readOnly ? <p role="alert" className="border-b border-destructive/20 bg-destructive/5 px-4 py-2 text-xs font-bold text-destructive">{actionError}</p> : null}{moderationReviewActive && !readOnly ? <p role="status" className="border-b border-border bg-status-warning-surface px-4 py-2 text-xs font-semibold text-status-warning-foreground">{t('autocare.chatReportPendingActionsNotice')}</p> : messagesProtected && !readOnly ? <p role="status" className="border-b border-border bg-status-warning-surface px-4 py-2 text-xs font-semibold text-status-warning-foreground">{t('autocare.chatEvidencePreservedNotice')}</p> : null}<div className="flex-1 space-y-3 overflow-y-auto bg-secondary/50 p-5">{data?.previousCursor ? <button type="button" onClick={() => setBeforeCursor(data.previousCursor ?? undefined)} disabled={isFetching} className="mx-auto flex h-8 items-center rounded-[var(--radius-control)] border border-border bg-card px-3 text-xs font-black text-primary disabled:opacity-60">{isFetching ? t('autocare.chatLoading') : t('autocare.chatLoadOlder')}</button> : null}{messages.length === 0 ? <p className="text-center text-sm text-muted-foreground">{t('autocare.chatEmpty')}</p> : messages.map((item) => {
        const own = item.senderId === user?.id
        const reportStatus = ownReportItems.find((report) => report.messageId === item.id)
        const allowDelete = own && item.kind === 'text' && currentTime !== null && currentTime - Date.parse(item.createdAt) >= 0 && currentTime - Date.parse(item.createdAt) <= 5 * 60_000 && !messagesProtected && !reportStatus
        const allowActions = !readOnly && !ownReports.isLoading && item.kind === 'text' && Boolean(item.body)
        return hiddenMessageIds.has(item.id) ? null : <GenericChatMessage key={item.id} item={item} own={own} locale={locale} allowActions={allowActions} allowDelete={allowDelete} allowReport={!moderationReviewActive} reportStatus={reportStatus} t={t} onCopy={() => void copyMessage(item.body ?? '')} onDelete={() => void removeMessageForEveryone(item.id)} onHide={() => hideMessageForMe(item.id)} onReport={() => { setReportingMessage(item); setReportCategory('harassment'); setReportDescription(''); setReportValidationError(false) }} />
    })}{data?.attachments.length ? <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{data.attachments.map((attachment) => <PrivateChatAttachmentImage key={attachment.id} chatId={chatId} attachmentId={attachment.id} alt={t('autocare.chatDescription')} emergencyReason={emergencyReason} />)}</div> : null}</div><form hidden={readOnly} className="flex items-end gap-2 border-t border-border p-4" onSubmit={(event) => void submit(event)}><label aria-label={t('autocare.chatAttachFile')} className="inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-control)] border border-border text-muted-foreground hover:border-primary hover:text-primary has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60"><Paperclip className="size-4" /><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void upload(event)} disabled={sendState.isLoading || uploadState.isLoading} aria-invalid={attachmentError} aria-describedby={attachmentError ? 'genericChatActionError' : undefined} className="sr-only" /></label><textarea rows={2} value={message} onChange={(event) => { setMessageError(null); setMessage(event.target.value) }} placeholder={t('autocare.chatPlaceholder')} aria-invalid={Boolean(messageError) || undefined} aria-describedby={messageError ? 'genericChatActionError' : undefined} className="min-h-10 min-w-0 flex-1 resize-none rounded-[var(--radius-control)] border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/40" /><button type="submit" disabled={sendState.isLoading || !message.trim()} aria-label={t('autocare.chatSend')} className="inline-flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-primary text-primary-foreground disabled:opacity-50"><Send className="size-4" /></button></form>{!readOnly && (attachmentError || Boolean(messageError)) && <p id="genericChatActionError" role="alert" className="border-t border-destructive/20 bg-destructive/5 px-4 py-2 text-[11px] font-bold text-destructive">{messageError ? getChatErrorMessage(messageError, t('autocare.chatSendError')) : t('autocare.chatUploadError')}</p>}{!readOnly && <p className="border-t border-border px-4 py-2 text-[10px] text-muted-foreground">{uploadState.isLoading ? t('autocare.chatUploading') : t('autocare.chatAttachmentHint')}</p>}</section><ConfirmDialog isOpen={Boolean(reportingMessage)} title={t('autocare.chatReportConfirmTitle')} description={t('autocare.chatReportConfirmDescription')} confirmLabel={t('autocare.chatReportConfirmSubmit')} loadingLabel={t('autocare.chatReportSending')} isLoading={reportState.isLoading} confirmVariant="destructive" onCancel={() => { setReportingMessage(null); setReportValidationError(false) }} onConfirm={() => void submitReport()}>{reportingMessage ? <div className="grid gap-3"><p className="rounded-[var(--radius-control)] border border-border bg-background p-3 text-sm text-foreground">{reportingMessage.body}</p><label className="grid gap-1 text-xs font-bold text-foreground"><span>{t('autocare.chatReportCategory')}</span><select value={reportCategory} onChange={(event) => { if (isChatReportCategory(event.target.value)) { setReportCategory(event.target.value); setReportValidationError(false) } }} className="h-10 rounded-[var(--radius-control)] border border-border bg-background px-3"><option value="harassment">{t('autocare.chatReportCategoryHarassment')}</option><option value="threat">{t('autocare.chatReportCategoryThreat')}</option><option value="fraud">{t('autocare.chatReportCategoryFraud')}</option><option value="other">{t('autocare.chatReportCategoryOther')}</option></select></label><label className="grid gap-1 text-xs font-bold text-foreground"><span>{t('autocare.chatReportDetails')}</span><textarea maxLength={2000} rows={3} value={reportDescription} onChange={(event) => { setReportDescription(event.target.value); setReportValidationError(false) }} aria-invalid={reportValidationError || undefined} className="rounded-[var(--radius-control)] border border-border bg-background p-3 text-sm font-normal" /></label>{reportValidationError ? <p role="alert" className="text-xs font-bold text-destructive">{t('autocare.chatReportThreatDetailsRequired')}</p> : null}</div> : null}</ConfirmDialog></>
}

function GenericChatMessage({ item, own, locale, allowActions, allowDelete, allowReport, reportStatus, t, onCopy, onDelete, onHide, onReport }: {
    item: AutoCareServiceMessage
    own: boolean
    locale: string
    allowActions: boolean
    allowDelete: boolean
    allowReport: boolean
    reportStatus?: AutoCareChatReport
    t: (key: TranslationKey) => string
    onCopy: () => void
    onDelete: () => void
    onHide: () => void
    onReport: () => void
}) {
    const actionButton = useRef<HTMLButtonElement | null>(null)
    const holdTimer = useRef<number | null>(null)
    const visibleActions = allowActions && !item.deletedAt
    const actions = visibleActions ? [
        { label: t('autocare.chatCopy'), value: 'copy', icon: <Copy className="size-4" /> },
        ...(own ? allowDelete
            ? [{ label: t('autocare.chatDeleteForEveryone'), value: 'delete', icon: <Trash2 className="size-4" /> }]
            : [{ label: t('autocare.chatHideForMe'), value: 'hide', icon: <EyeOff className="size-4" /> }]
            : allowReport ? [{ label: t('autocare.chatReportAction'), value: 'report', icon: <Flag className="size-4" /> }] : []),
    ] : []
    const cancelHold = () => {
        if (holdTimer.current !== null) window.clearTimeout(holdTimer.current)
        holdTimer.current = null
    }
    const openActions = (event: ReactMouseEvent<HTMLElement> | ReactKeyboardEvent<HTMLElement>) => {
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
    const status = reportStatus?.status === 'pending'
        ? reportStatus.assignedModeratorId ? t('autocare.chatReportAssigned') : t('autocare.chatReportReceived')
        : reportStatus?.status === 'resolved' ? t('autocare.chatReportResolved') : reportStatus?.status === 'dismissed' ? t('autocare.chatReportDismissed') : null

    return <div className={`flex ${own ? 'justify-end' : 'justify-start'}`} onContextMenu={visibleActions ? openActions : undefined} onPointerDown={(event) => {
        if (!visibleActions || event.pointerType !== 'touch') return
        cancelHold()
        holdTimer.current = window.setTimeout(() => actionButton.current?.click(), 550)
    }} onPointerMove={cancelHold} onPointerUp={cancelHold} onPointerCancel={cancelHold} onKeyDown={(event) => {
        if ((event.shiftKey && event.key === 'F10' || event.key === 'ContextMenu') && visibleActions) openActions(event)
    }}>
        <article tabIndex={visibleActions ? 0 : undefined} aria-label={visibleActions ? t('autocare.chatMessageActionsHint') : undefined} className={`max-w-[82%] rounded-[var(--radius-card)] border px-4 py-3 text-sm shadow-sm ${own ? 'border-primary/20 bg-primary text-primary-foreground' : 'border-border bg-background text-foreground'}`}>
            <div className="mb-1 flex items-center gap-2 text-[10px] font-bold opacity-70">{formatChatDate(item.createdAt, locale)}{item.readAt ? ' · ✓✓' : ' · ✓'}{visibleActions ? <Dropdown items={actions} onSelect={selectAction} align="right" className="ml-auto" trigger={(triggerProps) => <button {...triggerProps} ref={actionButton} type="button" aria-label={t('autocare.chatMessageActions')} className="inline-flex size-7 items-center justify-center rounded-[var(--radius-control)] text-current hover:bg-current/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onContextMenu={openActions} onKeyDown={(event) => {
                triggerProps.onKeyDown(event)
                if ((event.shiftKey && event.key === 'F10') || event.key === 'ContextMenu') openActions(event)
            }}><MoreHorizontal className="size-4" /></button>} /> : null}</div>
            {item.deletedAt ? <p className="italic opacity-75">{t('autocare.chatMessageDeleted')}</p> : <p className="whitespace-pre-wrap leading-6">{item.body}</p>}
            {status ? <p role="status" className="mt-2 text-[10px] font-bold opacity-80">{status}</p> : null}
        </article>
    </div>
}

function isChatReportCategory(value: string): value is 'harassment' | 'threat' | 'fraud' | 'other' {
    return value === 'harassment' || value === 'threat' || value === 'fraud' || value === 'other'
}

function PrivateChatAttachmentImage({ chatId, attachmentId, alt, emergencyReason }: { chatId: string; attachmentId: string; alt: string; emergencyReason?: string }) {
    const { data: objectUrl } = useGetAutoCareAttachmentObjectUrlQuery({ channel: 'chat', chatId, attachmentId, ...(emergencyReason ? { emergencyReason } : {}) }, { refetchOnMountOrArgChange: true })
    return <img src={objectUrl} alt={alt} className="aspect-[4/3] w-full rounded-[var(--radius-control)] object-cover" loading="lazy" />
}

type ConversationMessagesState = { chatId: string; pages: Map<string, AutoCareServiceMessage[]>; items: AutoCareServiceMessage[] }
type ConversationMessagesAction = { chatId: string; pageKey: string; messages: AutoCareServiceMessage[] }
function conversationMessagesReducer(state: ConversationMessagesState, action: ConversationMessagesAction): ConversationMessagesState {
    const pages = action.chatId === state.chatId ? new Map(state.pages) : new Map<string, AutoCareServiceMessage[]>()
    pages.set(action.pageKey, action.messages)
    const items = Array.from(new Map(Array.from(pages.values()).flat().map((item) => [item.id, item])).values()).sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id))
    return { chatId: action.chatId, pages, items }
}

function readFileAsBase64(file: File) { return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1] ?? ''); reader.onerror = () => reject(reader.error); reader.readAsDataURL(file) }) }

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

function QuickChatAction({ role, onCreate, t }: { role: string; onCreate: (type: 'support' | 'admin_escalation') => void; t: (key: TranslationKey) => string }) {
    if (role === 'owner' || role === 'client') return <button type="button" onClick={() => onCreate('support')} className="mx-auto mt-4 inline-flex h-10 items-center gap-2 rounded-[var(--radius-control)] bg-primary px-4 text-xs font-black text-primary-foreground"><Plus className="size-4" />{t('autocare.chatWorkspaceSupport')}</button>
    if (role === 'admin') return <button type="button" onClick={() => onCreate('admin_escalation')} className="mx-auto mt-4 inline-flex h-10 items-center gap-2 rounded-[var(--radius-control)] bg-primary px-4 text-xs font-black text-primary-foreground"><Plus className="size-4" />{t('autocare.chatWorkspaceEscalate')}</button>
    return <a href={ROUTES.serviceDiscovery} className="mx-auto mt-4 inline-flex h-10 items-center gap-2 rounded-[var(--radius-control)] bg-primary px-4 text-xs font-black text-primary-foreground">{t('navigation.services')}</a>
}

function readEmergencyReason(value: unknown): string | undefined {
    if (typeof value !== 'object' || value === null || !('emergencyReason' in value)) return undefined
    const reason = value.emergencyReason
    return typeof reason === 'string' && reason.trim().length >= 10 ? reason.trim() : undefined
}
