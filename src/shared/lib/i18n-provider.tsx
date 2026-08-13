import {
    type ReactNode,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from 'react'

import {
    getStoredLocale,
    getLocaleOption,
    LOCALE_STORAGE_KEY,
    normalizeLocale,
    type SupportedLocale,
} from '@/shared/config/i18n'
import { t as translate } from '@/shared/lib/i18n'
import { I18nContext, type I18nContextValue } from '@/shared/lib/i18n-context'

function getInitialLocale(): SupportedLocale {
    if (typeof window !== 'undefined') {
        const urlLocale = normalizeLocale(new URLSearchParams(window.location.search).get('lang') ?? undefined)
        if (urlLocale) return urlLocale
    }

    return getStoredLocale()
}

type I18nProviderProps = {
    children: ReactNode
}

export function I18nProvider({ children }: I18nProviderProps) {
    const [locale, setLocaleState] = useState<SupportedLocale>(getInitialLocale)

    const setLocale = useCallback((nextLocale: SupportedLocale) => {
        setLocaleState(nextLocale)

        if (typeof window === 'undefined') return

        const url = new URL(window.location.href)
        if (nextLocale === 'en') {
            url.searchParams.delete('lang')
        } else {
            url.searchParams.set('lang', nextLocale)
        }
        window.history.replaceState(window.history.state, '', url)
    }, [])

    useEffect(() => {
        window.localStorage.setItem(LOCALE_STORAGE_KEY, locale)
        document.documentElement.lang = locale
        document.documentElement.dir = getLocaleOption(locale).direction
    }, [locale])

    const value = useMemo<I18nContextValue>(
        () => ({
            locale,
            setLocale,
            t: (key, params) => translate(key, params, locale),
        }),
        [locale, setLocale],
    )

    return (
        <I18nContext.Provider value={value}>
            {children}
        </I18nContext.Provider>
    )
}
