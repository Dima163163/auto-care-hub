import {
    type ReactNode,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react'

import {
    getInitialLocale,
    getLocaleOption,
    LOCALE_STORAGE_KEY,
    type SupportedLocale,
} from '@/shared/config/i18n'
import { loadTranslations } from '@/shared/config/translations'
import { t as translate } from '@/shared/lib/i18n'
import { I18nContext, type I18nContextValue } from '@/shared/lib/i18n-context'

type I18nProviderProps = {
    children: ReactNode
}

export function I18nProvider({ children }: I18nProviderProps) {
    const [locale, setLocaleState] = useState<SupportedLocale>(getInitialLocale)
    const localeRequestRef = useRef(0)

    const setLocale = useCallback((nextLocale: SupportedLocale) => {
        const requestId = localeRequestRef.current + 1
        localeRequestRef.current = requestId

        void loadTranslations(nextLocale)
            .then(() => {
                if (localeRequestRef.current !== requestId) return

                setLocaleState(nextLocale)

                if (typeof window === 'undefined') return

                const url = new URL(window.location.href)
                if (nextLocale === 'en') {
                    url.searchParams.delete('lang')
                } else {
                    url.searchParams.set('lang', nextLocale)
                }
                window.history.replaceState(window.history.state, '', url)
            })
            .catch((error: unknown) => {
                console.error('Failed to load selected locale', error)
            })
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
