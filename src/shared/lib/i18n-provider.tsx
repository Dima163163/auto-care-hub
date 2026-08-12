import {
    type ReactNode,
    useEffect,
    useMemo,
    useState,
} from 'react'

import {
    getStoredLocale,
    getLocaleOption,
    LOCALE_STORAGE_KEY,
    type SupportedLocale,
} from '@/shared/config/i18n'
import { t as translate } from '@/shared/lib/i18n'
import { I18nContext, type I18nContextValue } from '@/shared/lib/i18n-context'

function getInitialLocale(): SupportedLocale {
    return getStoredLocale()
}

type I18nProviderProps = {
    children: ReactNode
}

export function I18nProvider({ children }: I18nProviderProps) {
    const [locale, setLocaleState] = useState<SupportedLocale>(getInitialLocale)

    useEffect(() => {
        window.localStorage.setItem(LOCALE_STORAGE_KEY, locale)
        document.documentElement.lang = locale
        document.documentElement.dir = getLocaleOption(locale).direction
    }, [locale])

    const value = useMemo<I18nContextValue>(
        () => ({
            locale,
            setLocale: setLocaleState,
            t: (key, params) => translate(key, params, locale),
        }),
        [locale],
    )

    return (
        <I18nContext.Provider value={value}>
            {children}
        </I18nContext.Provider>
    )
}
