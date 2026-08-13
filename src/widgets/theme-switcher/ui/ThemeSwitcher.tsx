import { useTheme } from '@/shared/lib/useTheme'
import { useTranslation } from '@/shared/lib/useTranslation'

export function ThemeSwitcher() {
    const { theme, toggleTheme } = useTheme()
    const { t } = useTranslation()
    const isDark = theme === 'dark'
    const label = isDark
        ? t('common.switchToLightTheme')
        : t('common.switchToDarkTheme')

    return (
        <button
            type="button"
            onClick={toggleTheme}
            role="switch"
            aria-checked={isDark}
            aria-label={label}
            title={label}
            className="group relative inline-flex h-10 w-[4.75rem] shrink-0 cursor-pointer items-center rounded-full border border-border/80 bg-muted/80 p-1 shadow-inner transition-colors duration-300 hover:border-primary/50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 dark:border-primary/40 dark:bg-primary/20"
        >
            <img src="/images/autocare/theme/sun.svg" alt="" className="absolute left-2 size-5 transition-opacity group-hover:scale-105" aria-hidden="true" />
            <img src="/images/autocare/theme/moon.svg" alt="" className="absolute right-2 size-5 transition-opacity group-hover:scale-105" aria-hidden="true" />
            <span
                className={`relative z-10 flex size-8 items-center justify-center rounded-full bg-card shadow-md ring-1 ring-border/60 transition-transform duration-300 ease-out ${
                    isDark ? 'translate-x-9' : 'translate-x-0'
                }`}
                aria-hidden="true"
            >
                <img src={isDark ? '/images/autocare/theme/moon.svg' : '/images/autocare/theme/sun.svg'} alt="" className="size-5" />
            </span>
        </button>
    )
}
