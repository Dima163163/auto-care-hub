import type { LucideIcon } from 'lucide-react'
import {
    BadgeCheck,
    Building2,
    Calendar,
    CalendarDays,
    CheckCircle2,
    Grid2X2,
    Heart,
    Home,
    MapPin,
    MessageCircle,
    MoreHorizontal,
    Search,
    Settings,
    UsersRound,
} from 'lucide-react'

import { ROUTES } from '@/shared/constants/routes'
import type { TranslationKey } from '@/shared/lib/i18n'
import type { CabinetImageAsset } from '@/entities/cabinet'

export type CabinetPreview = {
    id?: string
    titleKey?: TranslationKey
    title?: string
    areaKey?: TranslationKey
    area?: string
    rating: string
    price: string
    badgeKey: TranslationKey
    badgeClass: string
    image: string
    photoAssets?: CabinetImageAsset[]
    search: string
    favoriteId: string
}

type FeaturePreview = {
    icon: LucideIcon
    titleKey: TranslationKey
    textKey: TranslationKey
}

type DashboardStat = {
    labelKey: TranslationKey
    value: string
    icon: LucideIcon
    color: string
    bg: string
}

type QuickAction = {
    labelKey: TranslationKey
    icon: LucideIcon
    to: string
    color: string
}

type CategoryLink = {
    labelKey: TranslationKey
    icon: LucideIcon
    search?: string | undefined
}

export const cabinets: CabinetPreview[] = [
    {
        titleKey: 'landing.cabinet1Title',
        areaKey: 'landing.cabinet1Area',
        rating: '4.9 (120)',
        price: '1200 ₽',
        badgeKey: 'landing.popularBadge',
        badgeClass: 'bg-status-success-surface text-status-success-foreground',
        image: '/images/cabinets/cabinet-beauty-bright-01.webp',
        search: 'beauty',
        favoriteId: 'landing-cabinet-beauty',
    },
    {
        titleKey: 'landing.cabinet2Title',
        areaKey: 'landing.cabinet2Area',
        rating: '4.8 (98)',
        price: '1500 ₽',
        badgeKey: 'landing.availableBadge',
        badgeClass: 'bg-status-success-surface text-status-success-foreground',
        image: '/images/cabinets/cabinet-medical-consultation-01.webp',
        search: 'medical',
        favoriteId: 'landing-cabinet-medical',
    },
    {
        titleKey: 'landing.cabinet3Title',
        areaKey: 'landing.cabinet3Area',
        rating: '4.7 (76)',
        price: '1400 ₽',
        badgeKey: 'landing.fewSlotsBadge',
        badgeClass: 'bg-status-warning-surface text-status-warning-foreground',
        image: '/images/cabinets/cabinet-coaching-private-01.webp',
        search: 'coaching',
        favoriteId: 'landing-cabinet-coaching',
    },
    {
        titleKey: 'landing.cabinet4Title',
        areaKey: 'landing.cabinet4Area',
        rating: '4.9 (84)',
        price: '1100 ₽',
        badgeKey: 'landing.availableBadge',
        badgeClass: 'bg-status-success-surface text-status-success-foreground',
        image: '/images/cabinets/cabinet-massage-wellness-draft-01.webp',
        search: 'massage',
        favoriteId: 'landing-cabinet-massage',
    },
]

export const sidebarIcons = [Home, Calendar, BadgeCheck, Building2, UsersRound, Grid2X2, Settings]

export const dashboardStats: DashboardStat[] = [
    { labelKey: 'landing.dashboardBookings', value: '24', icon: Calendar, color: 'text-primary', bg: 'bg-status-info-surface' },
    { labelKey: 'landing.dashboardRequests', value: '18', icon: CheckCircle2, color: 'text-status-success-foreground', bg: 'bg-status-success-surface' },
    { labelKey: 'landing.dashboardCabinets', value: '4', icon: Building2, color: 'text-status-warning-foreground', bg: 'bg-status-warning-surface' },
    { labelKey: 'landing.dashboardReviews', value: '2', icon: UsersRound, color: 'text-status-danger-foreground', bg: 'bg-status-danger-surface' },
]

export const dashboardBookings = [
    ['landing.bookingName1', 'landing.bookingCabinet2', 'landing.bookingToday1100', 'landing.bookingConfirmed', 'green'],
    ['landing.bookingName2', 'landing.bookingCabinet1', 'landing.bookingToday1230', 'landing.bookingPending', 'amber'],
    ['landing.bookingName3', 'landing.bookingCabinet3', 'landing.bookingTomorrow1000', 'landing.bookingConfirmed', 'green'],
] as const

export const featureCards: FeaturePreview[] = [
    {
        icon: CalendarDays,
        titleKey: 'landing.convenientBookingTitle',
        textKey: 'landing.convenientBookingText',
    },
    {
        icon: BadgeCheck,
        titleKey: 'landing.listingManagementTitle',
        textKey: 'landing.listingManagementText',
    },
    {
        icon: CheckCircle2,
        titleKey: 'landing.statusControlTitle',
        textKey: 'landing.statusControlText',
    },
    {
        icon: Grid2X2,
        titleKey: 'landing.unifiedWorkspaceTitle',
        textKey: 'landing.unifiedWorkspaceText',
    },
]

export const statsPreview = [
    [Building2, '2 350+', 'landing.statsCabinets'],
    [CalendarDays, '48 700+', 'landing.statsBookings'],
    [UsersRound, '3 120+', 'landing.statsUsers'],
    [MapPin, '42', 'landing.statsCities'],
] as const

export const quickActions: QuickAction[] = [
    { labelKey: 'landing.categorySearch', icon: Search, to: ROUTES.cabinets, color: 'text-primary' },
    { labelKey: 'landing.categoryBookings', icon: CalendarDays, to: ROUTES.profileBookings, color: 'text-primary' },
    { labelKey: 'landing.categoryFavorites', icon: Heart, to: ROUTES.favorites, color: 'text-status-danger-foreground' },
    { labelKey: 'landing.categoryOwners', icon: UsersRound, to: ROUTES.owners, color: 'text-primary' },
]

export const categories: CategoryLink[] = [
    { labelKey: 'landing.categoryBeauty', icon: UsersRound, search: 'beauty' },
    { labelKey: 'landing.categoryPsychology', icon: BadgeCheck, search: 'coaching' },
    { labelKey: 'landing.categoryMassage', icon: UsersRound, search: 'massage' },
    { labelKey: 'landing.categoryConsultations', icon: MessageCircle, search: 'consultation' },
    { labelKey: 'landing.categoryOffice', icon: Building2, search: 'workspace' },
    { labelKey: 'landing.categoryMore', icon: MoreHorizontal },
]
