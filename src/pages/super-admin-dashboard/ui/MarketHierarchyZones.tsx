import { useState } from 'react'
import { MapPin, Pencil, Plus, Save } from 'lucide-react'

import type {
    AutoCareApiLocationZone,
    AutoCareApiMarket,
    CreateSuperAdminAutoCareMarketZoneInput,
    UpdateSuperAdminAutoCareMarketZoneInput,
} from '@/entities/automotive-service'

import { parseNames } from './market-hierarchy-form-utils'

type SubmitState = { isLoading: boolean; isSuccess: boolean }
type ZoneInput = CreateSuperAdminAutoCareMarketZoneInput | UpdateSuperAdminAutoCareMarketZoneInput
type Props = { city: AutoCareApiMarket; zones: AutoCareApiLocationZone[]; onSubmit: (input: ZoneInput) => Promise<unknown>; state: SubmitState }

const inputClassName = 'mt-1 h-10 w-full rounded-[var(--radius-control)] border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-primary'
const primaryButton = 'inline-flex h-10 items-center gap-2 rounded-[var(--radius-control)] bg-primary px-3 text-xs font-black text-primary-foreground disabled:opacity-60'

export function MarketHierarchyZones({ city, zones, onSubmit, state }: Props) {
    const [editId, setEditId] = useState<string | null>(null)
    const editing = zones.find((zone) => zone.id === editId)
    return <section className="rounded-[var(--radius-card)] border border-border bg-background p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="flex items-center gap-2 text-sm font-black text-foreground"><MapPin className="size-4 text-primary" />Районы и зоны: {city.cityName}</h3><p className="mt-1 text-xs text-muted-foreground">Порядок влияет на выдачу в блоке «Исследуйте локации».</p></div><button type="button" onClick={() => setEditId('new')} className="inline-flex h-9 items-center gap-2 rounded-[var(--radius-control)] border border-border px-3 text-xs font-black text-foreground"><Plus className="size-4" />Добавить зону</button></div><div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{zones.map((zone) => <button type="button" key={zone.id} onClick={() => setEditId(zone.id)} className={`flex items-center justify-between gap-3 rounded-[var(--radius-control)] border p-3 text-left transition hover:border-primary ${zone.id === editId ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}><span><b className="block text-sm text-foreground">{zone.names.ru ?? zone.names.en ?? zone.slug}</b><span className="mt-1 block text-xs text-muted-foreground">{zone.zoneType} · #{zone.displayOrder} · {zone.active ? 'активна' : 'скрыта'}</span></span><Pencil className="size-4 shrink-0 text-primary" /></button>)}</div>{editId && <ZoneForm key={editing?.id ?? 'new'} city={city} zones={zones} zone={editing} onSubmit={onSubmit} state={state} />}</section>
}

function ZoneForm({ city, zones, zone, onSubmit, state }: { city: AutoCareApiMarket; zones: AutoCareApiLocationZone[]; zone?: AutoCareApiLocationZone; onSubmit: (input: ZoneInput) => Promise<unknown>; state: SubmitState }) {
    const [slug, setSlug] = useState(zone?.slug ?? '')
    const [names, setNames] = useState(JSON.stringify(zone?.names ?? { ru: '', en: '' }, null, 2))
    const [zoneType, setZoneType] = useState(zone?.zoneType ?? 'district')
    const [parentId, setParentId] = useState(zone?.parentId ?? '')
    const [latitude, setLatitude] = useState(zone?.centerLatitude?.toString() ?? '')
    const [longitude, setLongitude] = useState(zone?.centerLongitude?.toString() ?? '')
    const [radius, setRadius] = useState(zone?.radiusKm?.toString() ?? '')
    const [displayOrder, setDisplayOrder] = useState((zone?.displayOrder ?? zones.length + 1).toString())
    const [active, setActive] = useState(zone?.active ?? true)
    const [error, setError] = useState<string | null>(null)
    const submit = async () => {
        try {
            setError(null)
            const toNumberOrNull = (value: string) => value.trim() ? Number(value) : null
            const base = { parentId: parentId || null, slug: slug.trim().toLowerCase(), zoneType, names: parseNames(names), centerLatitude: toNumberOrNull(latitude), centerLongitude: toNumberOrNull(longitude), radiusKm: toNumberOrNull(radius), imageUrl: zone?.imageUrl ?? null, displayOrder: Number(displayOrder), active }
            await onSubmit(zone ? { id: zone.id, ...base } : { marketId: city.id, ...base })
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Не удалось сохранить зону.')
        }
    }
    return <form onSubmit={(event) => { event.preventDefault(); void submit() }} className="mt-4 border-t border-border pt-4"><h4 className="text-sm font-black text-foreground">{zone ? 'Редактирование зоны' : 'Новая зона'}</h4><div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><label className="text-xs font-bold text-muted-foreground">Slug<input value={slug} onChange={(event) => setSlug(event.target.value)} className={inputClassName} /></label><label className="text-xs font-bold text-muted-foreground">Тип<select value={zoneType} onChange={(event) => setZoneType(event.target.value as typeof zoneType)} className={inputClassName}><option value="district">Район</option><option value="neighborhood">Микрорайон</option><option value="service_area">Зона обслуживания</option></select></label><label className="text-xs font-bold text-muted-foreground">Родительская зона<select value={parentId} onChange={(event) => setParentId(event.target.value)} className={inputClassName}><option value="">Без родителя</option>{zones.filter((item) => item.id !== zone?.id).map((item) => <option key={item.id} value={item.id}>{item.names.ru ?? item.slug}</option>)}</select></label><label className="text-xs font-bold text-muted-foreground">Порядок<input value={displayOrder} type="number" min="0" onChange={(event) => setDisplayOrder(event.target.value)} className={inputClassName} /></label><label className="text-xs font-bold text-muted-foreground">Широта<input value={latitude} type="number" step="any" onChange={(event) => setLatitude(event.target.value)} className={inputClassName} /></label><label className="text-xs font-bold text-muted-foreground">Долгота<input value={longitude} type="number" step="any" onChange={(event) => setLongitude(event.target.value)} className={inputClassName} /></label><label className="text-xs font-bold text-muted-foreground">Радиус, км<input value={radius} type="number" min="0" step="0.1" onChange={(event) => setRadius(event.target.value)} className={inputClassName} /></label><label className="flex items-end gap-2 pb-2 text-sm font-bold text-foreground"><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />Активна</label></div><label className="mt-3 block text-xs font-bold text-muted-foreground">Локализованные названия (JSON)<textarea value={names} onChange={(event) => setNames(event.target.value)} className="mt-1 min-h-24 w-full rounded-[var(--radius-control)] border border-border bg-card p-3 font-mono text-xs text-foreground outline-none focus:border-primary" /></label><div className="mt-3 flex items-center gap-3"><button type="submit" disabled={state.isLoading} className={primaryButton}>{zone ? <Save className="size-4" /> : <Plus className="size-4" />}{state.isLoading ? 'Сохранение…' : zone ? 'Сохранить зону' : 'Создать зону'}</button>{state.isSuccess && <span className="text-xs font-bold text-status-success-foreground">Сохранено</span>}</div>{error && <p role="alert" className="mt-3 text-xs font-bold text-destructive">{error}</p>}</form>
}
