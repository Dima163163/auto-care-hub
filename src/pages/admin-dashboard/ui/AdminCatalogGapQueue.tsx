import { useState } from 'react'
import { Check, FilePlus2, X } from 'lucide-react'

import { useDecideAdminCatalogGapRequestMutation, useGetAdminCatalogGapRequestsQuery, useGetAutoCareServiceDefinitionsQuery, useUpdateAdminAutoCareServiceDefinitionMutation, type AutoCareApiServiceDefinition, type AutoCareCatalogGapRequest } from '@/entities/automotive-service'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { useTranslation } from '@/shared/lib/useTranslation'
import { RetryButton } from '@/shared/ui/query-refresh-error'
import { StateCard } from '@/shared/ui/state-card'

type CatalogCopy = {
    title: string
    description: string
    empty: string
    loading: string
    error: string
    approve: string
    reject: string
    reason: string
    saved: string
    placeholder: string
    editorTitle: string
    editorDescription: string
    category: string
    labelRu: string
    labelEn: string
    priceType: string
    active: string
    save: string
    saving: string
    savedDefinition: string
    notProvided: string
    priceTypeFixed: string
    priceTypeFrom: string
    priceTypeRange: string
    priceTypeQuoteRequired: string
}

export function AdminCatalogGapQueue({ locale }: { locale: string }) {
    const { t } = useTranslation()
    const text: CatalogCopy = {
        title: t('adminCatalogGapQueue.title'),
        description: t('adminCatalogGapQueue.description'),
        empty: t('adminCatalogGapQueue.empty'),
        loading: t('adminCatalogGapQueue.loading'),
        error: t('adminCatalogGapQueue.error'),
        approve: t('adminCatalogGapQueue.approve'),
        reject: t('adminCatalogGapQueue.reject'),
        reason: t('adminCatalogGapQueue.reason'),
        saved: t('adminCatalogGapQueue.saved'),
        placeholder: t('adminCatalogGapQueue.placeholder'),
        editorTitle: t('adminCatalogGapQueue.editorTitle'),
        editorDescription: t('adminCatalogGapQueue.editorDescription'),
        category: t('adminCatalogGapQueue.category'),
        labelRu: t('adminCatalogGapQueue.labelRu'),
        labelEn: t('adminCatalogGapQueue.labelEn'),
        priceType: t('adminCatalogGapQueue.priceType'),
        active: t('adminCatalogGapQueue.active'),
        save: t('adminCatalogGapQueue.save'),
        saving: t('adminCatalogGapQueue.saving'),
        savedDefinition: t('adminCatalogGapQueue.savedDefinition'),
        notProvided: t('common.notProvided'),
        priceTypeFixed: t('adminCatalogGapQueue.priceTypeFixed'),
        priceTypeFrom: t('adminCatalogGapQueue.priceTypeFrom'),
        priceTypeRange: t('adminCatalogGapQueue.priceTypeRange'),
        priceTypeQuoteRequired: t('adminCatalogGapQueue.priceTypeQuoteRequired'),
    }
    const query = useGetAdminCatalogGapRequestsQuery({ status: 'pending' })
    const definitions = useGetAutoCareServiceDefinitionsQuery()
    const [decide, state] = useDecideAdminCatalogGapRequestMutation()
    const [reasonById, setReasonById] = useState<Record<string, string>>({})
    const [savedId, setSavedId] = useState<string | null>(null)
    const [decisionError, setDecisionError] = useState<unknown>(null)
    const decideItem = async (item: AutoCareCatalogGapRequest, status: 'approved' | 'rejected') => {
        setDecisionError(null)
        try {
            await decide({ id: item.id, status, reason: reasonById[item.id] || null }).unwrap()
            setSavedId(item.id)
        } catch (error) {
            setSavedId(null)
            setDecisionError(error)
        }
    }
    if (query.isLoading) return <StateCard variant="loading" title={text.loading} />
    if (query.error) return <StateCard variant="error" title={text.error} description={getApiErrorMessage(query.error, text.error)} action={<RetryButton onRetry={query.refetch} label={t('common.retry')} />} />
    const items = query.data ?? []
    return <div className="space-y-5"><section id="admin-catalog-gap-queue" className="scroll-mt-24 rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm"><div><h2 className="flex items-center gap-2 text-lg font-black text-foreground"><FilePlus2 className="size-5 text-primary" />{text.title}</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">{text.description}</p></div>{decisionError !== null && <div role="alert" className="mt-5 rounded-[var(--radius-card)] border border-destructive/30 bg-destructive/5 p-4 text-sm font-semibold text-destructive">{getApiErrorMessage(decisionError, text.error)}</div>}{!items.length ? <p className="mt-5 rounded-[var(--radius-card)] bg-secondary p-4 text-sm text-muted-foreground">{text.empty}</p> : <div className="mt-5 space-y-3">{items.map((item) => <CatalogGapCard key={item.id} item={item} locale={locale} reason={reasonById[item.id] ?? ''} onReason={(value) => setReasonById((current) => ({ ...current, [item.id]: value }))} onDecide={(status) => decideItem(item, status)} text={text} isSaving={state.isLoading} saved={savedId === item.id} />)}</div>}</section><ServiceDefinitionEditor definitions={definitions.data ?? []} isLoading={definitions.isLoading} text={text} /></div>
}

function ServiceDefinitionEditor({ definitions, isLoading, text }: { definitions: AutoCareApiServiceDefinition[]; isLoading: boolean; text: CatalogCopy }) {
    if (isLoading) return <StateCard variant="loading" title={text.loading} />
    return <section className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm"><h2 className="text-lg font-black text-foreground">{text.editorTitle}</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">{text.editorDescription}</p><div className="mt-5 grid gap-3 lg:grid-cols-2">{definitions.map((definition) => <ServiceDefinitionCard key={definition.id} definition={definition} text={text} />)}</div></section>
}

function ServiceDefinitionCard({ definition, text }: { definition: AutoCareApiServiceDefinition; text: CatalogCopy }) {
    const [update, state] = useUpdateAdminAutoCareServiceDefinitionMutation()
    const [categorySlug, setCategorySlug] = useState(definition.categorySlug)
    const [labelRu, setLabelRu] = useState(definition.labels.ru ?? '')
    const [labelEn, setLabelEn] = useState(definition.labels.en ?? '')
    const [priceType, setPriceType] = useState(definition.priceType)
    const [active, setActive] = useState(definition.active)
    const save = () => { void update({ id: definition.id, categorySlug: categorySlug.trim(), labels: { ...definition.labels, ru: labelRu.trim(), en: labelEn.trim() }, priceType, comparisonAttributes: definition.comparisonAttributes, active }) }
    return <article className="rounded-[var(--radius-card)] border border-border bg-background p-4"><div className="flex items-center justify-between gap-3"><div><p className="font-black text-foreground">{definition.slug}</p><p className="mt-1 text-xs text-muted-foreground">{definition.comparisonAttributes.join(' · ') || text.notProvided}</p></div><label className="flex items-center gap-2 text-xs font-bold text-muted-foreground"><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />{text.active}</label></div><div className="mt-3 grid gap-2 sm:grid-cols-2"><label className="text-xs font-bold text-muted-foreground">{text.category}<input value={categorySlug} onChange={(event) => setCategorySlug(event.target.value)} className="mt-1 h-9 w-full rounded-[var(--radius-control)] border border-border bg-card px-2 text-sm text-foreground" /></label><label className="text-xs font-bold text-muted-foreground">{text.priceType}<select value={priceType} onChange={(event) => setPriceType(event.target.value as typeof priceType)} className="mt-1 h-9 w-full rounded-[var(--radius-control)] border border-border bg-card px-2 text-sm text-foreground"><option value="fixed">{text.priceTypeFixed}</option><option value="from">{text.priceTypeFrom}</option><option value="range">{text.priceTypeRange}</option><option value="quote_required">{text.priceTypeQuoteRequired}</option></select></label><label className="text-xs font-bold text-muted-foreground">{text.labelRu}<input value={labelRu} onChange={(event) => setLabelRu(event.target.value)} className="mt-1 h-9 w-full rounded-[var(--radius-control)] border border-border bg-card px-2 text-sm text-foreground" /></label><label className="text-xs font-bold text-muted-foreground">{text.labelEn}<input value={labelEn} onChange={(event) => setLabelEn(event.target.value)} className="mt-1 h-9 w-full rounded-[var(--radius-control)] border border-border bg-card px-2 text-sm text-foreground" /></label></div><div className="mt-3 flex items-center gap-3"><button type="button" onClick={save} disabled={state.isLoading} className="inline-flex h-9 items-center rounded-[var(--radius-control)] bg-primary px-3 text-xs font-black text-primary-foreground disabled:opacity-50">{state.isLoading ? text.saving : text.save}</button>{state.isSuccess && <span className="text-xs font-bold text-status-success-foreground">{text.savedDefinition}</span>}{state.error && <span role="alert" className="text-xs font-bold text-destructive">{text.error}</span>}</div></article>
}

function CatalogGapCard({ item, locale, reason, onReason, onDecide, text, isSaving, saved }: { item: AutoCareCatalogGapRequest; locale: string; reason: string; onReason: (value: string) => void; onDecide: (status: 'approved' | 'rejected') => Promise<void>; text: CatalogCopy; isSaving: boolean; saved: boolean }) {
    const label = locale === 'ru' ? item.labels.ru ?? item.labels.en ?? item.proposedSlug : item.labels.en ?? item.labels.ru ?? item.proposedSlug
    return <article className="rounded-[var(--radius-card)] border border-border bg-background p-4"><div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between"><div><p className="font-black text-foreground">{label}</p><p className="mt-1 text-xs text-muted-foreground">{item.categorySlug} · {item.priceType}</p></div><span className="rounded-full bg-secondary px-2 py-1 text-[11px] font-black text-muted-foreground">{item.proposedSlug}</span></div><p className="mt-3 text-sm leading-6 text-muted-foreground">{item.rationale}</p><label className="mt-3 block text-xs font-black text-foreground"><span className="mb-1 block">{text.reason}</span><input value={reason} onChange={(event) => onReason(event.target.value)} placeholder={text.placeholder} className="h-9 w-full rounded-[var(--radius-control)] border border-border bg-card px-3 text-sm font-normal text-foreground outline-none focus:border-primary" /></label><div className="mt-3 flex flex-wrap items-center gap-2"><button type="button" disabled={isSaving} onClick={() => void onDecide('approved')} className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-control)] bg-primary px-3 text-xs font-black text-primary-foreground disabled:opacity-50"><Check className="size-3.5" />{text.approve}</button><button type="button" disabled={isSaving} onClick={() => void onDecide('rejected')} className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-control)] border border-border px-3 text-xs font-black text-foreground hover:border-destructive hover:text-destructive disabled:opacity-50"><X className="size-3.5" />{text.reject}</button>{saved && <span role="status" className="text-xs font-bold text-status-success-foreground">{text.saved}</span>}</div></article>
}
