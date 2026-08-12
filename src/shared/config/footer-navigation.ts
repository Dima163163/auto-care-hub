import { ROUTES } from '@/shared/constants/routes'
import type { TranslationKey } from '@/shared/lib/i18n'

export interface FooterColumn {
    titleKey: TranslationKey
    items: Array<{
        labelKey: TranslationKey
        to: string
    }>
}

export const footerColumns: FooterColumn[] = [
    {
        titleKey: 'autocare.footerClients',
        items: [
            { labelKey: 'navigation.services', to: ROUTES.serviceDiscovery },
            { labelKey: 'navigation.myBookings', to: ROUTES.profileBookings },
            { labelKey: 'navigation.favorites', to: ROUTES.favorites },
            { labelKey: 'autocare.footerReviews', to: ROUTES.profileReviews },
            { labelKey: 'landing.footerHelpCenter', to: ROUTES.help },
        ],
    },
    {
        titleKey: 'landing.footerOwners',
        items: [
            { labelKey: 'landing.footerOwners', to: ROUTES.owners },
            { labelKey: 'autocare.footerAdvertising', to: ROUTES.owners },
            { labelKey: 'landing.footerBlog', to: ROUTES.blog },
            { labelKey: 'landing.footerSupport', to: ROUTES.help },
        ],
    },
    {
        titleKey: 'autocare.footerCompany',
        items: [
            { labelKey: 'navigation.about', to: ROUTES.about },
            { labelKey: 'landing.footerBlog', to: ROUTES.blog },
            { labelKey: 'autocare.footerCareer', to: ROUTES.contacts },
            { labelKey: 'landing.footerContacts', to: ROUTES.contacts },
        ],
    },
    {
        titleKey: 'autocare.footerLegal',
        items: [
            { labelKey: 'autocare.footerAgreement', to: ROUTES.rules },
            { labelKey: 'landing.footerPrivacy', to: ROUTES.privacy },
            { labelKey: 'autocare.footerTerms', to: ROUTES.rules },
        ],
    },
]
