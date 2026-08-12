import { Suspense } from 'react'
import { Routes } from 'react-router'

import { useTranslation } from '@/shared/lib/useTranslation'
import { StateCard } from '@/shared/ui/state-card'

import {
    renderAdminRoutes,
    renderAuthenticatedPublicRoutes,
    renderAuthUtilityRoutes,
    renderClientRoutes,
    renderGuestRoutes,
    renderNotFoundRoute,
    renderOwnerRoutes,
    renderPublicRoutes,
} from './route-groups'

function RouteFallback() {
    const { t } = useTranslation()

    return (
        <main className="min-h-screen bg-background px-4 py-8 lg:px-8">
            <section className="mx-auto max-w-6xl">
                <StateCard description={t('common.loadingPage')} />
            </section>
        </main>
    )
}

export function AppRouter() {
    return (
        <Suspense fallback={<RouteFallback />}>
            <Routes>
                {renderPublicRoutes()}
                {renderAuthenticatedPublicRoutes()}
                {renderClientRoutes()}
                {renderGuestRoutes()}
                {renderAuthUtilityRoutes()}
                {renderOwnerRoutes()}
                {renderAdminRoutes()}
                {renderNotFoundRoute()}
            </Routes>
        </Suspense>
    )
}
