import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { ChevronDown, MapPin } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router'

import { useGetAutoCareMarketsQuery, type AutoCareApiMarket } from '@/entities/automotive-service'
import { ROUTES } from '@/shared/constants/routes'
import { AUTOCARE_MARKET_CHANGE_EVENT, readAutoCareMarketPreference, setAutoCareMarketPreference } from '@/shared/lib/market-preference'
import { useTranslation } from '@/shared/lib/useTranslation'

type MarketSwitcherProps = {
    variant?: 'dark' | 'surface'
    compact?: boolean
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
    const { data: markets = [], isLoading, isError, refetch } = useGetAutoCareMarketsQuery()
    const [isOpen, setIsOpen] = useState(false)
    const [storedMarketId, setStoredMarketId] = useState(() => readAutoCareMarketPreference())
    const rootRef = useRef<HTMLDivElement | null>(null)
    const triggerRef = useRef<HTMLButtonElement | null>(null)
    const optionRefs = useRef<Array<HTMLButtonElement | null>>([])
    const queryMarketId = new URLSearchParams(location.search).get('market')
    const selectedMarketId = queryMarketId ?? storedMarketId
    const groups = useMemo(() => groupMarkets(markets), [markets])
    const flatMarkets = useMemo(() => groups.flatMap((group) => group.markets), [groups])
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

    useEffect(() => {
        if (!isOpen || flatMarkets.length === 0) return

        const selectedIndex = Math.max(0, flatMarkets.findIndex((market) => market.cityCode === selectedMarket?.cityCode))
        optionRefs.current[selectedIndex]?.focus()
    }, [flatMarkets, isOpen, selectedMarket?.cityCode])

    useEffect(() => {
        const syncMarket = () => setStoredMarketId(readAutoCareMarketPreference())
        window.addEventListener(AUTOCARE_MARKET_CHANGE_EVENT, syncMarket)
        return () => window.removeEventListener(AUTOCARE_MARKET_CHANGE_EVENT, syncMarket)
    }, [])

    const chooseMarket = (market: AutoCareApiMarket) => {
        setStoredMarketId(market.cityCode)
        setAutoCareMarketPreference(market.cityCode)
        setIsOpen(false)
        const params = new URLSearchParams(location.search)
        params.set('market', market.cityCode)
        params.delete('zone')
        const query = params.toString()
        const target = location.pathname === ROUTES.home ? ROUTES.home : ROUTES.serviceDiscovery
        navigate(`${target}${query ? `?${query}` : ''}`)
    }

    const openWithKeyboard = (event: KeyboardEvent<HTMLButtonElement>) => {
        if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            setIsOpen(true)
        }
        if (event.key === 'Escape') {
            event.preventDefault()
            setIsOpen(false)
        }
    }

    const handleOptionKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
        if (event.key === 'ArrowDown') {
            event.preventDefault()
            optionRefs.current[(index + 1) % flatMarkets.length]?.focus()
        } else if (event.key === 'ArrowUp') {
            event.preventDefault()
            optionRefs.current[(index - 1 + flatMarkets.length) % flatMarkets.length]?.focus()
        } else if (event.key === 'Home') {
            event.preventDefault()
            optionRefs.current[0]?.focus()
        } else if (event.key === 'End') {
            event.preventDefault()
            optionRefs.current[flatMarkets.length - 1]?.focus()
        } else if (event.key === 'Escape') {
            event.preventDefault()
            setIsOpen(false)
            triggerRef.current?.focus()
        }
    }

    return (
        <div ref={rootRef} data-market-switcher className="relative shrink-0">
            <button
                ref={triggerRef}
                type="button"
                disabled={isLoading}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-label={`${t('autocare.locationLabel')}: ${label}`}
                onClick={() => setIsOpen((value) => !value)}
                onKeyDown={openWithKeyboard}
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
                    {isError ? (
                        <div className="grid gap-2 px-2 py-3 text-xs text-muted-foreground">
                            <p>{t('common.failedToLoad')}</p>
                            <button type="button" onClick={() => void refetch()} className="justify-self-start rounded-md bg-primary px-2.5 py-1.5 font-bold text-primary-foreground hover:bg-primary/90">
                                {t('common.retry')}
                            </button>
                        </div>
                    ) : groups.map((group) => (
                        <div key={group.country} className="pb-2 last:pb-0">
                            <p className="px-2 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">{group.country}</p>
                            {group.markets.map((market) => {
                                const optionIndex = flatMarkets.findIndex((item) => item.id === market.id)

                                return (
                                <button
                                    key={market.id}
                                    ref={(node) => { optionRefs.current[optionIndex] = node }}
                                    type="button"
                                    role="option"
                                    aria-selected={market.cityCode === selectedMarket?.cityCode}
                                    onClick={() => chooseMarket(market)}
                                    onKeyDown={(event) => handleOptionKeyDown(event, optionIndex)}
                                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm font-semibold transition-colors ${market.cityCode === selectedMarket?.cityCode ? 'bg-primary/15 text-primary' : 'hover:bg-primary/10'}`}
                                >
                                    <span>{market.cityName}</span>
                                    <span className="text-[10px] font-bold text-muted-foreground">{market.currencyCode}</span>
                                </button>
                                )
                            })}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
