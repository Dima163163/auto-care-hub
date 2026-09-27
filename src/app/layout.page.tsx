import type { ReactNode } from 'react'
import type { Metadata } from 'next'

import { getAppMetadata, getRequestLocale } from './metadata'
import '../index.css'

const themeBootstrap = `(() => {
    try {
        const storedTheme = window.localStorage.getItem('autocare-hub-theme')
        const theme = storedTheme === 'light' || storedTheme === 'dark'
            ? storedTheme
            : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        document.documentElement.classList.toggle('dark', theme === 'dark')
        document.documentElement.dataset.theme = theme
        document.documentElement.style.colorScheme = theme
    } catch {
        // Keep the default light tokens when storage or matchMedia is blocked.
    }
})()`

// eslint-disable-next-line react-refresh/only-export-components
export async function generateMetadata(): Promise<Metadata> {
    return getAppMetadata(await getRequestLocale())
}

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
    const initialLanguage = await getRequestLocale()
    return (
        <html lang={initialLanguage} suppressHydrationWarning>
            <head>
                {/*
                    This is deliberately a parser-blocking inline script, rather
                    than a client component or next/script. It restores the saved
                    theme before the body (and its loading skeletons) can paint,
                    so dark mode never flashes a light skeleton surface.
                */}
                <script id="autocare-theme-bootstrap" dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
            </head>
            <body>{children}</body>
        </html>
    )
}
