import { Suspense } from 'react'
import { Routes } from 'react-router'

import { useTranslation } from '@/shared/lib/useTranslation'
import { PageContentSkeleton } from '@/shared/ui/loading-skeleton'

import {
    renderAdminRoutes,
    renderSuperAdminRoutes,
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
        <PageContentSkeleton label={t('common.loadingPage')} />
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
                {renderSuperAdminRoutes()}
                {renderNotFoundRoute()}
            </Routes>
        </Suspense>
    )
}
