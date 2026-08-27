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
            { labelKey: 'autocare.footerReviews', to: ROUTES.platformReviews },
            { labelKey: 'navigation.favorites', to: ROUTES.favorites },
            { labelKey: 'navigation.myBookings', to: ROUTES.profileBookings },
            { labelKey: 'landing.footerHelpCenter', to: ROUTES.help },
        ],
    },
    {
        titleKey: 'landing.footerOwners',
        items: [
            { labelKey: 'landing.footerOwners', to: ROUTES.owners },
            { labelKey: 'landing.footerPartners', to: ROUTES.partners },
            { labelKey: 'landing.footerHelpCenter', to: ROUTES.help },
        ],
    },
    {
        titleKey: 'autocare.footerCompany',
        items: [
            { labelKey: 'navigation.about', to: ROUTES.about },
            { labelKey: 'landing.footerBlog', to: ROUTES.blog },
            { labelKey: 'landing.footerContacts', to: ROUTES.contacts },
        ],
    },
    {
        titleKey: 'autocare.footerLegal',
        items: [
            { labelKey: 'autocare.footerAgreement', to: ROUTES.agreement },
            { labelKey: 'landing.footerPrivacy', to: ROUTES.privacy },
            { labelKey: 'autocare.footerTerms', to: ROUTES.rules },
        ],
    },
]
