import { Navigate, Route } from 'react-router'

import { AdminLayout } from '@/app/layouts/admin-layout'
import { AuthLayout } from '@/app/layouts/auth-layout'
import { OwnerLayout } from '@/app/layouts/owner-layout'
import { PublicLayout } from '@/app/layouts/public-layout'
import { RequireAuth, RequireGuest } from '@/features/auth'
import { ROUTES } from '@/shared/constants/routes'
import { RouteErrorBoundary } from '@/shared/ui/route-error-boundary'

import {
    AboutPage,
    AgreementPage,
    AutoCareResultsPage,
    AutoCareProviderPage,
    AutoCareRequestPage,
    AdminAuditLogsPage,
    AdminDashboardPage,
    AdminOwnersPage,
    AdminReviewsPage,
    AdminPlatformReviewsPage,
    AdminUsersPage,
    SecurityCenterPage,
    SuperAdminDashboardPage,
    BlogPage,
    ContactsPage,
    EmailVerificationPage,
    FavoritesPage,
    FeaturesPage,
    ForgotPasswordPage,
    HelpPage,
    HomePage,
    LoginCallbackPage,
    LoginPage,
    NotFoundPage,
    NotificationsPage,
    OnboardingPage,
    OwnerAutoCareRequestsPage,
    OwnerClientsPage,
    OwnerAutoCareProvidersPage,
    OwnerAutoCareProviderDetailsPage,
    OwnerAutoCareProviderReviewsPage,
    OwnerDashboardPage,
    OwnerServicesPage,
    OwnersPage,
    PartnersPage,
    PasswordResetPage,
    PasswordSetupPage,
    PricingPage,
    PrivacyPage,
    ProfileBookingsPage,
    ProfilePage,
    ProfileReviewsPage,
    ProfileVehiclesPage,
    PlatformReviewsPage,
    RegisterPage,
    RulesPage,
} from './lazy-pages'

export function renderPublicRoutes() {
    return (
        <Route element={<RouteErrorBoundary><PublicLayout /></RouteErrorBoundary>}>
            <Route path={ROUTES.home} element={<HomePage />} />
            <Route path={ROUTES.platformReviews} element={<PlatformReviewsPage />} />
            <Route path={ROUTES.features} element={<FeaturesPage />} />
            <Route path={ROUTES.owners} element={<OwnersPage />} />
            <Route path={ROUTES.pricing} element={<PricingPage />} />
            <Route path={ROUTES.about} element={<AboutPage />} />
            <Route path={ROUTES.favorites} element={<FavoritesPage />} />
            <Route path={ROUTES.blog} element={<BlogPage />} />
            <Route path={ROUTES.partners} element={<PartnersPage />} />
            <Route path={ROUTES.contacts} element={<ContactsPage />} />
            <Route path={ROUTES.help} element={<HelpPage />} />
            <Route path={ROUTES.agreement} element={<AgreementPage />} />
            <Route path={ROUTES.rules} element={<RulesPage />} />
            <Route path={ROUTES.privacy} element={<PrivacyPage />} />
            <Route path={ROUTES.cabinets} element={<Navigate replace to={ROUTES.serviceDiscovery} />} />
            <Route path={ROUTES.serviceDiscovery} element={<AutoCareResultsPage />} />
            <Route path={ROUTES.serviceProviderDetails} element={<AutoCareProviderPage />} />
            <Route path={ROUTES.serviceRequest} element={<AutoCareRequestPage />} />
            <Route path={ROUTES.cabinetDetails} element={<Navigate replace to={ROUTES.serviceDiscovery} />} />
        </Route>
    )
}

export function renderAuthenticatedPublicRoutes() {
    return (
        <Route
            element={
                <RouteErrorBoundary>
                    <RequireAuth>
                        <PublicLayout />
                    </RequireAuth>
                </RouteErrorBoundary>
            }
        >
            <Route path={ROUTES.profile} element={<ProfilePage />} />
            <Route path={ROUTES.onboarding} element={<OnboardingPage />} />
            <Route path={ROUTES.notifications} element={<NotificationsPage />} />
        </Route>
    )
}

export function renderClientRoutes() {
    return (
        <Route
            element={
                <RouteErrorBoundary>
                    <RequireAuth allowedRoles={['client']}>
                        <PublicLayout />
                    </RequireAuth>
                </RouteErrorBoundary>
            }
        >
            <Route path={ROUTES.profileBookings} element={<ProfileBookingsPage />} />
            <Route path={ROUTES.profileReviews} element={<ProfileReviewsPage />} />
            <Route path={ROUTES.profileVehicles} element={<ProfileVehiclesPage />} />
        </Route>
    )
}

export function renderGuestRoutes() {
    return (
        <Route
            element={
                <RouteErrorBoundary>
                    <RequireGuest>
                        <AuthLayout />
                    </RequireGuest>
                </RouteErrorBoundary>
            }
        >
            <Route path={ROUTES.login} element={<LoginPage />} />
            <Route path={ROUTES.loginCallback} element={<LoginCallbackPage />} />
            <Route path={ROUTES.register} element={<RegisterPage />} />
            <Route path={ROUTES.forgotPassword} element={<ForgotPasswordPage />} />
        </Route>
    )
}

export function renderAuthUtilityRoutes() {
    return (
        <Route element={<RouteErrorBoundary><AuthLayout /></RouteErrorBoundary>}>
            <Route path={ROUTES.passwordSetup} element={<PasswordSetupPage />} />
            <Route path={ROUTES.passwordReset} element={<PasswordResetPage />} />
            <Route path={ROUTES.verifyEmail} element={<EmailVerificationPage />} />
        </Route>
    )
}

export function renderOwnerRoutes() {
    return (
        <Route
            element={
                <RouteErrorBoundary>
                    <RequireAuth allowedRoles={['owner']}>
                        <OwnerLayout />
                    </RequireAuth>
                </RouteErrorBoundary>
            }
        >
            <Route path={ROUTES.ownerDashboard} element={<OwnerDashboardPage />} />
            <Route path={ROUTES.ownerAutoCareProviders} element={<OwnerAutoCareProvidersPage />} />
            <Route path={ROUTES.ownerAutoCareProviderDetails} element={<OwnerAutoCareProviderDetailsPage />} />
            <Route path={ROUTES.ownerAutoCareProviderReviews} element={<OwnerAutoCareProviderReviewsPage />} />
            <Route path={ROUTES.ownerCabinets} element={<Navigate replace to={ROUTES.ownerAutoCareProviders} />} />
            <Route path={ROUTES.ownerCabinetCreate} element={<Navigate replace to={ROUTES.ownerAutoCareProviders} />} />
            <Route path={ROUTES.ownerCabinetEdit} element={<Navigate replace to={ROUTES.ownerAutoCareProviders} />} />
            <Route path={ROUTES.ownerBookings} element={<Navigate replace to={ROUTES.ownerAutoCareRequests} />} />
            <Route path={ROUTES.ownerAutoCareRequests} element={<OwnerAutoCareRequestsPage />} />
            <Route path={ROUTES.ownerClients} element={<OwnerClientsPage />} />
            <Route path={ROUTES.ownerServices} element={<OwnerServicesPage />} />
        </Route>
    )
}

export function renderAdminRoutes() {
    return (
        <Route
            element={
                <RouteErrorBoundary>
                    <RequireAuth allowedRoles={['admin', 'super_admin']}>
                        <AdminLayout />
                    </RequireAuth>
                </RouteErrorBoundary>
            }
        >
            <Route path={ROUTES.adminDashboard} element={<AdminDashboardPage />} />
            <Route path={ROUTES.adminUsers} element={<AdminUsersPage />} />
            <Route path={ROUTES.adminOwners} element={<AdminOwnersPage />} />
            <Route path={ROUTES.adminCabinets} element={<Navigate replace to={ROUTES.adminDashboard} />} />
            <Route path={ROUTES.adminReviews} element={<AdminReviewsPage />} />
            <Route path={ROUTES.adminPlatformReviews} element={<AdminPlatformReviewsPage />} />
            <Route path={ROUTES.adminAuditLogs} element={<AdminAuditLogsPage />} />
            <Route path={ROUTES.adminSecurityCenter} element={<SecurityCenterPage />} />
        </Route>
    )
}

export function renderSuperAdminRoutes() {
    return (
        <Route
            element={
                <RouteErrorBoundary>
                    <RequireAuth allowedRoles={['super_admin']}>
                        <AdminLayout />
                    </RequireAuth>
                </RouteErrorBoundary>
            }
        >
            <Route path={ROUTES.superAdminDashboard} element={<SuperAdminDashboardPage />} />
        </Route>
    )
}

export function renderNotFoundRoute() {
    return <Route path="*" element={<NotFoundPage />} />
}
