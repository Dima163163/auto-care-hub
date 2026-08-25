import { Suspense } from 'react'
import { Routes, useLocation } from 'react-router'

import { ROUTES } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'
import { AutoCareResultsRouteSkeleton, PageContentSkeleton } from '@/shared/ui/loading-skeleton'

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
    const { pathname } = useLocation()

    return pathname === ROUTES.serviceDiscovery
        ? <AutoCareResultsRouteSkeleton label={t('common.loadingPage')} />
        : <PageContentSkeleton label={t('common.loadingPage')} />
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
