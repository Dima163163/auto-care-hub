import { useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'

import type { AutoCareApiProvider } from '@/entities/automotive-service'
import { readFormDraft } from '@/shared/lib/form-draft'
import { useFormDraft } from '@/shared/lib/useFormDraft'
import { FormDraftNotice } from '@/shared/ui/form-draft-notice/FormDraftNotice'

import { parseOwnerProviderProfileDraft, type OwnerProviderProfileDraftText } from './owner-provider-profile-draft'

type Props = {
    provider: AutoCareApiProvider
    locale: string
    disabled: boolean
    onSubmit: (payload: Record<string, unknown>) => Promise<void>
}

const copy = {
    ru: {
        title: 'Изменить публичные данные', name: 'Название сервиса', description: 'Описание', phones: 'Телефоны через запятую', email: 'Почта сервиса', website: 'Сайт сервиса', metro: 'Метро или ориентир', warranty: 'Гарантия на работы', years: 'Лет работы', staff: 'Сотрудников', workstations: 'Постов', brands: 'Основные марки через запятую', multibrand: 'Работаем со всеми марками', documents: 'Документы и подтверждения', addDocument: 'Добавить документ', documentName: 'Название документа', documentReference: 'Приватная ссылка', documentExpiry: 'Действует до', removeDocument: 'Удалить', submit: 'Отправить изменение на проверку',
    },
    en: {
        title: 'Change public details', name: 'Service name', description: 'Description', phones: 'Phones separated by commas', email: 'Service email', website: 'Service website', metro: 'Metro or landmark', warranty: 'Work warranty', years: 'Years in business', staff: 'Staff members', workstations: 'Workstations', brands: 'Primary brands separated by commas', multibrand: 'We work with all brands', documents: 'Documents and evidence', addDocument: 'Add document', documentName: 'Document name', documentReference: 'Private reference', documentExpiry: 'Expires on', removeDocument: 'Remove', submit: 'Submit change for review',
    },
} as const

const numberOrZero = (value: FormDataEntryValue | null) => Math.max(0, Number.parseInt(String(value ?? '0'), 10) || 0)
const strings = (value: FormDataEntryValue | null) => [...new Set(String(value ?? '').split(',').map((item) => item.trim()).filter(Boolean))]

export function OwnerProviderProfileChangeForm({ provider, locale, disabled, onSubmit }: Props) {
    const text = locale === 'ru' ? copy.ru : copy.en
    const formRef = useRef<HTMLFormElement>(null)
    const storageKey = `autocare-owner-profile-change:${provider.id}`
    const initialDraft = useMemo(() => readFormDraft(storageKey, parseOwnerProviderProfileDraft), [storageKey])
    const initialText: OwnerProviderProfileDraftText = initialDraft?.text ?? {
        name: provider.name,
        description: provider.description ?? '',
        websiteUrl: provider.websiteUrl ?? '',
        metroStation: provider.metroStation ?? '',
        warrantyText: provider.warrantyText ?? '',
        yearsActive: String(provider.yearsActive),
        staffCount: String(provider.staffCount),
        workstationCount: String(provider.workstationCount ?? 0),
        brandSpecializations: provider.brandSpecializations.join(', '),
    }
    const [draftText, setDraftText] = useState<OwnerProviderProfileDraftText>(initialText)
    const [isMultibrand, setIsMultibrand] = useState(initialDraft?.isMultibrand ?? provider.isMultibrand)
    const [isDraftRestored, setIsDraftRestored] = useState(Boolean(initialDraft))
    const [isDirty, setIsDirty] = useState(false)
    const [documents, setDocuments] = useState<number[]>([])
    const nextDocumentId = useRef(0)
    const draftSnapshot = useMemo(() => ({ text: draftText, isMultibrand }), [draftText, isMultibrand])
    const { clearDraft } = useFormDraft({
        storageKey,
        values: draftSnapshot,
        enabled: isDirty,
        parse: parseOwnerProviderProfileDraft,
    })
    const updateDraftText = <Key extends keyof OwnerProviderProfileDraftText>(key: Key, value: OwnerProviderProfileDraftText[Key]) => {
        setIsDirty(true)
        setDraftText((current) => ({ ...current, [key]: value }))
    }
    const discardDraft = () => {
        clearDraft()
        formRef.current?.reset()
        setDraftText({
            name: provider.name,
            description: provider.description ?? '',
            websiteUrl: provider.websiteUrl ?? '',
            metroStation: provider.metroStation ?? '',
            warrantyText: provider.warrantyText ?? '',
            yearsActive: String(provider.yearsActive),
            staffCount: String(provider.staffCount),
            workstationCount: String(provider.workstationCount ?? 0),
            brandSpecializations: provider.brandSpecializations.join(', '),
        })
        setIsMultibrand(provider.isMultibrand)
        setDocuments([])
        setIsDirty(false)
        setIsDraftRestored(false)
    }
    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const values = new FormData(event.currentTarget)
        const documentLabels = values.getAll('documentLabel')
        const documentReferences = values.getAll('documentReference')
        const documentExpiries = values.getAll('documentExpiresAt')
        const documentsPayload = documentLabels.map((label, index) => ({
            label: String(label).trim(),
            reference: String(documentReferences[index] ?? '').trim(),
            expiresAt: String(documentExpiries[index] ?? '').trim() || null,
        })).filter((document) => document.label && document.reference)
        await onSubmit({
            name: draftText.name.trim(),
            description: draftText.description.trim() || null,
            phones: strings(values.get('phones')),
            email: String(values.get('email') ?? '').trim() || null,
            websiteUrl: draftText.websiteUrl.trim() || null,
            metroStation: draftText.metroStation.trim() || null,
            warrantyText: draftText.warrantyText.trim() || null,
            yearsActive: numberOrZero(draftText.yearsActive),
            staffCount: numberOrZero(draftText.staffCount),
            workstationCount: numberOrZero(draftText.workstationCount),
            brandSpecializations: strings(draftText.brandSpecializations),
            isMultibrand,
            documents: documentsPayload,
        })
        clearDraft()
        setIsDirty(false)
        setIsDraftRestored(false)
    }
    const inputClass = 'mt-1.5 h-10 w-full rounded-[var(--radius-control)] border border-border bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring'

    return <form ref={formRef} onSubmit={(event) => void submit(event)} className="mt-5 grid gap-3 rounded-[var(--radius-card)] border border-border bg-background p-4 sm:grid-cols-2">
        <h3 className="sm:col-span-2 text-sm font-black text-foreground">{text.title}</h3>
        {isDraftRestored ? <div className="sm:col-span-2"><FormDraftNotice onDiscard={discardDraft} /></div> : null}
        <Label label={text.name}><input required name="name" value={draftText.name} onChange={(event) => updateDraftText('name', event.target.value)} className={inputClass} /></Label>
        <Label label={text.phones}><input name="phones" defaultValue={provider.phones.join(', ')} className={inputClass} /></Label>
        <Label label={text.email}><input name="email" type="email" defaultValue={provider.email ?? ''} className={inputClass} /></Label>
        <Label label={text.website}><input name="websiteUrl" type="url" value={draftText.websiteUrl} onChange={(event) => updateDraftText('websiteUrl', event.target.value)} className={inputClass} /></Label>
        <Label label={text.metro}><input name="metroStation" value={draftText.metroStation} onChange={(event) => updateDraftText('metroStation', event.target.value)} className={inputClass} /></Label>
        <Label label={text.warranty}><input name="warrantyText" value={draftText.warrantyText} onChange={(event) => updateDraftText('warrantyText', event.target.value)} className={inputClass} /></Label>
        <Label label={text.years}><input name="yearsActive" min="0" type="number" value={draftText.yearsActive} onChange={(event) => updateDraftText('yearsActive', event.target.value)} className={inputClass} /></Label>
        <Label label={text.staff}><input name="staffCount" min="0" type="number" value={draftText.staffCount} onChange={(event) => updateDraftText('staffCount', event.target.value)} className={inputClass} /></Label>
        <Label label={text.workstations}><input name="workstationCount" min="0" type="number" value={draftText.workstationCount} onChange={(event) => updateDraftText('workstationCount', event.target.value)} className={inputClass} /></Label>
        <Label label={text.brands}><input name="brandSpecializations" value={draftText.brandSpecializations} onChange={(event) => updateDraftText('brandSpecializations', event.target.value)} className={inputClass} /></Label>
        <label className="flex min-h-10 items-center gap-2 text-xs font-black text-foreground sm:col-span-2"><input name="isMultibrand" type="checkbox" checked={isMultibrand} onChange={(event) => { setIsDirty(true); setIsMultibrand(event.target.checked) }} />{text.multibrand}</label>
        <Label className="sm:col-span-2" label={text.description}><textarea name="description" rows={3} value={draftText.description} onChange={(event) => updateDraftText('description', event.target.value)} className="mt-1.5 w-full rounded-[var(--radius-control)] border border-border bg-card p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" /></Label>
        <section className="sm:col-span-2 rounded-[var(--radius-card)] border border-border bg-card/60 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2"><div><h4 className="text-xs font-black">{text.documents}</h4><p className="mt-1 text-[11px] font-medium text-muted-foreground">{locale === 'ru' ? 'Ссылки private:// отправляются на модерацию.' : 'private:// references are sent for moderation.'}</p></div><button type="button" disabled={documents.length >= 20} onClick={() => setDocuments((items) => [...items, nextDocumentId.current++])} className="rounded-[var(--radius-control)] border border-primary px-3 py-2 text-[11px] font-black text-primary disabled:opacity-50">{text.addDocument}</button></div>
            {documents.length > 0 && <div className="mt-3 space-y-2">{documents.map((documentId) => <div key={documentId} className="grid gap-2 sm:grid-cols-[1fr_1.3fr_150px_auto] sm:items-end"><Label label={text.documentName}><input required name="documentLabel" className={inputClass} /></Label><Label label={text.documentReference}><input required name="documentReference" pattern="^private://.*" placeholder="private://documents/..." className={inputClass} /></Label><Label label={text.documentExpiry}><input name="documentExpiresAt" type="date" className={inputClass} /></Label><button type="button" onClick={() => setDocuments((items) => items.filter((id) => id !== documentId))} className="h-10 rounded-[var(--radius-control)] px-2 text-xs font-black text-destructive hover:bg-destructive/10">{text.removeDocument}</button></div>)}</div>}
        </section>
        <button type="submit" disabled={disabled} className="inline-flex h-10 items-center justify-center rounded-[var(--radius-control)] border border-primary px-4 text-xs font-black text-primary disabled:opacity-50 sm:col-span-2">{text.submit}</button>
    </form>
}

function Label({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
    return <label className={`text-xs font-black text-foreground ${className}`}><span>{label}</span>{children}</label>
}
