import { useState } from 'react'
import { Building2, Globe2, Plus, Save } from 'lucide-react'

import type {
    AutoCareApiMarket,
    AutoCareApiMarketCountry,
    CreateSuperAdminAutoCareMarketInput,
    CreateSuperAdminMarketCountryInput,
    UpdateSuperAdminAutoCareMarketHierarchyInput,
    UpdateSuperAdminMarketCountryInput,
} from '@/entities/automotive-service'

import { MarketProfileFields } from './MarketProfileFields'
import {
    createMarketProfileDraft,
    parseNames,
    toMarketProfileInput,
    type MarketProfileDraft,
} from './market-hierarchy-form-utils'

type SubmitState = { isLoading: boolean; isSuccess: boolean; error: unknown }
type CountryInput = CreateSuperAdminMarketCountryInput | UpdateSuperAdminMarketCountryInput
type CityInput = CreateSuperAdminAutoCareMarketInput | UpdateSuperAdminAutoCareMarketHierarchyInput

const primaryButton = 'inline-flex h-10 items-center gap-2 rounded-[var(--radius-control)] bg-primary px-3 text-xs font-black text-primary-foreground disabled:opacity-60'
const inputClassName = 'mt-1 h-10 w-full rounded-[var(--radius-control)] border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-primary'

function ErrorMessage({ error }: { error: string | null }) {
    return error ? <p role="alert" className="mt-3 text-xs font-bold text-destructive">{error}</p> : null
}

export function CountryProfileForm({ country, onSubmit, state }: { country?: AutoCareApiMarketCountry; onSubmit: (input: CountryInput) => Promise<unknown>; state: SubmitState }) {
    const [code, setCode] = useState(country?.code ?? '')
    const [names, setNames] = useState(JSON.stringify(country?.names ?? { ru: '', en: '' }, null, 2))
    const [active, setActive] = useState(country?.active ?? true)
    const [profile, setProfile] = useState<MarketProfileDraft>(() => createMarketProfileDraft(country ?? { defaultLocale: 'ru', supportedLocales: ['ru', 'en'], timezone: 'Europe/Moscow', currencyCode: 'RUB', capabilities: {}, legalLinks: {} }))
    const [error, setError] = useState<string | null>(null)
    const submit = async () => {
        try {
            setError(null)
            const base = { ...toMarketProfileInput(profile), names: parseNames(names), active }
            await onSubmit(country ? { id: country.id, ...base } : { code: code.trim().toUpperCase(), ...base })
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Не удалось сохранить страну.')
        }
    }
    return <form onSubmit={(event) => { event.preventDefault(); void submit() }} className="rounded-[var(--radius-card)] border border-border bg-background p-4">
        <h3 className="flex items-center gap-2 text-sm font-black text-foreground"><Globe2 className="size-4 text-primary" />{country ? 'Профиль страны' : 'Новая страна'}</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,0.35fr)_minmax(0,0.65fr)]">
            <label className="text-xs font-bold text-muted-foreground">Код страны<input value={code} disabled={Boolean(country)} maxLength={3} onChange={(event) => setCode(event.target.value.toUpperCase())} className={inputClassName} /></label>
            <label className="text-xs font-bold text-muted-foreground">Локализованные названия (JSON)<input value={names} onChange={(event) => setNames(event.target.value)} className={`${inputClassName} font-mono text-xs`} /></label>
        </div>
        <div className="mt-3"><MarketProfileFields draft={profile} setDraft={setProfile} /></div>
        <label className="mt-3 flex items-center gap-2 text-sm font-bold text-foreground"><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />Активна для создания городов и запуска</label>
        <div className="mt-3 flex items-center gap-3"><button type="submit" disabled={state.isLoading} className={primaryButton}>{country ? <Save className="size-4" /> : <Plus className="size-4" />}{state.isLoading ? 'Сохранение…' : country ? 'Сохранить страну' : 'Создать страну'}</button>{state.isSuccess && <span className="text-xs font-bold text-status-success-foreground">Сохранено</span>}</div><ErrorMessage error={error} />
    </form>
}

export function CityProfileForm({ country, city, onSubmit, state }: { country: AutoCareApiMarketCountry; city?: AutoCareApiMarket; onSubmit: (input: CityInput) => Promise<unknown>; state: SubmitState }) {
    const [cityCode, setCityCode] = useState(city?.cityCode ?? '')
    const [cityName, setCityName] = useState(city?.cityName ?? '')
    const [regionCode, setRegionCode] = useState(city?.regionCode ?? '')
    const [regionName, setRegionName] = useState(city?.regionName ?? '')
    const [latitude, setLatitude] = useState(city?.centerLatitude?.toString() ?? '')
    const [longitude, setLongitude] = useState(city?.centerLongitude?.toString() ?? '')
    const [launchReady, setLaunchReady] = useState(city?.launchReady ?? false)
    const [profile, setProfile] = useState<MarketProfileDraft>(() => createMarketProfileDraft(city ?? country))
    const [error, setError] = useState<string | null>(null)
    const submit = async () => {
        try {
            setError(null)
            const toNullableNumber = (value: string) => value.trim() ? Number(value) : null
            const base = { ...toMarketProfileInput(profile), cityCode: cityCode.trim().toLowerCase(), cityName: cityName.trim(), regionCode: regionCode.trim() || null, regionName: regionName.trim() || null, centerLatitude: toNullableNumber(latitude), centerLongitude: toNullableNumber(longitude), launchReady }
            await onSubmit(city ? { id: city.id, ...base } : { countryId: country.id, ...base })
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Не удалось сохранить город.')
        }
    }
    return <form onSubmit={(event) => { event.preventDefault(); void submit() }} className="rounded-[var(--radius-card)] border border-border bg-background p-4">
        <h3 className="flex items-center gap-2 text-sm font-black text-foreground"><Building2 className="size-4 text-primary" />{city ? `Город: ${city.cityName}` : `Новый город в ${country.names[country.defaultLocale] ?? country.code}`}</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <label className="text-xs font-bold text-muted-foreground">Код города<input value={cityCode} onChange={(event) => setCityCode(event.target.value)} className={inputClassName} /></label>
            <label className="text-xs font-bold text-muted-foreground">Название города<input value={cityName} onChange={(event) => setCityName(event.target.value)} className={inputClassName} /></label>
            <label className="text-xs font-bold text-muted-foreground">Код региона<input value={regionCode} onChange={(event) => setRegionCode(event.target.value)} className={inputClassName} /></label>
            <label className="text-xs font-bold text-muted-foreground">Название региона<input value={regionName} onChange={(event) => setRegionName(event.target.value)} className={inputClassName} /></label>
            <label className="text-xs font-bold text-muted-foreground">Широта<input value={latitude} type="number" step="any" onChange={(event) => setLatitude(event.target.value)} className={inputClassName} /></label>
            <label className="text-xs font-bold text-muted-foreground">Долгота<input value={longitude} type="number" step="any" onChange={(event) => setLongitude(event.target.value)} className={inputClassName} /></label>
        </div>
        <div className="mt-3"><MarketProfileFields draft={profile} setDraft={setProfile} /></div>
        <label className="mt-3 flex items-center gap-2 text-sm font-bold text-foreground"><input type="checkbox" checked={launchReady} onChange={(event) => setLaunchReady(event.target.checked)} />Город готов к публичному запуску</label>
        <div className="mt-3 flex items-center gap-3"><button type="submit" disabled={state.isLoading} className={primaryButton}>{city ? <Save className="size-4" /> : <Plus className="size-4" />}{state.isLoading ? 'Сохранение…' : city ? 'Сохранить город' : 'Создать город'}</button>{state.isSuccess && <span className="text-xs font-bold text-status-success-foreground">Сохранено</span>}</div><ErrorMessage error={error} />
    </form>
}
