import { Languages } from 'lucide-react'
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
        <label className={`relative inline-flex h-[45px] items-center rounded-[9px] border border-current/20 text-current ${compact ? 'w-[106px]' : 'w-[156px]'}`}>
            <Languages className="pointer-events-none ml-3 size-[17px] shrink-0 opacity-85" />
            <select
                aria-label={t('common.language')}
                value={locale}
                onChange={(event) => handleSelect(event.target.value as SupportedLocale)}
                className="h-full min-w-0 flex-1 cursor-pointer appearance-none bg-transparent pl-2 pr-2 text-xs font-bold outline-none"
            >
                {LOCALE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value} className="bg-background text-foreground">
                        {compact ? option.shortLabel : option.nativeLabel}
                    </option>
                ))}
            </select>
        </label>
    )
}
