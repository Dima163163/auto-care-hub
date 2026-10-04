import { useState } from 'react'
import { Globe2, MapPin, Plus } from 'lucide-react'

import {
    useCreateSuperAdminAutoCareMarketMutation,
    useCreateSuperAdminAutoCareMarketZoneMutation,
    useCreateSuperAdminMarketCountryMutation,
    useDeleteSuperAdminAutoCareMarketMutation,
    useDeleteSuperAdminAutoCareMarketZoneMutation,
    useDeleteSuperAdminMarketCountryMutation,
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
    const [selectedNode, setSelectedNode] = useState<'country' | 'city' | 'zones'>('country')
    const [showCountryCreator, setShowCountryCreator] = useState(false)
    const [showCityCreator, setShowCityCreator] = useState(false)
    const [createCountry, createCountryState] = useCreateSuperAdminMarketCountryMutation()
    const [updateCountry, updateCountryState] = useUpdateSuperAdminMarketCountryMutation()
    const [createCity, createCityState] = useCreateSuperAdminAutoCareMarketMutation()
    const [updateCity, updateCityState] = useUpdateSuperAdminAutoCareMarketHierarchyMutation()
    const [createZone, createZoneState] = useCreateSuperAdminAutoCareMarketZoneMutation()
    const [updateZone, updateZoneState] = useUpdateSuperAdminAutoCareMarketZoneMutation()
    const [deleteCountry] = useDeleteSuperAdminMarketCountryMutation()
    const [deleteCity] = useDeleteSuperAdminAutoCareMarketMutation()
    const [deleteZone] = useDeleteSuperAdminAutoCareMarketZoneMutation()
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
    return <section className="rounded-[var(--radius-panel)] border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
            <div><h2 className="flex items-center gap-2 text-lg font-semibold"><Globe2 className="size-5 text-primary" />{language === 'ru' ? 'Страны, города и зоны' : 'Countries, cities and zones'}</h2><p className="mt-1 text-sm text-muted-foreground">{language === 'ru' ? 'Выберите страну, город или зоны поиска для настройки.' : 'Select a country, city or search zones to configure.'}</p></div>
            <button type="button" aria-expanded={showCountryCreator} onClick={() => { setShowCountryCreator((value) => !value); setShowCityCreator(false) }} className="inline-flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm font-medium"><Plus className="size-4" />{language === 'ru' ? 'Новая страна' : 'New country'}</button>
        </div>
        <div className="mt-5 grid items-start gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
            <nav aria-label={language === 'ru' ? 'География рынка' : 'Market geography'} className="max-h-[52dvh] overflow-y-auto rounded-lg border bg-background p-3 lg:sticky lg:top-24 lg:max-h-[70dvh]">
                {countries.map((item) => <div key={item.id} className="mb-2">
                    <button type="button" aria-pressed={country?.id === item.id && selectedNode === 'country' && !showCountryCreator && !showCityCreator} onClick={() => { setSelectedCountryId(item.id); setSelectedCityId(''); setSelectedNode('country'); setShowCountryCreator(false); setShowCityCreator(false) }} className={`flex min-h-11 w-full items-center gap-2 rounded-md px-3 text-left text-sm font-semibold ${country?.id === item.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`}><Globe2 className="size-4 shrink-0" />{item.names[language] ?? item.names[item.defaultLocale] ?? item.code} · {item.code}</button>
                    {country?.id === item.id && <div className="ml-4 border-l pl-2">{item.cities.map((entry) => <div key={entry.id}>
                        <button type="button" aria-pressed={city?.id === entry.id && selectedNode === 'city' && !showCityCreator && !showCountryCreator} onClick={() => { setSelectedCityId(entry.id); setSelectedNode('city'); setShowCityCreator(false); setShowCountryCreator(false) }} className="flex min-h-11 w-full items-center gap-2 rounded-md px-3 text-left text-sm hover:bg-muted"><MapPin className="size-4 shrink-0" />{entry.cityName}</button>
                        <button type="button" aria-pressed={city?.id === entry.id && selectedNode === 'zones' && !showCityCreator && !showCountryCreator} onClick={() => { setSelectedCityId(entry.id); setSelectedNode('zones'); setShowCityCreator(false); setShowCountryCreator(false) }} className="min-h-11 w-full rounded-md px-3 pl-9 text-left text-sm text-muted-foreground hover:bg-muted">{language === 'ru' ? `Зоны: ${entry.cityName}` : `Zones: ${entry.cityName}`}</button>
                    </div>)}<button type="button" aria-expanded={showCityCreator} onClick={() => { setShowCityCreator((value) => !value); setShowCountryCreator(false) }} className="mt-2 flex min-h-11 w-full items-center gap-2 rounded-md border px-3 text-sm"><Plus className="size-4" />{language === 'ru' ? 'Новый город' : 'New city'}</button></div>}
                </div>)}
            </nav>
            <div className="min-w-0">
                {showCountryCreator && <CountryProfileForm onSubmit={submitCreateCountry} state={createCountryState} />}
                {showCityCreator && country && <CityProfileForm key={`new-${country.id}`} country={country} onSubmit={submitCreateCity} state={createCityState} />}
                {countries.length === 0 && !showCountryCreator && <StateCard variant="empty" title={language === 'ru' ? 'Страны ещё не настроены.' : 'No countries configured yet.'} description={language === 'ru' ? 'Создайте первую страну, затем добавьте города и зоны.' : 'Create the first country, then add cities and zones.'} />}
                {country && <div hidden={selectedNode !== 'country' || showCountryCreator || showCityCreator}><CountryProfileForm key={country.id} country={country} onSubmit={submitUpdateCountry} state={updateCountryState} onDelete={() => deleteCountry(country.id).unwrap()} /></div>}
                {city && country && <>
                    <div hidden={selectedNode !== 'city' || showCountryCreator || showCityCreator}><CityProfileForm key={city.id} country={country} city={city} onSubmit={submitUpdateCity} state={updateCityState} onDelete={() => deleteCity(city.id).unwrap()} /></div>
                    <div hidden={selectedNode !== 'zones' || showCountryCreator || showCityCreator}><MarketHierarchyZones city={city} zones={city.zones} onSubmit={(input) => 'marketId' in input ? createZone(input).unwrap() : updateZone(input).unwrap()} onDelete={(zoneId) => deleteZone(zoneId).unwrap()} state={{ isLoading: createZoneState.isLoading || updateZoneState.isLoading, isSuccess: createZoneState.isSuccess || updateZoneState.isSuccess }} /></div>
                </>}
            </div>
        </div>
    </section>
}
