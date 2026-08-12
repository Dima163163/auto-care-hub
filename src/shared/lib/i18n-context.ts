import { createContext } from 'react'

import type { SupportedLocale } from '@/shared/config/i18n'
import type { TranslationKey } from '@/shared/lib/i18n'

export type TranslationParams = Record<string, string | number>

export type I18nContextValue = {
    locale: SupportedLocale
    setLocale: (locale: SupportedLocale) => void
    t: (key: TranslationKey, params?: TranslationParams) => string
}

export const I18nContext = createContext<I18nContextValue | null>(null)