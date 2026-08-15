import { useEffect, useMemo, useState } from 'react'
import { LifeBuoy, MessageCircle, Paperclip, Plus, Send, Wrench } from 'lucide-react'
import { useSearchParams } from 'react-router'

import {
    ServiceRequestChat,
    connectAutoCareChat,
    useCreateAutoCareChatMessageMutation,
    useCreateAutoCareChatAttachmentMutation,
    useCreateAutoCareChatMutation,
    useGetAutoCareChatQuery,
    useGetAutoCareChatsQuery,
    useMarkAutoCareChatReadMutation,
    type AutoCareChatThread,
} from '@/entities/automotive-service'
import { useGetMeQuery } from '@/features/auth'
import { ROUTES } from '@/shared/constants/routes'
import { API_BASE_URL } from '@/shared/config/api'
import type { TranslationKey } from '@/shared/lib/i18n'
import { useTranslation } from '@/shared/lib/useTranslation'
import { PageHeader } from '@/shared/ui/page-header'
import { ChatConversationSkeleton, SplitListSkeleton } from '@/shared/ui/loading-skeleton'

type ChatsPageProps = { workspace?: 'client' | 'owner' | 'admin' | 'super_admin' }

export function ChatsPage({ workspace }: ChatsPageProps) {
    const { t } = useTranslation()
    const { data: user } = useGetMeQuery()
    const [searchParams, setSearchParams] = useSearchParams()
    const role = workspace ?? user?.role ?? 'client'
    const { data: threads = [], isLoading } = useGetAutoCareChatsQuery()
    const [createChat, createState] = useCreateAutoCareChatMutation()
    const [selectedId, setSelectedId] = useState<string | null>(() => searchParams.get('chat'))
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

    useEffect(() => {
        if (!providerId || role !== 'client' || createState.isLoading) return
        const existing = threads.find((thread) => thread.providerId === providerId && thread.type === 'provider_inquiry')
        if (existing) {
            setSearchParams({ chat: existing.id })
            return
        }
        void createChat({ type: 'provider_inquiry', providerId, subject: t('autocare.chatWorkspaceGeneral') }).unwrap().then((thread) => {
            setSearchParams({ chat: thread.id })
        })
    }, [createChat, createState.isLoading, providerId, role, setSearchParams, t, threads])

    const selectThread = (thread: AutoCareChatThread) => {
        setSelectedId(thread.id)
        setSearchParams({ chat: thread.id })
    }

    const openSupport = () => {
        if (supportThread) {
            selectThread(supportThread)
            return
        }
        void createChat({ type: 'support', subject: t('autocare.chatWorkspaceSupportSubject') }).unwrap().then(selectThread)
    }

    if (isLoading) {
        return <main className="min-h-full bg-background px-[var(--layout-gutter)] py-7 lg:py-10"><div className="mx-auto max-w-7xl"><PageHeader eyebrow={t('autocare.chatWorkspaceEyebrow')} title={t('autocare.chatWorkspaceTitle')} description={t('autocare.chatWorkspaceDescription')} /><div className="mt-6"><SplitListSkeleton label={t('common.loading')} /></div></div></main>
    }

    return <main className="min-h-full bg-background px-[var(--layout-gutter)] py-7 lg:py-10"><div className="mx-auto max-w-7xl"><PageHeader eyebrow={t('autocare.chatWorkspaceEyebrow')} title={t('autocare.chatWorkspaceTitle')} description={t('autocare.chatWorkspaceDescription')} /><div className="mt-6 grid min-h-[620px] gap-4 lg:grid-cols-[minmax(260px,0.34fr)_minmax(0,1fr)]"><aside className="overflow-hidden rounded-[var(--radius-panel)] border border-border bg-card shadow-sm"><div className="flex items-center justify-between border-b border-border px-4 py-4"><h2 className="text-sm font-black text-foreground">{t('autocare.chatWorkspaceTitle')}</h2><span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-black text-primary">{threads.length}</span></div><div className="max-h-[600px] overflow-y-auto p-2">{canOpenSupport && <SupportThreadItem active={supportThread?.id === activeId} isLoading={createState.isLoading} unreadCount={supportThread?.unreadCount ?? 0} onSelect={openSupport} t={t} />}{orderedThreads.length === 0 && !supportThread && !canOpenSupport ? <p className="p-4 text-sm text-muted-foreground">{t('autocare.chatWorkspaceEmpty')}</p> : orderedThreads.map((thread) => <ThreadItem key={thread.id} thread={thread} active={thread.id === activeId} onSelect={() => selectThread(thread)} t={t} pinned={thread.type === 'support'} />)}</div></aside><section className="min-w-0">{activeThread?.requestId ? <ServiceRequestChat requestId={activeThread.requestId} ownerMode={role === 'owner'} /> : activeThread ? <GenericChatConversation key={activeThread.id} chatId={activeThread.id} /> : <div className="flex min-h-[620px] items-center justify-center rounded-[var(--radius-panel)] border border-dashed border-border bg-card p-8 text-center"><div><MessageCircle className="mx-auto size-9 text-primary" /><p className="mt-4 text-sm font-black text-foreground">{t('autocare.chatWorkspaceSelect')}</p><QuickChatAction role={role} onCreate={(type) => void createChat({ type, subject: type === 'support' ? t('autocare.chatWorkspaceSupportSubject') : t('autocare.chatWorkspaceEscalation') }).unwrap().then(selectThread)} t={t} /></div></div>}</section></div></div></main>
}

function SupportThreadItem({ active, isLoading, unreadCount, onSelect, t }: { active: boolean; isLoading: boolean; unreadCount: number; onSelect: () => void; t: (key: TranslationKey, params?: Record<string, string | number>) => string }) {
    return <button type="button" onClick={onSelect} disabled={isLoading} className={`mb-2 flex w-full items-center gap-3 rounded-[var(--radius-control)] border border-primary/30 p-3 text-left transition ${active ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-foreground hover:bg-primary/15'} disabled:cursor-wait disabled:opacity-70`}><span className={`flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] ${active ? 'bg-primary-foreground/15' : 'bg-primary/15 text-primary'}`}><LifeBuoy className="size-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-black">{t('autocare.chatWorkspaceSupport')}</span><span className={`mt-1 block truncate text-[10px] font-semibold ${active ? 'text-primary-foreground/75' : 'text-muted-foreground'}`}>{t('autocare.chatWorkspaceSupportHint')}</span></span>{unreadCount > 0 && <span className="rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-black text-primary-foreground">{unreadCount}</span>}</button>
}

function ThreadItem({ thread, active, onSelect, t, pinned = false }: { thread: AutoCareChatThread; active: boolean; onSelect: () => void; t: (key: TranslationKey, params?: Record<string, string | number>) => string; pinned?: boolean }) {
    const label = thread.type === 'service_request' ? t('autocare.chatWorkspaceRequest') : thread.type === 'provider_inquiry' ? t('autocare.chatWorkspaceProviderInquiry') : thread.type === 'support' ? t('autocare.chatWorkspaceSupportType') : t('autocare.chatWorkspaceEscalation')
    return <button type="button" onClick={onSelect} className={`w-full rounded-[var(--radius-control)] p-3 text-left transition ${active ? 'bg-primary/10 text-primary' : pinned ? 'bg-primary/[0.04] text-foreground hover:bg-primary/[0.08]' : 'text-foreground hover:bg-secondary'}`}><div className="flex items-start gap-3"><span className={`flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-control)] ${active ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'}`}>{pinned ? <LifeBuoy className="size-4" /> : <MessageCircle className="size-4" />}</span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-black">{thread.subject}</span><span className="mt-1 block truncate text-[10px] font-semibold text-muted-foreground">{thread.providerName ?? label}</span></span>{thread.unreadCount > 0 && <span className="rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-black text-primary-foreground">{thread.unreadCount}</span>}</div></button>
}

function GenericChatConversation({ chatId }: { chatId: string }) {
    const { t, locale } = useTranslation()
    const { data, isLoading, refetch } = useGetAutoCareChatQuery(chatId)
    const [sendMessage, sendState] = useCreateAutoCareChatMessageMutation()
    const [markRead] = useMarkAutoCareChatReadMutation()
    const [uploadAttachment, uploadState] = useCreateAutoCareChatAttachmentMutation()
    const [message, setMessage] = useState('')
    useEffect(() => {
        void markRead(chatId)
        return connectAutoCareChat(chatId, () => { void refetch(); void markRead(chatId) })
    }, [chatId, markRead, refetch])
    const messages = useMemo(() => data?.messages ?? [], [data?.messages])
    const submit = async (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!message.trim()) return; await sendMessage({ chatId, body: message.trim() }).unwrap(); setMessage('') }
    const upload = async (event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return; await uploadAttachment({ chatId, fileName: file.name, contentType: file.type as 'image/jpeg' | 'image/png' | 'image/webp', size: file.size, contentBase64: await readFileAsBase64(file) }).unwrap(); event.target.value = '' }
    if (isLoading) return <ChatConversationSkeleton label={t('common.loading')} />
    return <section className="flex min-h-[620px] flex-col overflow-hidden rounded-[var(--radius-panel)] border border-border bg-card shadow-sm"><header className="flex items-center justify-between border-b border-border px-5 py-4"><div className="flex min-w-0 items-center gap-3"><span className="flex size-10 items-center justify-center rounded-[var(--radius-control)] bg-primary/10 text-primary"><Wrench className="size-4" /></span><div className="min-w-0"><h2 className="truncate text-sm font-black text-foreground">{data?.thread.subject ?? t('common.loading')}</h2><p className="text-[11px] font-semibold text-muted-foreground">{data?.thread.providerName ?? t('autocare.chatWorkspaceGeneral')}</p></div></div><span className="text-[11px] font-bold text-status-success-foreground">● {t('autocare.chatOnline')}</span></header><div className="flex-1 space-y-3 overflow-y-auto bg-secondary/50 p-5">{isLoading ? <p className="text-sm text-muted-foreground">{t('common.loading')}</p> : messages.length === 0 ? <p className="text-center text-sm text-muted-foreground">{t('autocare.chatEmpty')}</p> : messages.map((item) => <div key={item.id} className={`max-w-[82%] rounded-[var(--radius-card)] px-4 py-3 text-sm ${item.senderId === data?.thread.clientId ? 'bg-background text-foreground' : 'ml-auto bg-primary text-primary-foreground'}`}><p>{item.body}</p><p className="mt-2 text-[10px] opacity-70">{formatChatDate(item.createdAt, locale)}{item.readAt ? ' · ✓✓' : ' · ✓'}</p></div>)}{data?.attachments.length ? <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{data.attachments.map((attachment) => <img key={attachment.id} src={attachment.url.startsWith('data:') || attachment.url.startsWith('http') ? attachment.url : `${API_BASE_URL}${attachment.url}`} alt={t('autocare.chatDescription')} className="aspect-[4/3] w-full rounded-[var(--radius-control)] object-cover" loading="lazy" />)}</div> : null}</div><form className="flex items-end gap-2 border-t border-border p-4" onSubmit={(event) => void submit(event)}><label className="inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-control)] border border-border text-muted-foreground hover:border-primary hover:text-primary"><Paperclip className="size-4" /><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void upload(event)} className="sr-only" /></label><textarea rows={2} value={message} onChange={(event) => setMessage(event.target.value)} placeholder={t('autocare.chatPlaceholder')} className="min-h-10 min-w-0 flex-1 resize-none rounded-[var(--radius-control)] border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/40" /><button type="submit" disabled={sendState.isLoading || !message.trim()} aria-label={t('autocare.chatSend')} className="inline-flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-primary text-primary-foreground disabled:opacity-50"><Send className="size-4" /></button></form><p className="border-t border-border px-4 py-2 text-[10px] text-muted-foreground">{uploadState.isLoading ? t('autocare.chatUploading') : t('autocare.chatAttachmentHint')}</p></section>
}

function readFileAsBase64(file: File) { return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1] ?? ''); reader.onerror = () => reject(reader.error); reader.readAsDataURL(file) }) }

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

function QuickChatAction({ role, onCreate, t }: { role: string; onCreate: (type: 'support' | 'admin_escalation') => void; t: (key: TranslationKey) => string }) {
    if (role === 'owner' || role === 'client') return <button type="button" onClick={() => onCreate('support')} className="mx-auto mt-4 inline-flex h-10 items-center gap-2 rounded-[var(--radius-control)] bg-primary px-4 text-xs font-black text-primary-foreground"><Plus className="size-4" />{t('autocare.chatWorkspaceSupport')}</button>
    if (role === 'admin') return <button type="button" onClick={() => onCreate('admin_escalation')} className="mx-auto mt-4 inline-flex h-10 items-center gap-2 rounded-[var(--radius-control)] bg-primary px-4 text-xs font-black text-primary-foreground"><Plus className="size-4" />{t('autocare.chatWorkspaceEscalate')}</button>
    return <a href={ROUTES.serviceDiscovery} className="mx-auto mt-4 inline-flex h-10 items-center gap-2 rounded-[var(--radius-control)] bg-primary px-4 text-xs font-black text-primary-foreground">{t('navigation.services')}</a>
}
