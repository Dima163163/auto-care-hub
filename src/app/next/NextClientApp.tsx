'use client'

import { StrictMode, useEffect, useState } from 'react'
import { BrowserRouter } from 'react-router'

import { NextApp } from '@/app/next/NextApp'
import { StoreProvider } from '@/app/store'
import { getInitialLocale, getLocaleOption } from '@/shared/config/i18n'
import { loadTranslations } from '@/shared/config/translations'
import { IS_MOCK_API } from '@/shared/config/api'
import { readPublicEnv } from '@/shared/config/runtime-env'
import { installChunkLoadRecovery } from '@/shared/lib/chunk-load-recovery'
import { BrandLogo } from '@/shared/ui/brand-logo'
import {
    applyTheme,
    getInitialTheme,
    THEME_STORAGE_KEY,
} from '@/shared/lib/theme'

const shouldEnableMocking =
    IS_MOCK_API
    && readPublicEnv('VITE_ENABLE_MSW') !== 'false'
const strictMocking = readPublicEnv('VITE_MSW_STRICT') === 'true'
let mockingPromise: Promise<void> | null = null

function NextShellSkeleton() {
    return (
        <div aria-busy="true" aria-label="Loading AutoCare Hub" className="flex min-h-screen flex-col bg-background text-foreground">
            <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center border-b border-primary-foreground/10 bg-hero-overlay px-[var(--layout-gutter)] text-primary-foreground md:h-[84px]">
                <div className="mx-auto flex w-full max-w-[var(--layout-public-max)] items-center justify-between gap-4">
                    <BrandLogo size="sm" />
                    <div className="flex items-center gap-2" aria-hidden="true">
                        <span className="hidden h-9 w-24 animate-pulse rounded-[var(--radius-control)] bg-primary-foreground/10 sm:block" />
                        <span className="h-9 w-20 animate-pulse rounded-[var(--radius-control)] bg-primary-foreground/10" />
                        <span className="size-9 animate-pulse rounded-full bg-primary-foreground/10" />
                    </div>
                </div>
            </header>
            <main className="flex min-h-[calc(100dvh-16rem)] flex-1 items-start">
                <div className="mx-auto w-full max-w-[var(--layout-public-max)] px-[var(--layout-gutter)] py-8" role="status">
                    <div className="h-8 w-56 animate-pulse rounded bg-muted" />
                    <div className="mt-4 h-4 max-w-xl animate-pulse rounded bg-muted" />
                    <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.7fr)]">
                        <div className="h-64 animate-pulse rounded-[var(--radius-panel)] bg-muted" />
                        <div className="h-64 animate-pulse rounded-[var(--radius-panel)] bg-muted" />
                    </div>
                </div>
            </main>
            <footer className="flex min-h-40 shrink-0 items-end bg-hero-overlay px-[var(--layout-gutter)] py-8 text-primary-foreground">
                <div className="mx-auto flex w-full max-w-[var(--layout-public-max)] items-center justify-between gap-6" aria-hidden="true">
                    <BrandLogo size="sm" />
                    <div className="hidden gap-3 sm:flex"><span className="h-3 w-24 animate-pulse rounded bg-primary-foreground/10" /><span className="h-3 w-20 animate-pulse rounded bg-primary-foreground/10" /><span className="h-3 w-28 animate-pulse rounded bg-primary-foreground/10" /></div>
                </div>
            </footer>
        </div>
    )
}

async function enableMocking() {
    if (!shouldEnableMocking) {
        return
    }

    if (mockingPromise) {
        return mockingPromise
    }

    mockingPromise = (async () => {
        const { worker } = await import('@/app/mocks/browser')

        await worker.start({
            onUnhandledRequest(request) {
                if (new URL(request.url).pathname.startsWith('/api/')) {
                    const message = `Unhandled mock API request: ${request.method} ${request.url}`
                    if (strictMocking) {
                        throw new Error(message)
                    }
                    console.warn(`[MSW] ${message}`)
                }
            },
        })
    })()

    return mockingPromise
}

export function NextClientApp() {
    const [ready, setReady] = useState(false)

    useEffect(() => {
        const initialLocale = getInitialLocale()
        document.documentElement.lang = initialLocale
        document.documentElement.dir = getLocaleOption(initialLocale).direction
        applyTheme(
            document.documentElement,
            getInitialTheme(
                window.localStorage.getItem(THEME_STORAGE_KEY),
                window.matchMedia('(prefers-color-scheme: dark)').matches,
            ),
        )
        installChunkLoadRecovery()

        void Promise.all([
            enableMocking(),
            loadTranslations(initialLocale),
        ]).finally(() => {
            setReady(true)
        })
    }, [])

    if (!ready) {
        return <NextShellSkeleton />
    }

    return (
        <StrictMode>
            <StoreProvider>
                <BrowserRouter>
                    <NextApp />
                </BrowserRouter>
            </StoreProvider>
        </StrictMode>
    )
}
