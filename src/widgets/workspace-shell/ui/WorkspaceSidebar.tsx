import { useState } from 'react'
import {
    ChevronLeft,
    ChevronRight,
} from 'lucide-react'
import { NavLink } from 'react-router'

import { useTranslation } from '@/shared/lib/useTranslation'
import type { WorkspaceRole } from './WorkspaceHeader'
import { getWorkspaceNavigationGroups } from './workspace-navigation'

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
                    {getWorkspaceNavigationGroups(role).map((group) => (
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
