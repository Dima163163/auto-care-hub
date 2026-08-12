import { Languages } from 'lucide-react'
import { useContext } from 'react'
import { toast } from 'sonner'

import { useGetMeQuery } from '@/features/auth'
import { useUpdateUserPreferencesMutation } from '@/entities/user'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { I18nContext } from '@/shared/lib/i18n-context'
import { LOCALE_OPTIONS, type SupportedLocale } from '@/shared/config/i18n'
import { Dropdown } from '@/shared/ui/dropdown/Dropdown'
import { Button } from '@/components/ui/button'

export function LanguageSwitcher() {
    const context = useContext(I18nContext)
    const { data: user } = useGetMeQuery()
    const [updatePreferences] = useUpdateUserPreferencesMutation()

    if (!context) return null

    const { locale, setLocale, t } = context

    const items = LOCALE_OPTIONS.map((option) => ({
        label: option.nativeLabel,
        value: option.value,
    }))

    const handleSelect = (value: string) => {
        const nextLocale = value as SupportedLocale
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
        <Dropdown
            trigger={(triggerProps) => (
                <Button
                    {...triggerProps}
                    type="button"
                    aria-label={t('common.language')}
                    title={t('common.language')}
                    variant="ghost"
                    size="icon"
                    className="rounded-xl"
                >
                    <Languages className="size-5" />
                </Button>
            )}
            items={items}
            value={locale}
            onSelect={handleSelect}
        />
    )
}
