import { useState } from 'react'
import { Globe2, MapPin, Plus } from 'lucide-react'

import {
    useCreateSuperAdminAutoCareMarketMutation,
    useCreateSuperAdminAutoCareMarketZoneMutation,
    useCreateSuperAdminMarketCountryMutation,
    useGetSuperAdminMarketHierarchyQuery,
    useUpdateSuperAdminAutoCareMarketHierarchyMutation,
    useUpdateSuperAdminAutoCareMarketZoneMutation,
    useUpdateSuperAdminMarketCountryMutation,
} from '@/entities/automotive-service'
import type {
    CreateSuperAdminAutoCareMarketInput,
    CreateSuperAdminMarketCountryInput,
    UpdateSuperAdminAutoCareMarketHierarchyInput,
    UpdateSuperAdminMarketCountryInput,
} from '@/entities/automotive-service'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { RetryButton } from '@/shared/ui/query-refresh-error'
import { StateCard } from '@/shared/ui/state-card'

import { CountryProfileForm, CityProfileForm } from './MarketHierarchyProfiles'
import { MarketHierarchyZones } from './MarketHierarchyZones'

type Props = { locale: string }

export function SuperAdminMarketsPanel({ locale }: Props) {
    const hierarchy = useGetSuperAdminMarketHierarchyQuery()
    const [selectedCountryId, setSelectedCountryId] = useState('')
    const [selectedCityId, setSelectedCityId] = useState('')
    const [showCountryCreator, setShowCountryCreator] = useState(false)
    const [showCityCreator, setShowCityCreator] = useState(false)
    const [createCountry, createCountryState] = useCreateSuperAdminMarketCountryMutation()
    const [updateCountry, updateCountryState] = useUpdateSuperAdminMarketCountryMutation()
    const [createCity, createCityState] = useCreateSuperAdminAutoCareMarketMutation()
    const [updateCity, updateCityState] = useUpdateSuperAdminAutoCareMarketHierarchyMutation()
    const [createZone, createZoneState] = useCreateSuperAdminAutoCareMarketZoneMutation()
    const [updateZone, updateZoneState] = useUpdateSuperAdminAutoCareMarketZoneMutation()
    const countries = hierarchy.data ?? []
    const country = countries.find((item) => item.id === selectedCountryId) ?? countries[0]
    const city = country?.cities.find((item) => item.id === selectedCityId) ?? country?.cities[0]
    const language = locale === 'ru' ? 'ru' : 'en'
    const submitCreateCountry = (input: CreateSuperAdminMarketCountryInput | UpdateSuperAdminMarketCountryInput) => 'code' in input ? createCountry(input).unwrap() : Promise.reject(new Error('Country code is required when creating a country.'))
    const submitUpdateCountry = (input: CreateSuperAdminMarketCountryInput | UpdateSuperAdminMarketCountryInput) => 'id' in input ? updateCountry(input).unwrap() : Promise.reject(new Error('Country id is required when updating a country.'))
    const submitCreateCity = (input: CreateSuperAdminAutoCareMarketInput | UpdateSuperAdminAutoCareMarketHierarchyInput) => 'countryId' in input ? createCity(input).unwrap() : Promise.reject(new Error('Country id is required when creating a city.'))
    const submitUpdateCity = (input: CreateSuperAdminAutoCareMarketInput | UpdateSuperAdminAutoCareMarketHierarchyInput) => 'id' in input ? updateCity(input).unwrap() : Promise.reject(new Error('City id is required when updating a city.'))
    if (hierarchy.isLoading) return <StateCard variant="loading" title={language === 'ru' ? 'Загрузка иерархии рынков…' : 'Loading market hierarchy…'} />
    if (hierarchy.error) return <StateCard variant="error" title={language === 'ru' ? 'Не удалось загрузить иерархию рынков.' : 'Could not load market hierarchy.'} description={getApiErrorMessage(hierarchy.error, language === 'ru' ? 'Повторите попытку.' : 'Please retry.')} action={<RetryButton onRetry={hierarchy.refetch} label={language === 'ru' ? 'Повторить' : 'Retry'} />} />
    return <section className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><h2 className="flex items-center gap-2 text-lg font-black text-foreground"><Globe2 className="size-5 text-primary" />{language === 'ru' ? 'Страны, города и зоны' : 'Countries, cities and zones'}</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{language === 'ru' ? 'Управляйте иерархией рынка через API: новые страны, города, районы, локали, legal links и возможности не требуют изменения frontend.' : 'Manage the market hierarchy through the API. New countries, cities, zones, locales, legal links and capabilities require no frontend changes.'}</p></div><button type="button" onClick={() => setShowCountryCreator((value) => !value)} className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-control)] border border-border px-3 text-xs font-black text-foreground"><Plus className="size-4" />{language === 'ru' ? 'Новая страна' : 'New country'}</button></div>{showCountryCreator && <div className="mt-5"><CountryProfileForm onSubmit={submitCreateCountry} state={createCountryState} /></div>}{countries.length === 0 ? <StateCard variant="empty" title={language === 'ru' ? 'Страны ещё не настроены.' : 'No countries configured yet.'} description={language === 'ru' ? 'Создайте первую страну, затем добавьте города и зоны.' : 'Create the first country, then add cities and zones.'} /> : <><div className="mt-5 grid gap-3 md:grid-cols-2"><label className="text-xs font-black text-muted-foreground"><span className="mb-1.5 block">{language === 'ru' ? 'Страна' : 'Country'}</span><select value={country?.id ?? ''} onChange={(event) => { setSelectedCountryId(event.target.value); setSelectedCityId('') }} className="h-10 w-full rounded-[var(--radius-control)] border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary">{countries.map((item) => <option key={item.id} value={item.id}>{item.names[language] ?? item.names[item.defaultLocale] ?? item.code} · {item.code}</option>)}</select></label><label className="text-xs font-black text-muted-foreground"><span className="mb-1.5 block">{language === 'ru' ? 'Город' : 'City'}</span><select value={city?.id ?? ''} onChange={(event) => setSelectedCityId(event.target.value)} disabled={!country?.cities.length} className="h-10 w-full rounded-[var(--radius-control)] border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-60">{country?.cities.length ? country.cities.map((item) => <option key={item.id} value={item.id}>{item.cityName}</option>) : <option>{language === 'ru' ? 'Городов пока нет' : 'No cities yet'}</option>}</select></label></div>{country && <div className="mt-5"><CountryProfileForm key={country.id} country={country} onSubmit={submitUpdateCountry} state={updateCountryState} /></div>}<div className="mt-5 flex flex-wrap justify-between gap-3"><div className="flex items-center gap-2 text-sm font-black text-foreground"><MapPin className="size-4 text-primary" />{language === 'ru' ? 'Города выбранной страны' : 'Cities in selected country'}</div>{country && <button type="button" onClick={() => setShowCityCreator((value) => !value)} className="inline-flex h-9 items-center gap-2 rounded-[var(--radius-control)] border border-border px-3 text-xs font-black text-foreground"><Plus className="size-4" />{language === 'ru' ? 'Новый город' : 'New city'}</button>}</div>{showCityCreator && country && <div className="mt-3"><CityProfileForm key={`new-${country.id}`} country={country} onSubmit={submitCreateCity} state={createCityState} /></div>}{city && country ? <div className="mt-3 space-y-5"><CityProfileForm key={city.id} country={country} city={city} onSubmit={submitUpdateCity} state={updateCityState} /><MarketHierarchyZones city={city} zones={city.zones} onSubmit={(input) => 'marketId' in input ? createZone(input).unwrap() : updateZone(input).unwrap()} state={{ isLoading: createZoneState.isLoading || updateZoneState.isLoading, isSuccess: createZoneState.isSuccess || updateZoneState.isSuccess }} /></div> : <p className="mt-3 rounded-[var(--radius-card)] bg-secondary p-4 text-sm text-muted-foreground">{language === 'ru' ? 'Добавьте первый город, чтобы настроить зоны поиска.' : 'Add the first city to configure search zones.'}</p>}</>}</section>
}
