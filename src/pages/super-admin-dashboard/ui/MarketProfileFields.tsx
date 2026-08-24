import type { Dispatch, SetStateAction } from 'react'

import type { MarketProfileDraft } from './market-hierarchy-form-utils'

type Props = {
    draft: MarketProfileDraft
    setDraft: Dispatch<SetStateAction<MarketProfileDraft>>
}

const inputClassName = 'mt-1 h-10 w-full rounded-[var(--radius-control)] border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-primary'

export function MarketProfileFields({ draft, setDraft }: Props) {
    const update = (key: keyof MarketProfileDraft, value: string) => setDraft((current) => ({ ...current, [key]: value }))
    return <>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <label className="text-xs font-bold text-muted-foreground">Основная локаль<input value={draft.defaultLocale} onChange={(event) => update('defaultLocale', event.target.value)} className={inputClassName} /></label>
            <label className="text-xs font-bold text-muted-foreground">Локали через запятую<input value={draft.supportedLocales} onChange={(event) => update('supportedLocales', event.target.value)} className={inputClassName} /></label>
            <label className="text-xs font-bold text-muted-foreground">Часовой пояс<input value={draft.timezone} onChange={(event) => update('timezone', event.target.value)} className={inputClassName} /></label>
            <label className="text-xs font-bold text-muted-foreground">Валюта ISO<input value={draft.currencyCode} maxLength={3} onChange={(event) => update('currencyCode', event.target.value.toUpperCase())} className={inputClassName} /></label>
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <label className="text-xs font-bold text-muted-foreground">Capabilities (JSON)<textarea value={draft.capabilities} onChange={(event) => update('capabilities', event.target.value)} className="mt-1 min-h-28 w-full rounded-[var(--radius-control)] border border-border bg-card p-3 font-mono text-xs text-foreground outline-none focus:border-primary" /></label>
            <label className="text-xs font-bold text-muted-foreground">Legal links (JSON)<textarea value={draft.legalLinks} onChange={(event) => update('legalLinks', event.target.value)} className="mt-1 min-h-28 w-full rounded-[var(--radius-control)] border border-border bg-card p-3 font-mono text-xs text-foreground outline-none focus:border-primary" /></label>
        </div>
    </>
}
