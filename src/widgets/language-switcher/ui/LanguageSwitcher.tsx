import { ChevronDown, Languages } from 'lucide-react'
import { useContext } from 'react'
import { toast } from 'sonner'

import { useGetMeQuery } from '@/features/auth'
import { useUpdateUserPreferencesMutation } from '@/entities/user'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { I18nContext } from '@/shared/lib/i18n-context'
import { LOCALE_OPTIONS, type SupportedLocale } from '@/shared/config/i18n'

type LanguageSwitcherProps = {
    compact?: boolean
}

export function LanguageSwitcher({ compact = false }: LanguageSwitcherProps) {
    const context = useContext(I18nContext)
    const { data: user } = useGetMeQuery()
    const [updatePreferences] = useUpdateUserPreferencesMutation()

    if (!context) return null

    const { locale, setLocale, t } = context
    const selectedOption = LOCALE_OPTIONS.find((option) => option.value === locale) ?? LOCALE_OPTIONS[0]

    const handleSelect = (value: SupportedLocale) => {
        const nextLocale = value
        if (nextLocale === locale) return

        const previousLocale = locale
        setLocale(nextLocale)

        if (!user) return

        void updatePreferences({ locale: nextLocale })
            .unwrap()
            .catch((error) => {
                setLocale(previousLocale)
                toast.error(getApiErrorMessage(error, t('profile.preferences.updateError')))
            })
    }

    return (
        <label data-language-switcher className={`relative inline-flex h-[45px] items-center rounded-[9px] border border-current/20 text-current transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-ring/50 ${compact ? 'w-[106px]' : 'w-[156px]'}`}>
            <Languages className="language-switcher__icon pointer-events-none ml-3 size-[17px] shrink-0 opacity-85" />
            <span className="language-switcher__value pointer-events-none min-w-0 truncate px-2 text-xs font-bold" aria-hidden="true">
                {compact ? selectedOption.shortLabel : selectedOption.nativeLabel}
            </span>
            <select
                aria-label={t('common.language')}
                value={locale}
                onChange={(event) => handleSelect(event.target.value as SupportedLocale)}
                className="language-switcher__select absolute inset-0 z-10 h-full w-full cursor-pointer appearance-none opacity-0 outline-none"
            >
                {LOCALE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value} className="bg-background text-foreground">
                        {option.nativeLabel}
                    </option>
                ))}
            </select>
            <ChevronDown className="language-switcher__chevron pointer-events-none mr-2 size-3.5 shrink-0 opacity-75" aria-hidden="true" />
        </label>
    )
}
