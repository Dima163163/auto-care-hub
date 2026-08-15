import { lazy } from 'react'

export const HomePage = lazy(() =>
    import('@/pages/autocare-home').then((module) => ({
        default: module.AutoCareHomePage,
    })),
)

export const PlatformReviewsPage = lazy(() =>
    import('@/pages/platform-reviews').then((module) => ({
        default: module.PlatformReviewsPage,
    })),
)

export const AutoCareResultsPage = lazy(() =>
    import('@/pages/autocare-results').then((module) => ({
        default: module.AutoCareResultsPage,
    })),
)

export const AutoCareProviderPage = lazy(() =>
    import('@/pages/autocare-provider').then((module) => ({
        default: module.AutoCareProviderPage,
    })),
)

export const AutoCareRequestPage = lazy(() =>
    import('@/pages/autocare-request').then((module) => ({
        default: module.AutoCareRequestPage,
    })),
)

export const FeaturesPage = lazy(() =>
    import('@/pages/marketing').then((module) => ({
        default: module.FeaturesPage,
    })),
)

export const OwnersPage = lazy(() =>
    import('@/pages/marketing').then((module) => ({
        default: module.OwnersPage,
    })),
)

export const AboutPage = lazy(() =>
    import('@/pages/marketing').then((module) => ({
        default: module.AboutPage,
    })),
)

export const FavoritesPage = lazy(() =>
    import('@/pages/favorites').then((module) => ({
        default: module.FavoritesPage,
    })),
)

export const NotificationsPage = lazy(() =>
    import('@/pages/notifications').then((module) => ({
        default: module.NotificationsPage,
    })),
)

export const BlogPage = lazy(() =>
    import('@/pages/info').then((module) => ({
        default: module.BlogPage,
    })),
)

export const PartnersPage = lazy(() =>
    import('@/pages/info').then((module) => ({
        default: module.PartnersPage,
    })),
)

export const ContactsPage = lazy(() =>
    import('@/pages/info').then((module) => ({
        default: module.ContactsPage,
    })),
)

export const HelpPage = lazy(() =>
    import('@/pages/info').then((module) => ({
        default: module.HelpPage,
    })),
)

export const RulesPage = lazy(() =>
    import('@/pages/info').then((module) => ({
        default: module.RulesPage,
    })),
)

export const AgreementPage = lazy(() =>
    import('@/pages/info').then((module) => ({
        default: module.AgreementPage,
    })),
)

export const PrivacyPage = lazy(() =>
    import('@/pages/info').then((module) => ({
        default: module.PrivacyPage,
    })),
)

export const RegisterPage = lazy(() =>
    import('@/pages/register').then((module) => ({
        default: module.RegisterPage,
    })),
)

export const OnboardingPage = lazy(() =>
    import('@/pages/onboarding').then((module) => ({
        default: module.OnboardingPage,
    })),
)

export const LoginCallbackPage = lazy(() =>
    import('@/pages/login-callback').then((module) => ({
        default: module.LoginCallbackPage,
    })),
)

export const LoginPage = lazy(() =>
    import('@/pages/login').then((module) => ({
        default: module.LoginPage,
    })),
)

export const PasswordSetupPage = lazy(() =>
    import('@/pages/password-setup').then((module) => ({
        default: module.PasswordSetupPage,
    })),
)

export const ForgotPasswordPage = lazy(() =>
    import('@/pages/forgot-password').then((module) => ({
        default: module.ForgotPasswordPage,
    })),
)

export const PasswordResetPage = lazy(() =>
    import('@/pages/password-reset').then((module) => ({
        default: module.PasswordResetPage,
    })),
)

export const EmailVerificationPage = lazy(() =>
    import('@/pages/email-verification').then((module) => ({
        default: module.EmailVerificationPage,
    })),
)

export const ProfilePage = lazy(() =>
    import('@/pages/profile').then((module) => ({
        default: module.ProfilePage,
    })),
)

export const ProfileVehiclesPage = lazy(() =>
    import('@/pages/profile-vehicles').then((module) => ({
        default: module.ProfileVehiclesPage,
    })),
)

export const ProfileBookingsPage = lazy(() =>
    import('@/pages/profile-bookings').then((module) => ({
        default: module.ProfileBookingsPage,
    })),
)

export const ProfileReviewsPage = lazy(() =>
    import('@/pages/profile-reviews').then((module) => ({
        default: module.ProfileReviewsPage,
    })),
)

export const ChatsPage = lazy(() =>
    import('@/pages/chats').then((module) => ({
        default: module.ChatsPage,
    })),
)

export const OwnerDashboardPage = lazy(() =>
    import('@/pages/owner-dashboard').then((module) => ({
        default: module.OwnerDashboardPage,
    })),
)

export const OwnerAutoCareProvidersPage = lazy(() =>
    import('@/pages/owner-autocare-providers').then((module) => ({
        default: module.OwnerAutoCareProvidersPage,
    })),
)

export const OwnerAutoCareProviderDetailsPage = lazy(() =>
    import('@/pages/owner-autocare-provider-details').then((module) => ({
        default: module.OwnerAutoCareProviderDetailsPage,
    })),
)

export const OwnerAutoCareProviderReviewsPage = lazy(() =>
    import('@/pages/owner-autocare-provider-reviews').then((module) => ({
        default: module.OwnerAutoCareProviderReviewsPage,
    })),
)

export const OwnerAutoCareRequestsPage = lazy(() =>
    import('@/pages/owner-autocare-requests').then((module) => ({
        default: module.OwnerAutoCareRequestsPage,
    })),
)

export const OwnerClientsPage = lazy(() =>
    import('@/pages/owner-clients').then((module) => ({
        default: module.OwnerClientsPage,
    })),
)

export const OwnerServicesPage = lazy(() =>
    import('@/pages/owner-services').then((module) => ({
        default: module.OwnerServicesPage,
    })),
)

export const PricingPage = lazy(() =>
    import('@/pages/pricing').then((module) => ({
        default: module.PricingPage,
    })),
)

export const AdminDashboardPage = lazy(() =>
    import('@/pages/admin-dashboard').then((module) => ({
        default: module.AdminDashboardPage,
    })),
)

export const AdminUsersPage = lazy(() =>
    import('@/pages/admin-users').then((module) => ({
        default: module.AdminUsersPage,
    })),
)

export const AdminOwnersPage = lazy(() =>
    import('@/pages/admin-owners').then((module) => ({
        default: module.AdminOwnersPage,
    })),
)

export const AdminReviewsPage = lazy(() =>
    import('@/pages/admin-reviews').then((module) => ({
        default: module.AdminReviewsPage,
    })),
)

export const AdminPlatformReviewsPage = lazy(() =>
    import('@/pages/admin-platform-reviews').then((module) => ({
        default: module.AdminPlatformReviewsPage,
    })),
)

export const AdminAuditLogsPage = lazy(() =>
    import('@/pages/admin-audit-logs').then((module) => ({
        default: module.AdminAuditLogsPage,
    })),
)

export const SecurityCenterPage = lazy(() =>
    import('@/pages/security-center').then((module) => ({
        default: module.SecurityCenterPage,
    })),
)

export const SuperAdminDashboardPage = lazy(() =>
    import('@/pages/super-admin-dashboard').then((module) => ({
        default: module.SuperAdminDashboardPage,
    })),
)

export const NotFoundPage = lazy(() =>
    import('@/pages/not-found').then((module) => ({
        default: module.NotFoundPage,
    })),
)
