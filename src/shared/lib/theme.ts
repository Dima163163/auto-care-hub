export const THEME_STORAGE_KEY = 'autocare-hub-theme'

export type Theme = 'light' | 'dark'

export function isTheme(value: string | null): value is Theme {
    return value === 'light' || value === 'dark'
}

export function getInitialTheme(
    storedTheme: string | null,
    prefersDark: boolean,
): Theme {
    if (isTheme(storedTheme)) {
        return storedTheme
    }

    return prefersDark ? 'dark' : 'light'
}

export function applyTheme(
    root: Pick<HTMLElement, 'classList' | 'style'> & Partial<Pick<HTMLElement, 'dataset'>>,
    theme: Theme,
) {
    root.classList.toggle('dark', theme === 'dark')
    if (root.dataset) {
        root.dataset.theme = theme
    }
    root.style.colorScheme = theme
}
