import { Moon, Sun } from 'lucide-react'

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
            className="relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full border border-border bg-muted p-0.5 shadow-inner transition-colors duration-300 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-primary/80"
        >
            <Sun
                className="absolute left-1.5 size-3.5 text-primary"
                aria-hidden="true"
            />
            <Moon
                className="absolute right-1.5 size-3.5 text-primary-foreground"
                aria-hidden="true"
            />
            <span
                className={`relative z-10 flex size-6 items-center justify-center rounded-full bg-white shadow-md transition-transform duration-300 ease-out ${
                    isDark ? 'translate-x-6' : 'translate-x-0'
                }`}
                aria-hidden="true"
            >
                {isDark ? (
                    <Moon className="size-3.5 text-primary" />
                ) : (
                    <Sun className="size-3.5 text-primary" />
                )}
            </span>
        </button>
    )
}
