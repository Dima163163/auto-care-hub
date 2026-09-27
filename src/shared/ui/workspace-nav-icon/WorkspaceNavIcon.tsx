import type { ComponentType } from 'react'

type WorkspaceNavIconProps = {
    icon: ComponentType<{ className?: string }>
    detail?: 'help'
}

/** Compact, accessible icon well for links in private workspace navigation. */
export function WorkspaceNavIcon({ icon: Icon, detail }: WorkspaceNavIconProps) {
    return (
        <span aria-hidden="true" className="workspace-nav-icon" data-icon-detail={detail}>
            <Icon className="size-4 shrink-0" />
        </span>
    )
}
