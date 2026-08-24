import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'

import './index.css'
import { App } from '@/app/App'
import { StoreProvider } from '@/app/store'
import { IS_MOCK_API } from '@/shared/config/api'
import { getInitialLocale } from '@/shared/config/i18n'
import { loadTranslations } from '@/shared/config/translations'
import { installChunkLoadRecovery } from '@/shared/lib/chunk-load-recovery'
import {
    applyTheme,
    getInitialTheme,
    THEME_STORAGE_KEY,
} from '@/shared/lib/theme'

const SHOULD_ENABLE_MSW =
    IS_MOCK_API
    && import.meta.env.VITE_ENABLE_MSW !== 'false'

applyTheme(
    document.documentElement,
    getInitialTheme(
        window.localStorage.getItem(THEME_STORAGE_KEY),
        window.matchMedia('(prefers-color-scheme: dark)').matches,
    ),
)

installChunkLoadRecovery()

async function enableMocking() {
    if (!SHOULD_ENABLE_MSW) {
        return
    }

    const { worker } = await import('@/app/mocks/browser')

    return worker.start({
        onUnhandledRequest(request) {
            // Mock mode must never silently fall through to a real backend. Keep
            // static assets and navigation requests bypassed, but fail loudly
            // for an API route missing from the mock contract.
            if (new URL(request.url).pathname.startsWith('/api/')) {
                throw new Error(`Unhandled mock API request: ${request.method} ${request.url}`)
            }
        },
    })
}


Promise.all([
    enableMocking(),
    loadTranslations(getInitialLocale()),
]).then(() => {
    createRoot(document.getElementById('root')!).render(
        <StrictMode>
            <StoreProvider>
                <BrowserRouter>
                    <App />
                </BrowserRouter>
            </StoreProvider>
        </StrictMode>,
    )
})
