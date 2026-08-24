import type { FormEvent, ReactNode } from 'react'

import type { AutoCareApiProvider } from '@/entities/automotive-service'

type Props = {
    provider: AutoCareApiProvider
    locale: string
    disabled: boolean
    onSubmit: (payload: Record<string, unknown>) => Promise<void>
}

const copy = {
    ru: {
        title: 'Изменить публичные данные', name: 'Название сервиса', description: 'Описание', phones: 'Телефоны через запятую', email: 'Почта сервиса', website: 'Сайт сервиса', metro: 'Метро или ориентир', warranty: 'Гарантия на работы', years: 'Лет работы', staff: 'Сотрудников', workstations: 'Постов', brands: 'Основные марки через запятую', multibrand: 'Работаем со всеми марками', submit: 'Отправить изменение на проверку',
    },
    en: {
        title: 'Change public details', name: 'Service name', description: 'Description', phones: 'Phones separated by commas', email: 'Service email', website: 'Service website', metro: 'Metro or landmark', warranty: 'Work warranty', years: 'Years in business', staff: 'Staff members', workstations: 'Workstations', brands: 'Primary brands separated by commas', multibrand: 'We work with all brands', submit: 'Submit change for review',
    },
} as const

const numberOrZero = (value: FormDataEntryValue | null) => Math.max(0, Number.parseInt(String(value ?? '0'), 10) || 0)
const strings = (value: FormDataEntryValue | null) => [...new Set(String(value ?? '').split(',').map((item) => item.trim()).filter(Boolean))]

export function OwnerProviderProfileChangeForm({ provider, locale, disabled, onSubmit }: Props) {
    const text = locale === 'ru' ? copy.ru : copy.en
    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const values = new FormData(event.currentTarget)
        await onSubmit({
            name: String(values.get('name') ?? '').trim(),
            description: String(values.get('description') ?? '').trim() || null,
            phones: strings(values.get('phones')),
            email: String(values.get('email') ?? '').trim() || null,
            websiteUrl: String(values.get('websiteUrl') ?? '').trim() || null,
            metroStation: String(values.get('metroStation') ?? '').trim() || null,
            warrantyText: String(values.get('warrantyText') ?? '').trim() || null,
            yearsActive: numberOrZero(values.get('yearsActive')),
            staffCount: numberOrZero(values.get('staffCount')),
            workstationCount: numberOrZero(values.get('workstationCount')),
            brandSpecializations: strings(values.get('brandSpecializations')),
            isMultibrand: values.get('isMultibrand') === 'on',
        })
    }
    const inputClass = 'mt-1.5 h-10 w-full rounded-[var(--radius-control)] border border-border bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring'

    return <form onSubmit={(event) => void submit(event)} className="mt-5 grid gap-3 rounded-[var(--radius-card)] border border-border bg-background p-4 sm:grid-cols-2">
        <h3 className="sm:col-span-2 text-sm font-black text-foreground">{text.title}</h3>
        <Label label={text.name}><input required name="name" defaultValue={provider.name} className={inputClass} /></Label>
        <Label label={text.phones}><input name="phones" defaultValue={provider.phones.join(', ')} className={inputClass} /></Label>
        <Label label={text.email}><input name="email" type="email" defaultValue={provider.email ?? ''} className={inputClass} /></Label>
        <Label label={text.website}><input name="websiteUrl" type="url" defaultValue={provider.websiteUrl ?? ''} className={inputClass} /></Label>
        <Label label={text.metro}><input name="metroStation" defaultValue={provider.metroStation ?? ''} className={inputClass} /></Label>
        <Label label={text.warranty}><input name="warrantyText" defaultValue={provider.warrantyText ?? ''} className={inputClass} /></Label>
        <Label label={text.years}><input name="yearsActive" min="0" type="number" defaultValue={provider.yearsActive} className={inputClass} /></Label>
        <Label label={text.staff}><input name="staffCount" min="0" type="number" defaultValue={provider.staffCount} className={inputClass} /></Label>
        <Label label={text.workstations}><input name="workstationCount" min="0" type="number" defaultValue={provider.workstationCount ?? 0} className={inputClass} /></Label>
        <Label label={text.brands}><input name="brandSpecializations" defaultValue={provider.brandSpecializations.join(', ')} className={inputClass} /></Label>
        <label className="flex min-h-10 items-center gap-2 text-xs font-black text-foreground sm:col-span-2"><input name="isMultibrand" type="checkbox" defaultChecked={provider.isMultibrand} />{text.multibrand}</label>
        <Label className="sm:col-span-2" label={text.description}><textarea name="description" rows={3} defaultValue={provider.description ?? ''} className="mt-1.5 w-full rounded-[var(--radius-control)] border border-border bg-card p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" /></Label>
        <button type="submit" disabled={disabled} className="inline-flex h-10 items-center justify-center rounded-[var(--radius-control)] border border-primary px-4 text-xs font-black text-primary disabled:opacity-50 sm:col-span-2">{text.submit}</button>
    </form>
}

function Label({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
    return <label className={`text-xs font-black text-foreground ${className}`}><span>{label}</span>{children}</label>
}
