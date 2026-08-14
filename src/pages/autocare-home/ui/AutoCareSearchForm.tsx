import { useState, type FormEvent } from 'react'
import { LocateFixed, Search, Wrench } from 'lucide-react'
import { useNavigate } from 'react-router'

import { automotiveServices, getServiceLabel, type AutoCareApiMarket } from '@/entities/automotive-service'
import { routePaths } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'

type AutoCareSearchFormProps = { marketId: string; markets: AutoCareApiMarket[]; onMarketChange: (marketId: string) => void }

export function AutoCareSearchForm({ marketId, markets, onMarketChange }: AutoCareSearchFormProps) {
    const { t, locale } = useTranslation()
    const navigate = useNavigate()
    const [serviceId, setServiceId] = useState('')
    const [radius, setRadius] = useState('10')
    const marketOptions = markets.map((market) => ({ value: market.cityCode, label: `${market.cityName}, ${market.countryName}` }))

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        navigate(routePaths.serviceDiscovery({ service: serviceId, market: marketId, radius }))
    }

    return (
        <form onSubmit={handleSubmit} className="overflow-hidden rounded-[12px] border-[5px] border-primary-foreground/20 bg-transparent text-foreground shadow-2xl shadow-black/30">
            <div className="grid grid-cols-2 bg-map-overlay/65 text-primary-foreground backdrop-blur-[2px]"><button type="button" className="flex h-[52px] items-center justify-center gap-2 rounded-tr-[10px] bg-background text-base font-black text-primary"><Wrench className="size-5" />{t('autocare.byService')}</button><button type="button" className="flex h-[52px] items-center justify-center gap-2 border-0 bg-transparent text-base font-bold"><span className="text-xl" aria-hidden="true">⌘</span>{t('autocare.byProvider')}</button></div>
            <div className="bg-background px-5 pb-3 pt-4">
                <label className="grid gap-1.5 text-[0.78rem] font-semibold">{t('autocare.serviceLabel')}<select required value={serviceId} onChange={(event) => setServiceId(event.target.value)} className="h-[44px] rounded-[var(--radius-control)] border border-border bg-background px-3 text-sm text-muted-foreground"><option value="" disabled>{t('autocare.servicePlaceholder')}</option>{automotiveServices.map((service) => <option key={service.id} value={service.id}>{getServiceLabel(service, locale)}</option>)}</select></label>
                <div className="mt-3 grid grid-cols-[1.48fr_0.72fr] gap-3"><label className="grid gap-1.5 text-[0.78rem] font-semibold">{t('autocare.locationLabel')}<span className="relative"><LocateFixed className="pointer-events-none absolute left-3 top-3.5 size-4 text-primary" /><select value={marketId} onChange={(event) => onMarketChange(event.target.value)} disabled={marketOptions.length === 0} className="h-[44px] w-full rounded-[var(--radius-control)] border border-border bg-background pl-9 pr-9 text-sm disabled:cursor-wait disabled:opacity-60"><option value="" disabled>{marketOptions.length === 0 ? t('common.loading') : t('autocare.selectCity')}</option>{marketOptions.map((market) => <option key={market.value} value={market.value}>{market.label}</option>)}</select></span></label><label className="grid gap-1.5 text-[0.78rem] font-semibold">{t('autocare.radiusLabel')}<select value={radius} onChange={(event) => setRadius(event.target.value)} className="h-[44px] rounded-[var(--radius-control)] border border-border bg-background px-3 text-sm"><option value="5">5 км</option><option value="10">10 км</option><option value="25">25 км</option></select></label></div>
                <button type="submit" className="mt-3 flex h-[48px] w-full items-center justify-center gap-2 rounded-[var(--radius-control)] bg-primary text-base font-black text-primary-foreground shadow-lg shadow-primary/20"><Search className="size-[18px]" />{t('autocare.searchNearby')}</button>
                <div className="mt-2.5 flex items-center gap-3"><span className="flex -space-x-2">{['alexey', 'maria', 'igor'].map((avatar) => <img key={avatar} src={`/images/autocare/avatars/${avatar}.webp`} alt="" className="size-8 rounded-full border-2 border-background object-cover" />)}</span><p className="text-sm font-semibold text-muted-foreground">{t('autocare.readyNearby')}</p></div>
            </div>
        </form>
    )
}
