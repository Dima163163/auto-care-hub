import { useState } from 'react'
import { Check, FilePlus2, X } from 'lucide-react'

import { useDecideAdminCatalogGapRequestMutation, useGetAdminCatalogGapRequestsQuery, type AutoCareCatalogGapRequest } from '@/entities/automotive-service'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { RetryButton } from '@/shared/ui/query-refresh-error'
import { StateCard } from '@/shared/ui/state-card'

type Copy = { title: string; description: string; empty: string; loading: string; error: string; approve: string; reject: string; reason: string; saved: string; placeholder: string }
const copy: Record<'ru' | 'en', Copy> = { ru: { title: 'Очередь новых услуг', description: 'Проверяйте предложения от владельцев перед добавлением в общий каталог.', empty: 'Новых предложений нет.', loading: 'Загрузка очереди…', error: 'Не удалось загрузить очередь.', approve: 'Добавить в каталог', reject: 'Отклонить', reason: 'Причина решения', saved: 'Решение сохранено', placeholder: 'Укажите причину (необязательно)' }, en: { title: 'New service definitions', description: 'Review owner proposals before adding them to the shared catalogue.', empty: 'No new proposals.', loading: 'Loading queue…', error: 'Could not load the queue.', approve: 'Add to catalogue', reject: 'Reject', reason: 'Decision reason', saved: 'Decision saved', placeholder: 'Optional reason' } }

export function AdminCatalogGapQueue({ locale }: { locale: string }) {
    const text = locale === 'ru' ? copy.ru : copy.en
    const query = useGetAdminCatalogGapRequestsQuery({ status: 'pending' })
    const [decide, state] = useDecideAdminCatalogGapRequestMutation()
    const [reasonById, setReasonById] = useState<Record<string, string>>({})
    const [savedId, setSavedId] = useState<string | null>(null)
    if (query.isLoading) return <StateCard variant="loading" title={text.loading} />
    if (query.error) return <StateCard variant="error" title={text.error} description={getApiErrorMessage(query.error, text.error)} action={<RetryButton onRetry={query.refetch} label="Retry" />} />
    const items = query.data ?? []
    return <section className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm"><div><h2 className="flex items-center gap-2 text-lg font-black text-foreground"><FilePlus2 className="size-5 text-primary" />{text.title}</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">{text.description}</p></div>{!items.length ? <p className="mt-5 rounded-[var(--radius-card)] bg-secondary p-4 text-sm text-muted-foreground">{text.empty}</p> : <div className="mt-5 space-y-3">{items.map((item) => <CatalogGapCard key={item.id} item={item} reason={reasonById[item.id] ?? ''} onReason={(value) => setReasonById((current) => ({ ...current, [item.id]: value }))} onDecide={async (status) => { await decide({ id: item.id, status, reason: reasonById[item.id] || null }); setSavedId(item.id) }} text={text} isSaving={state.isLoading} saved={savedId === item.id} />)}</div>}</section>
}

function CatalogGapCard({ item, reason, onReason, onDecide, text, isSaving, saved }: { item: AutoCareCatalogGapRequest; reason: string; onReason: (value: string) => void; onDecide: (status: 'approved' | 'rejected') => Promise<void>; text: typeof copy.ru; isSaving: boolean; saved: boolean }) {
    return <article className="rounded-[var(--radius-card)] border border-border bg-background p-4"><div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between"><div><p className="font-black text-foreground">{item.labels.ru ?? item.labels.en ?? item.proposedSlug}</p><p className="mt-1 text-xs text-muted-foreground">{item.categorySlug} · {item.priceType}</p></div><span className="rounded-full bg-secondary px-2 py-1 text-[11px] font-black text-muted-foreground">{item.proposedSlug}</span></div><p className="mt-3 text-sm leading-6 text-muted-foreground">{item.rationale}</p><label className="mt-3 block text-xs font-black text-foreground"><span className="mb-1 block">{text.reason}</span><input value={reason} onChange={(event) => onReason(event.target.value)} placeholder={text.placeholder} className="h-9 w-full rounded-[var(--radius-control)] border border-border bg-card px-3 text-sm font-normal text-foreground outline-none focus:border-primary" /></label><div className="mt-3 flex flex-wrap items-center gap-2"><button type="button" disabled={isSaving} onClick={() => void onDecide('approved')} className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-control)] bg-primary px-3 text-xs font-black text-primary-foreground disabled:opacity-50"><Check className="size-3.5" />{text.approve}</button><button type="button" disabled={isSaving} onClick={() => void onDecide('rejected')} className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-control)] border border-border px-3 text-xs font-black text-foreground hover:border-destructive hover:text-destructive disabled:opacity-50"><X className="size-3.5" />{text.reject}</button>{saved && <span role="status" className="text-xs font-bold text-status-success-foreground">{text.saved}</span>}</div></article>
}
