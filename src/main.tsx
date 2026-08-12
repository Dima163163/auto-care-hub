import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'

import './index.css'
import { App } from '@/app/App'
import { StoreProvider } from '@/app/store'
import { installChunkLoadRecovery } from '@/shared/lib/chunk-load-recovery'
import {
    applyTheme,
    getInitialTheme,
    THEME_STORAGE_KEY,
} from '@/shared/lib/theme'

const SHOULD_ENABLE_MSW =
    import.meta.env.VITE_API_MODE === 'mock'
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
        onUnhandledRequest: 'bypass',
    })
}


enableMocking().then(() => {
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
