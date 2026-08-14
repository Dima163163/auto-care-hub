import type { ComponentType } from 'react'
import { useState } from 'react'
import {
    Bell,
    BookOpen,
    Building2,
    CarFront,
    ChevronLeft,
    ChevronRight,
    ClipboardList,
    FileText,
    HelpCircle,
    Heart,
    LayoutDashboard,
    MessageSquare,
    Settings,
    ShieldCheck,
    ShieldAlert,
    Users,
} from 'lucide-react'
import { NavLink } from 'react-router'

import { ROUTES } from '@/shared/constants/routes'
import type { TranslationKey } from '@/shared/lib/i18n'
import { useTranslation } from '@/shared/lib/useTranslation'
import type { WorkspaceRole } from './WorkspaceHeader'

type SidebarItem = {
    labelKey: TranslationKey
    to: string
    icon: ComponentType<{ className?: string }>
    end?: boolean
}

type SidebarGroup = {
    labelKey: TranslationKey
    items: SidebarItem[]
}

const groupsByRole: Record<WorkspaceRole, SidebarGroup[]> = {
    client: [
        {
            labelKey: 'workspace.overview',
            items: [{ labelKey: 'navigation.profile', to: ROUTES.profile, icon: LayoutDashboard, end: true }],
        },
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
        {
            labelKey: 'workspace.support',
            items: [{ labelKey: 'landing.footerHelpCenter', to: ROUTES.help, icon: HelpCircle }],
        },
    ],
    owner: [
        {
            labelKey: 'workspace.overview',
            items: [{ labelKey: 'navigation.ownerDashboard', to: ROUTES.ownerDashboard, icon: LayoutDashboard, end: true }],
        },
        {
            labelKey: 'workspace.manage',
            items: [
                { labelKey: 'navigation.ownerAutoCareProviders', to: ROUTES.ownerAutoCareProviders, icon: CarFront },
                { labelKey: 'navigation.ownerAutoCareRequests', to: ROUTES.ownerAutoCareRequests, icon: MessageSquare },
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
        {
            labelKey: 'workspace.support',
            items: [{ labelKey: 'landing.footerHelpCenter', to: ROUTES.help, icon: HelpCircle }],
        },
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
        {
            labelKey: 'workspace.support',
            items: [{ labelKey: 'landing.footerHelpCenter', to: ROUTES.help, icon: HelpCircle }],
        },
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
        {
            labelKey: 'workspace.support',
            items: [{ labelKey: 'landing.footerHelpCenter', to: ROUTES.help, icon: HelpCircle }],
        },
    ],
}

type WorkspaceSidebarProps = {
    role: WorkspaceRole
}

export function WorkspaceSidebar({ role }: WorkspaceSidebarProps) {
    const { t } = useTranslation()
    const [isCollapsed, setIsCollapsed] = useState(() =>
        typeof window !== 'undefined' && window.innerWidth < 1024,
    )

    return (
        <aside className={`${isCollapsed ? 'w-[72px]' : 'w-[232px]'} hidden shrink-0 border-r bg-background transition-[width] duration-200 md:block`}>
            <div className="sticky top-0 flex h-[calc(100vh-72px)] flex-col px-3 py-5">
                <nav aria-label={t('navigation.profileWorkspace')} className="flex-1 space-y-6">
                    {groupsByRole[role].map((group) => (
                        <div key={group.labelKey}>
                            {!isCollapsed && (
                                <p className="mb-2 px-3 text-xs font-black uppercase tracking-[0.14em] text-muted-foreground">
                                    {t(group.labelKey)}
                                </p>
                            )}
                            <div className="space-y-1">
                                {group.items.map(({ icon: Icon, labelKey, to, end }) => (
                                    <NavLink
                                        key={to}
                                        to={to}
                                        {...(end === undefined ? {} : { end })}
                                        title={isCollapsed ? t(labelKey) : undefined}
                                        className={({ isActive }) => `flex h-10 items-center gap-3 rounded-md px-3 text-sm font-semibold transition-colors ${
                                            isActive
                                                ? 'bg-primary/10 text-primary'
                                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                        }`}
                                    >
                                        <Icon className="size-4 shrink-0" />
                                        {!isCollapsed && <span className="truncate">{t(labelKey)}</span>}
                                    </NavLink>
                                ))}
                            </div>
                        </div>
                    ))}
                </nav>

                <button
                    type="button"
                    onClick={() => setIsCollapsed((value) => !value)}
                    className="flex h-10 items-center gap-3 rounded-md px-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label={isCollapsed ? t('workspace.expandSidebar') : t('workspace.collapseSidebar')}
                    title={isCollapsed ? t('workspace.expandSidebar') : t('workspace.collapseSidebar')}
                >
                    {isCollapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
                    {!isCollapsed && <span>{t('workspace.collapseSidebar')}</span>}
                </button>
            </div>
        </aside>
    )
}
