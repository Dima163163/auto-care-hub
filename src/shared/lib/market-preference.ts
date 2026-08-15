export const AUTOCARE_MARKET_STORAGE_KEY = 'autocare.selected-market'
export const AUTOCARE_MARKET_CHANGE_EVENT = 'autocare:market-change'
export const DEFAULT_AUTOCARE_MARKET = 'moscow'

export function readAutoCareMarketPreference(search = '') {
    const queryMarket = new URLSearchParams(search).get('market')?.trim()
    if (queryMarket) return queryMarket

    if (typeof window === 'undefined') return DEFAULT_AUTOCARE_MARKET

    try {
        return window.localStorage.getItem(AUTOCARE_MARKET_STORAGE_KEY)?.trim() || DEFAULT_AUTOCARE_MARKET
    } catch {
        return DEFAULT_AUTOCARE_MARKET
    }
}

export function setAutoCareMarketPreference(cityCode: string) {
    const nextMarket = cityCode.trim()
    if (!nextMarket || typeof window === 'undefined') return

    try {
        window.localStorage.setItem(AUTOCARE_MARKET_STORAGE_KEY, nextMarket)
    } catch {
        // Private browsing may block storage; the current page state remains usable.
    }

    window.dispatchEvent(new CustomEvent(AUTOCARE_MARKET_CHANGE_EVENT, { detail: nextMarket }))
}
