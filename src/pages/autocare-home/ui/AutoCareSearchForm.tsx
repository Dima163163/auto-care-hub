import { useState, type FormEvent } from 'react'
import { Building2, ChevronDown, LocateFixed, Search, Wrench } from 'lucide-react'
import { useNavigate } from 'react-router'

import { automotiveServices, getServiceLabel, providerPreviews, type AutoCareApiMarket } from '@/entities/automotive-service'
import { routePaths } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'

type AutoCareSearchFormProps = { marketId: string; markets: AutoCareApiMarket[]; onMarketChange: (marketId: string) => void }
type SearchMode = 'service' | 'provider'

export function AutoCareSearchForm({ marketId, markets, onMarketChange }: AutoCareSearchFormProps) {
    const { t, locale } = useTranslation()
    const navigate = useNavigate()
    const [mode, setMode] = useState<SearchMode>('service')
    const [serviceId, setServiceId] = useState('')
    const [providerName, setProviderName] = useState('')
    const [radius, setRadius] = useState('10')
    const marketOptions = markets.map((market) => ({ value: market.cityCode, label: `${market.cityName}, ${market.countryName}` }))

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        navigate(routePaths.serviceDiscovery({ service: mode === 'service' ? serviceId : undefined, provider: mode === 'provider' ? providerName : undefined, market: marketId, radius }))
    }

    const tabClass = (tab: SearchMode) => `flex h-[52px] items-center justify-center gap-2 text-base font-black transition ${mode === tab ? 'rounded-tr-[10px] bg-background text-primary' : 'bg-transparent text-primary-foreground/85 hover:bg-primary-foreground/10'}`

    return (
        <form onSubmit={handleSubmit} className="overflow-hidden rounded-[12px] border-[5px] border-primary-foreground/20 bg-transparent text-foreground shadow-2xl shadow-black/30">
            <div role="tablist" aria-label={t('autocare.searchModeLabel')} className="grid grid-cols-2 bg-map-overlay/65 text-primary-foreground backdrop-blur-[2px]"><button type="button" role="tab" aria-selected={mode === 'service'} onClick={() => setMode('service')} className={tabClass('service')}><Wrench className="size-5" />{t('autocare.byService')}</button><button type="button" role="tab" aria-selected={mode === 'provider'} onClick={() => setMode('provider')} className={tabClass('provider')}><Building2 className="size-5" />{t('autocare.byProvider')}</button></div>
            <div className="bg-background px-5 pb-3 pt-4">
                {mode === 'service' ? <label className="grid gap-1.5 text-[0.78rem] font-semibold">{t('autocare.serviceLabel')}<span className="relative"><select required value={serviceId} onChange={(event) => setServiceId(event.target.value)} className="select-with-icon h-[44px] w-full appearance-none rounded-[var(--radius-control)] border border-border bg-background px-3 pr-9 text-sm text-muted-foreground"><option value="" disabled>{t('autocare.servicePlaceholder')}</option>{automotiveServices.map((service) => <option key={service.id} value={service.id}>{getServiceLabel(service, locale)}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /></span></label> : <label className="grid gap-1.5 text-[0.78rem] font-semibold">{t('autocare.providerLabel')}<input required value={providerName} onChange={(event) => setProviderName(event.target.value)} list="autocare-provider-options" placeholder={t('autocare.providerPlaceholder')} className="h-[44px] rounded-[var(--radius-control)] border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary" /><datalist id="autocare-provider-options">{providerPreviews.slice(0, 40).map((provider) => <option key={provider.id} value={provider.name} />)}</datalist></label>}
                <div className="mt-3 grid grid-cols-[1.48fr_0.72fr] gap-3"><label className="grid gap-1.5 text-[0.78rem] font-semibold">{t('autocare.locationLabel')}<span className="relative"><LocateFixed className="pointer-events-none absolute left-3 top-3.5 size-4 text-primary" /><select value={marketId} onChange={(event) => onMarketChange(event.target.value)} disabled={marketOptions.length === 0} className="h-[44px] w-full rounded-[var(--radius-control)] border border-border bg-background pl-9 pr-9 text-sm disabled:cursor-wait disabled:opacity-60"><option value="" disabled>{marketOptions.length === 0 ? t('common.loading') : t('autocare.selectCity')}</option>{marketOptions.map((market) => <option key={market.value} value={market.value}>{market.label}</option>)}</select></span></label><label className="grid gap-1.5 text-[0.78rem] font-semibold">{t('autocare.radiusLabel')}<select value={radius} onChange={(event) => setRadius(event.target.value)} className="h-[44px] rounded-[var(--radius-control)] border border-border bg-background px-3 text-sm"><option value="5">5 км</option><option value="10">10 км</option><option value="25">25 км</option></select></label></div>
                <button type="submit" className="mt-3 flex h-[48px] w-full items-center justify-center gap-2 rounded-[var(--radius-control)] bg-primary text-base font-black text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90"><Search className="size-[18px]" />{t('autocare.searchNearby')}</button>
                <div className="mt-2.5 flex items-center gap-3"><span className="flex -space-x-2">{['alexey', 'maria', 'igor'].map((avatar) => <img key={avatar} src={`/images/autocare/avatars/${avatar}.webp`} alt="" className="size-8 rounded-full border-2 border-background object-cover" />)}</span><p className="text-sm font-semibold text-muted-foreground">{t('autocare.readyNearby')}</p></div>
            </div>
        </form>
    )
}
