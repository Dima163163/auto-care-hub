'use client'

import { usePathname } from 'next/navigation'

import { ROUTES } from '@/shared/constants/routes'

import { BootShell, type BootWorkspaceRole } from './BootShell'

function getWorkspaceRole(pathname: string): BootWorkspaceRole | undefined {
    if (pathname.startsWith('/owner/')) return 'owner'
    if (pathname.startsWith('/super-admin/')) return 'super_admin'
    if (pathname.startsWith('/admin/')) return 'admin'

    if (
        pathname === ROUTES.profile
        || pathname.startsWith(`${ROUTES.profile}/`)
        || pathname === ROUTES.notifications
        || pathname === ROUTES.chats
    ) {
        return 'client'
    }

    return undefined
}

/** Uses the real Next pathname while a catch-all route is still streaming. */
export function RouteBootShell() {
    const pathname = usePathname()

    return (
        <BootShell
            home={pathname === ROUTES.home}
            services={pathname === ROUTES.serviceDiscovery}
            workspaceRole={getWorkspaceRole(pathname)}
        />
    )
}
