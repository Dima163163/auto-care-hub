'use client'

import { StrictMode, useEffect, useLayoutEffect, useState } from 'react'
import { BrowserRouter } from 'react-router'

import { NextApp } from '@/app/next/NextApp'
import { StoreProvider } from '@/app/store'
import { getInitialLocale, getLocaleOption } from '@/shared/config/i18n'
import { ROUTES } from '@/shared/constants/routes'
import { loadTranslations } from '@/shared/config/translations'
import { IS_MOCK_API } from '@/shared/config/api'
import { readPublicEnv } from '@/shared/config/runtime-env'
import { installChunkLoadRecovery } from '@/shared/lib/chunk-load-recovery'
import { BootShell, type BootWorkspaceRole } from '@/shared/ui/boot-shell/BootShell'
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

async function enableMocking() {
    if (!shouldEnableMocking) {
        return
    }

    if (mockingPromise) {
        return mockingPromise
    }

    mockingPromise = (async () => {
        try {
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
        } catch (error) {
            // Mocking must never block the application shell. API queries expose
            // their own error/retry states when the worker cannot be registered.
            console.warn('[AutoCare Hub mock API] worker unavailable', error)
        }
    })()

    return mockingPromise
}

type NextClientAppProps = {
    initialPathname?: string
}

function getBootWorkspaceRole(pathname: string): BootWorkspaceRole | undefined {
    if (pathname.startsWith('/owner/')) return 'owner'
    if (pathname.startsWith('/super-admin/')) return 'super_admin'
    if (pathname.startsWith('/admin/')) return 'admin'
    if (pathname === ROUTES.profile || pathname.startsWith(`${ROUTES.profile}/`) || pathname === ROUTES.notifications || pathname === ROUTES.chats) return 'client'

    return undefined
}

export function NextClientApp({ initialPathname = '/' }: NextClientAppProps) {
    const [ready, setReady] = useState(false)

    useLayoutEffect(() => {
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
    }, [])

    useEffect(() => {
        // The shell keeps header/footer visible while the route tree is being
        // prepared. In mock mode the worker must be ready before RTK Query
        // mounts: otherwise the first request can reach the real API and
        // return a UUID validation error before MSW takes control.
        void Promise.all([
            enableMocking(),
            loadTranslations(getInitialLocale()),
        ]).finally(() => {
            setReady(true)
        })
    }, [])

    if (!ready) {
        return <BootShell home={initialPathname === ROUTES.home} services={initialPathname === ROUTES.serviceDiscovery} workspaceRole={getBootWorkspaceRole(initialPathname)} />
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
