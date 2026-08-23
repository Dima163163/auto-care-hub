'use client'

import { StrictMode, useEffect, useState } from 'react'
import { BrowserRouter } from 'react-router'

import { NextApp } from '@/app/next/NextApp'
import { StoreProvider } from '@/app/store'
import { getInitialLocale } from '@/shared/config/i18n'
import { loadTranslations } from '@/shared/config/translations'
import { installChunkLoadRecovery } from '@/shared/lib/chunk-load-recovery'
import {
    applyTheme,
    getInitialTheme,
    THEME_STORAGE_KEY,
} from '@/shared/lib/theme'

const shouldEnableMocking =
    process.env.NEXT_PUBLIC_API_MODE === 'mock'
    && process.env.NEXT_PUBLIC_ENABLE_MSW !== 'false'

function NextShellSkeleton() {
    return (
        <div aria-busy="true" className="min-h-screen bg-background">
            <div className="h-16 border-b border-border bg-card" />
            <main className="mx-auto min-h-[70vh] max-w-[var(--layout-public-max)] px-[var(--layout-gutter)] py-8">
                <div className="h-32 animate-pulse rounded-[var(--radius-panel)] bg-muted" />
            </main>
            <div className="h-48 bg-card" />
        </div>
    )
}

async function enableMocking() {
    if (!shouldEnableMocking) {
        return
    }

    const { worker } = await import('@/app/mocks/browser')

    await worker.start({
        onUnhandledRequest(request) {
            if (new URL(request.url).pathname.startsWith('/api/')) {
                throw new Error(`Unhandled mock API request: ${request.method} ${request.url}`)
            }
        },
    })
}

export function NextClientApp() {
    const [ready, setReady] = useState(false)

    useEffect(() => {
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
            loadTranslations(getInitialLocale()),
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
