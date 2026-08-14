import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, MapPin } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router'

import { useGetAutoCareMarketsQuery, type AutoCareApiMarket } from '@/entities/automotive-service'
import { ROUTES } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'

type MarketSwitcherProps = {
    variant?: 'dark' | 'surface'
    compact?: boolean
}

const STORAGE_KEY = 'autocare.selected-market'

function readStoredMarket() {
    if (typeof window === 'undefined') return null
    try {
        return window.localStorage.getItem(STORAGE_KEY)
    } catch {
        return null
    }
}

function groupMarkets(markets: readonly AutoCareApiMarket[]) {
    return markets.reduce<Array<{ country: string; markets: AutoCareApiMarket[] }>>((groups, market) => {
        const current = groups.find((group) => group.country === market.countryName)
        if (current) current.markets.push(market)
        else groups.push({ country: market.countryName, markets: [market] })
        return groups
    }, [])
}

export function MarketSwitcher({ variant = 'dark', compact = false }: MarketSwitcherProps) {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const location = useLocation()
    const { data: markets = [], isLoading } = useGetAutoCareMarketsQuery()
    const [isOpen, setIsOpen] = useState(false)
    const [storedMarketId, setStoredMarketId] = useState(() => readStoredMarket() ?? 'moscow')
    const rootRef = useRef<HTMLDivElement | null>(null)
    const queryMarketId = new URLSearchParams(location.search).get('market')
    const selectedMarketId = queryMarketId ?? storedMarketId
    const groups = useMemo(() => groupMarkets(markets), [markets])
    const selectedMarket = markets.find((market) => market.cityCode === selectedMarketId) ?? markets.find((market) => market.launchReady) ?? markets[0]
    const label = selectedMarket?.cityName ?? (isLoading ? '…' : t('autocare.selectCity'))
    const buttonClass = variant === 'dark'
        ? 'border-primary-foreground/20 bg-primary-foreground/5 text-primary-foreground hover:border-primary-foreground/40 hover:bg-primary-foreground/10'
        : 'border-border bg-card text-foreground hover:border-primary hover:text-primary'

    useEffect(() => {
        if (!isOpen) return
        const close = (event: PointerEvent) => {
            if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setIsOpen(false)
        }
        const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setIsOpen(false) }
        document.addEventListener('pointerdown', close)
        document.addEventListener('keydown', escape)
        return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', escape) }
    }, [isOpen])

    const chooseMarket = (market: AutoCareApiMarket) => {
        setStoredMarketId(market.cityCode)
        try {
            window.localStorage.setItem(STORAGE_KEY, market.cityCode)
        } catch {
            // Private browsing may block storage; the URL remains the source of truth.
        }
        setIsOpen(false)
        const params = new URLSearchParams(location.search)
        params.set('market', market.cityCode)
        params.delete('zone')
        const query = params.toString()
        navigate(`${ROUTES.serviceDiscovery}${query ? `?${query}` : ''}`)
    }

    return (
        <div ref={rootRef} className="relative shrink-0">
            <button
                type="button"
                disabled={isLoading}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-label={`${t('autocare.locationLabel')}: ${label}`}
                onClick={() => setIsOpen((value) => !value)}
                className={`inline-flex h-10 items-center gap-1.5 rounded-[9px] border px-2.5 text-xs font-semibold transition-colors disabled:cursor-wait disabled:opacity-70 xl:px-3 ${buttonClass}`}
            >
                <MapPin className="size-4" />
                <span className={compact ? 'max-w-[8rem] truncate' : ''}>{label}</span>
                <ChevronDown className={`size-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div
                    role="listbox"
                    aria-label={t('autocare.selectCity')}
                    className={`absolute right-0 top-12 z-[70] max-h-[min(28rem,calc(100vh-6rem))] w-72 overflow-y-auto rounded-xl border p-2 shadow-2xl ${variant === 'dark' ? 'border-primary-foreground/15 bg-hero-overlay text-primary-foreground' : 'border-border bg-popover text-foreground'}`}
                >
                    {groups.map((group) => (
                        <div key={group.country} className="pb-2 last:pb-0">
                            <p className="px-2 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">{group.country}</p>
                            {group.markets.map((market) => (
                                <button
                                    key={market.id}
                                    type="button"
                                    role="option"
                                    aria-selected={market.cityCode === selectedMarket?.cityCode}
                                    onClick={() => chooseMarket(market)}
                                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm font-semibold transition-colors ${market.cityCode === selectedMarket?.cityCode ? 'bg-primary/15 text-primary' : 'hover:bg-primary/10'}`}
                                >
                                    <span>{market.cityName}</span>
                                    <span className="text-[10px] font-bold text-muted-foreground">{market.currencyCode}</span>
                                </button>
                            ))}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
