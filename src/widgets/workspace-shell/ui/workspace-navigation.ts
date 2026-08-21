import type { ComponentType } from 'react'
import {
    Bell,
    BookOpen,
    Building2,
    CarFront,
    ClipboardList,
    FileText,
    HelpCircle,
    Heart,
    LayoutDashboard,
    MessageSquare,
    Settings,
    ShieldAlert,
    ShieldCheck,
    Star,
    Users,
} from 'lucide-react'

import { ROUTES } from '@/shared/constants/routes'
import { isChatNavigationVisible } from '@/shared/config/features'
import type { TranslationKey } from '@/shared/lib/i18n'

import type { WorkspaceRole } from './WorkspaceHeader'

export type WorkspaceSidebarItem = {
    labelKey: TranslationKey
    to: string
    icon: ComponentType<{ className?: string }>
    end?: boolean
}

export type WorkspaceSidebarGroup = {
    labelKey: TranslationKey
    items: WorkspaceSidebarItem[]
}

const groupsByRole: Record<WorkspaceRole, WorkspaceSidebarGroup[]> = {
    client: [
        { labelKey: 'workspace.overview', items: [{ labelKey: 'navigation.profile', to: ROUTES.profile, icon: LayoutDashboard, end: true }] },
        {
            labelKey: 'workspace.manage',
            items: [
                { labelKey: 'navigation.services', to: ROUTES.serviceDiscovery, icon: Building2 },
                { labelKey: 'navigation.myVehicles', to: ROUTES.profileVehicles, icon: CarFront },
                { labelKey: 'navigation.myBookings', to: ROUTES.profileBookings, icon: BookOpen },
                { labelKey: 'navigation.chats', to: ROUTES.chats, icon: MessageSquare },
                { labelKey: 'navigation.myReviews', to: ROUTES.profileReviews, icon: MessageSquare },
                { labelKey: 'navigation.favorites', to: ROUTES.favorites, icon: Heart },
                { labelKey: 'navigation.notifications', to: ROUTES.notifications, icon: Bell },
            ],
        },
        { labelKey: 'workspace.support', items: [{ labelKey: 'landing.footerHelpCenter', to: ROUTES.help, icon: HelpCircle }] },
    ],
    owner: [
        { labelKey: 'workspace.overview', items: [{ labelKey: 'navigation.ownerDashboard', to: ROUTES.ownerDashboard, icon: LayoutDashboard, end: true }] },
        {
            labelKey: 'workspace.manage',
            items: [
                { labelKey: 'navigation.ownerAutoCareProviders', to: ROUTES.ownerAutoCareProviders, icon: CarFront },
                { labelKey: 'navigation.ownerAutoCareRequests', to: ROUTES.ownerAutoCareRequests, icon: MessageSquare },
                { labelKey: 'navigation.ownerReviews', to: ROUTES.ownerReviews, icon: Star },
                { labelKey: 'navigation.chats', to: ROUTES.ownerChats, icon: MessageSquare },
                { labelKey: 'navigation.ownerClients', to: ROUTES.ownerClients, icon: Users },
                { labelKey: 'navigation.ownerServices', to: ROUTES.ownerServices, icon: ClipboardList },
            ],
        },
        {
            labelKey: 'workspace.configure',
            items: [
                { labelKey: 'navigation.profile', to: ROUTES.profile, icon: Settings },
                { labelKey: 'navigation.notifications', to: ROUTES.notifications, icon: Bell },
            ],
        },
        { labelKey: 'workspace.support', items: [{ labelKey: 'landing.footerHelpCenter', to: ROUTES.help, icon: HelpCircle }] },
    ],
    admin: [
        {
            labelKey: 'workspace.monitor',
            items: [
                { labelKey: 'navigation.adminDashboard', to: ROUTES.adminDashboard, icon: LayoutDashboard, end: true },
                { labelKey: 'navigation.adminAuditLogs', to: ROUTES.adminAuditLogs, icon: FileText },
                { labelKey: 'navigation.adminSecurityCenter', to: ROUTES.adminSecurityCenter, icon: ShieldAlert },
            ],
        },
        {
            labelKey: 'workspace.manage',
            items: [
                { labelKey: 'navigation.adminUsers', to: ROUTES.adminUsers, icon: Users },
                { labelKey: 'navigation.adminOwners', to: ROUTES.adminOwners, icon: ShieldCheck },
                { labelKey: 'navigation.adminCabinets', to: ROUTES.adminCabinets, icon: Building2 },
                { labelKey: 'navigation.adminReviews', to: ROUTES.adminReviews, icon: MessageSquare },
                { labelKey: 'navigation.adminPlatformReviews', to: ROUTES.adminPlatformReviews, icon: MessageSquare },
                { labelKey: 'navigation.chats', to: ROUTES.adminChats, icon: MessageSquare },
            ],
        },
        {
            labelKey: 'workspace.configure',
            items: [
                { labelKey: 'navigation.profile', to: ROUTES.profile, icon: Settings },
                { labelKey: 'navigation.notifications', to: ROUTES.notifications, icon: Bell },
            ],
        },
        { labelKey: 'workspace.support', items: [{ labelKey: 'landing.footerHelpCenter', to: ROUTES.help, icon: HelpCircle }] },
    ],
    super_admin: [
        {
            labelKey: 'workspace.monitor',
            items: [
                { labelKey: 'user.superAdmin', to: ROUTES.superAdminDashboard, icon: ShieldCheck, end: true },
                { labelKey: 'navigation.adminAuditLogs', to: ROUTES.adminAuditLogs, icon: FileText },
                { labelKey: 'navigation.adminSecurityCenter', to: ROUTES.adminSecurityCenter, icon: ShieldAlert },
            ],
        },
        {
            labelKey: 'workspace.manage',
            items: [
                { labelKey: 'navigation.adminUsers', to: ROUTES.adminUsers, icon: Users },
                { labelKey: 'navigation.adminOwners', to: ROUTES.adminOwners, icon: Building2 },
                { labelKey: 'navigation.adminReviews', to: ROUTES.adminReviews, icon: MessageSquare },
                { labelKey: 'navigation.adminPlatformReviews', to: ROUTES.adminPlatformReviews, icon: MessageSquare },
                { labelKey: 'navigation.chats', to: ROUTES.superAdminChats, icon: MessageSquare },
            ],
        },
        {
            labelKey: 'workspace.configure',
            items: [
                { labelKey: 'navigation.profile', to: ROUTES.profile, icon: Settings },
                { labelKey: 'navigation.notifications', to: ROUTES.notifications, icon: Bell },
            ],
        },
        { labelKey: 'workspace.support', items: [{ labelKey: 'landing.footerHelpCenter', to: ROUTES.help, icon: HelpCircle }] },
    ],
}

export function getWorkspaceNavigationGroups(role: WorkspaceRole) {
    const groups = groupsByRole[role]
    if (isChatNavigationVisible) return groups

    return groups
        .map((group) => ({
            ...group,
            items: group.items.filter((item) => item.labelKey !== 'navigation.chats'),
        }))
        .filter((group) => group.items.length > 0)
}
