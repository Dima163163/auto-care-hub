import { SUPPORTED_LOCALES } from '@/shared/config/i18n'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/shared/lib/useTranslation'

export function LanguageSwitcher() {
    const { locale, setLocale, t } = useTranslation()

    return (
        <div className="flex items-center gap-2" aria-label={t('common.language')}>
            {SUPPORTED_LOCALES.map((item) => {
                const isActive = item === locale

                return (
                    <Button
                        key={item}
                        type="button"
                        size="sm"
                        variant={isActive ? 'default' : 'outline'}
                        disabled={isActive}
                        aria-pressed={isActive}
                        onClick={() => setLocale(item)}
                    >
                        {item.toUpperCase()}
                    </Button>
                )
            })}
        </div>
    )
}