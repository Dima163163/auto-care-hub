import {
    type ReactNode,
    useEffect,
    useMemo,
    useState,
} from 'react'

import {
    applyTheme,
    getInitialTheme,
    THEME_STORAGE_KEY,
    type Theme,
} from '@/shared/lib/theme'
import {
    ThemeContext,
    type ThemeContextValue,
} from '@/shared/lib/theme-context'
import { readBrowserPreference, saveBrowserPreference } from './browser-preferences-storage'

function readInitialTheme(): Theme {
    if (typeof window === 'undefined') {
        return 'light'
    }

    return getInitialTheme(
        readBrowserPreference(THEME_STORAGE_KEY),
        window.matchMedia('(prefers-color-scheme: dark)').matches,
    )
}

type ThemeProviderProps = {
    children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
    const [theme, setTheme] = useState<Theme>(readInitialTheme)

    useEffect(() => {
        saveBrowserPreference(THEME_STORAGE_KEY, theme)
        applyTheme(document.documentElement, theme)
    }, [theme])

    const value = useMemo<ThemeContextValue>(
        () => ({
            theme,
            setTheme,
            toggleTheme: () => {
                setTheme((currentTheme) =>
                    currentTheme === 'light' ? 'dark' : 'light'
                )
            },
        }),
        [theme],
    )

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    )
}
