import { describe, expect, it } from 'vitest'

import { translations } from './index'

function getLeafPaths(value: unknown, prefix = ''): string[] {
    if (typeof value !== 'object' || value === null) {
        return prefix ? [prefix] : []
    }

    return Object.entries(value).flatMap(([key, child]) =>
        getLeafPaths(child, prefix ? `${prefix}.${key}` : key),
    )
}

function getValue(value: unknown, path: string): unknown {
    return path.split('.').reduce<unknown>((current, key) => {
        if (typeof current !== 'object' || current === null) {
            return undefined
        }

        return (current as Record<string, unknown>)[key]
    }, value)
}

describe('translation coverage', () => {
    it('keeps every locale compatible with the English translation schema', () => {
        const englishKeys = getLeafPaths(translations.en)

        for (const locale of Object.values(translations)) {
            for (const key of englishKeys) {
                expect(getValue(locale, key), `${key} is missing`).not.toBeUndefined()
            }
        }
    })

    it('keeps critical customer-facing copy translated for every supported locale', () => {
        const criticalKeys = [
            'common.loading',
            'common.save',
            'common.cancel',
            'navigation.home',
            'navigation.profile',
            'auth.signIn',
            'auth.createAccount',
            'landing.title',
            'landing.description',
            'landing.dashboardWelcome',
            'landing.latestBookings',
            'landing.calendarMonth',
            'landing.desktopGuidesTitle',
            'landing.guideBookingText',
            'landing.desktopClientGuideTitle',
            'landing.desktopHelpTitle',
            'landing.footerDescription',
            'landing.footerRights',
            'errors.UNAUTHORIZED',
            'booking.title',
            'booking.myBookings',
            'booking.loadingBookings',
            'booking.failedToLoadBookings',
            'booking.cancelBooking',
            'booking.cancelThisBooking',
            'booking.bookThisCabinet',
            'booking.selectService',
            'booking.selectDate',
            'booking.selectTime',
            'booking.noAvailableTimes',
            'booking.createBooking',
            'booking.bookingCreatedSuccessfully',
            'booking.successTitle',
            'booking.viewMyBookings',
            'booking.payBooking',
            'booking.paymentCheckoutFailed',
            'booking.openDirections',
            'booking.pendingStatusLabel',
            'booking.confirmedStatusLabel',
            'booking.cancelledStatusLabel',
            'booking.completedStatusLabel',
            'cabinet.title',
            'cabinet.publicList.eyebrow',
            'cabinet.publicList.title',
            'cabinet.publicList.description',
            'cabinet.publicList.loading',
            'cabinet.publicList.failedToLoad',
            'cabinet.publicList.emptyTitle',
            'cabinet.publicList.searchPlaceholder',
            'cabinet.publicList.sortBy',
            'cabinet.publicList.sortNewest',
            'cabinet.publicList.sortPopular',
            'cabinet.publicList.advancedFilters',
            'cabinet.publicList.cityLabel',
            'cabinet.publicList.categoryLabel',
            'cabinet.publicList.allCategories',
            'cabinet.publicList.priceRangeLabel',
            'cabinet.publicList.ratingLabel',
            'cabinet.publicList.serviceLabel',
            'cabinet.publicList.availableToday',
            'cabinet.publicList.clearFilters',
            'cabinet.publicList.resultsTitle',
            'cabinet.publicList.resultsCount',
            'cabinet.publicList.viewMode',
            'cabinet.publicList.splitView',
            'cabinet.publicList.listView',
            'cabinet.publicList.mapView',
            'cabinet.publicList.backToSplitView',
            'cabinet.publicList.view',
            'cabinet.publicList.imageAlt',
            'cabinet.publicList.mapTitle',
            'cabinet.publicList.mapApproximate',
            'cabinet.publicList.mapLocationLoading',
            'cabinet.publicList.mapLocationError',
            'cabinet.publicList.mapTileError',
            'cabinet.publicList.openMap',
            'ownerDashboard.actionCenter.title',
            'ownerDashboard.actionCenter.pendingBookings',
            'ownerDashboard.actionCenter.readiness',
            'ownerDashboard.loading',
            'ownerDashboard.upcomingBookings',
            'ownerDashboard.analyticsTitle',
            'ownerDashboard.mobileConfirm',
            'ownerDashboard.clientListTitle',
            'adminDashboard.title',
            'adminDashboard.loading',
            'adminDashboard.moderation',
            'adminDashboard.recentUsers',
            'adminDashboard.noCabinets',
            'adminUsers.title',
            'adminUsers.loading',
            'adminUsers.confirmBlockTitle',
            'adminUsers.createAdminTitle',
            'adminUsers.roleSuperAdmin',
            'adminOwners.description',
            'adminOwners.emptyTitle',
            'adminCabinets.title',
            'adminCabinets.loading',
            'adminCabinets.confirmBlockTitle',
            'adminReviews.title',
            'adminReviews.deleteAction',
            'adminAuditLogs.title',
            'adminAuditLogs.searchPlaceholder',
            'adminAuditLogs.actions.login_failed',
            'systemIncidents.title',
            'systemIncidents.statusOpen',
            'systemIncidents.emptyTitle',
            'securityCenter.title',
            'securityCenter.permissionTitle',
            'securityCenter.eventsTitle',
            'securityCenter.empty',
            'securityCenter.types.login_failed',
            'securityCenter.statuses.open',
            'profile.privacy.title',
            'profile.privacy.exportAction',
            'profile.privacy.requestAction',
        ]

        const fullyLocalizedLocales = ['ru', 'ro', 'es', 'de', 'fr', 'pt', 'zh', 'ja', 'ko', 'ar', 'tr', 'hi'] as const

        for (const locale of fullyLocalizedLocales) {
            const value = translations[locale]

            for (const key of criticalKeys) {
                expect(getValue(value, key), `${locale}.${key} is missing`).not.toBe(getValue(translations.en, key))
            }
        }
    })

    it('translates the public automotive journey for every supported language', () => {
        const keys = ['heroTitle', 'heroDescription', 'byService', 'byProvider', 'searchAction', 'resultsTitle', 'bookAction', 'detailsAction'] as const

        for (const locale of Object.keys(translations).filter((value) => value !== 'en')) {
            for (const key of keys) {
                expect(translations[locale as keyof typeof translations].autocare[key], `${locale}.autocare.${key} uses English fallback`).not.toBe(
                    translations.en.autocare[key],
                )
            }
        }
    })

    it('keeps secondary runtime surfaces translated for every popular locale', () => {
        const longTailKeys = [
            'routeError.title',
            'routeError.description',
            'routeError.retry',
            'pwa.offlineTitle',
            'pwa.updateTitle',
            'pwa.updateDescription',
            'pwa.updateAction',
            'commission.title',
            'commission.description',
            'commission.mainDescription',
            'adminLayout.title',
            'favorites.title',
            'favorites.emptyTitle',
            'favorites.openCatalog',
            'notifications.title',
            'notifications.emptyTitle',
            'notifications.managePreferences',
        ]
        const popularLocales = ['es', 'de', 'fr', 'pt', 'zh', 'ja', 'ko', 'ar', 'tr', 'hi'] as const

        for (const locale of popularLocales) {
            for (const key of longTailKeys) {
                expect(getValue(translations[locale], key), `${locale}.${key} is missing`).not.toBe(
                    getValue(translations.en, key),
                )
            }
        }
    })

    it('keeps the help center copy translated for every popular locale', () => {
        const helpKeys = Object.keys(translations.en.info.help) as Array<keyof typeof translations.en.info.help>
        const popularLocales = ['es', 'de', 'fr', 'pt', 'zh', 'ja', 'ko', 'ar', 'tr', 'hi'] as const

        for (const locale of popularLocales) {
            for (const key of helpKeys) {
                expect(translations[locale].info.help[key], `${locale}.info.help.${key} is missing`).not.toBeUndefined()
            }

            for (const key of ['eyebrow', 'title', 'description', 'searchPlaceholder', 'topicBrowseTitle', 'clientDescription', 'faqTitle', 'contactDescription'] as const) {
                expect(translations[locale].info.help[key], `${locale}.info.help.${key} fell back to English`).not.toBe(
                    translations.en.info.help[key],
                )
            }
        }
    })

    it('keeps operator action-center copy translated across every non-English locale', () => {
        const keys = [
            'eyebrow',
            'title',
            'description',
            'loading',
            'failedToLoad',
            'queueTitle',
            'queueDescription',
            'paymentAttention',
            'paymentAttentionDescription',
            'queueMetricsLabel',
            'queueEmpty',
            'openSecurityCenter',
        ] as const

        for (const locale of Object.keys(translations).filter((value) => value !== 'en')) {
            for (const key of keys) {
                const englishValue = translations.en.adminDashboard.operatorCenter[key]
                const localizedValue = translations[locale as keyof typeof translations].adminDashboard.operatorCenter[key]

                expect(localizedValue, `${locale} operatorCenter.${key} uses English fallback`).not.toBe(englishValue)
            }
        }
    })
})
