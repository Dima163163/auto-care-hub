import {
    DEFAULT_LOCALE,
    type SupportedLocale,
} from '@/shared/config/i18n'
import {
    translations,
    type TranslationSchema,
} from '@/shared/config/translations'

type DeepKey<T extends object> = {
    [Key in keyof T & string]: T[Key] extends string
        ? Key
        : T[Key] extends object
            ? `${Key}.${DeepKey<Extract<T[Key], object>>}`
            : never
}[keyof T & string]

export type TranslationKey = DeepKey<TranslationSchema>

export type TranslationParams = Record<string, string | number>

function getTranslationValue(
    locale: SupportedLocale,
    key: TranslationKey,
) {
    const path = key.split('.')

    let currentValue: unknown = translations[locale]

    for (const pathItem of path) {
        if (
            typeof currentValue !== 'object' ||
            currentValue === null ||
            !(pathItem in currentValue)
        ) {
            return undefined
        }

        currentValue = (currentValue as Record<string, unknown>)[pathItem]
    }

    return typeof currentValue === 'string'
        ? currentValue
        : undefined
}

function interpolateTranslation(
    value: string,
    params?: TranslationParams,
) {
    if (!params) {
        return value
    }

    return value.replace(/\{\{(\w+)}}/g, (_, paramName: string) => {
        const paramValue = params[paramName]

        return paramValue === undefined
            ? ''
            : String(paramValue)
    })
}

export function t(
    key: TranslationKey,
    params?: TranslationParams,
    locale: SupportedLocale = DEFAULT_LOCALE,
) {
    const translation =
        getTranslationValue(locale, key) ??
        getTranslationValue(DEFAULT_LOCALE, key) ??
        key

    return interpolateTranslation(translation, params)
}
