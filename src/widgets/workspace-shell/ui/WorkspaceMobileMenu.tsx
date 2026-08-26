import { Plus, X } from 'lucide-react'
import { NavLink } from 'react-router'

import { ROUTES } from '@/shared/constants/routes'
import type { TranslationKey } from '@/shared/lib/i18n'
import { useTranslation } from '@/shared/lib/useTranslation'
import { LanguageSwitcher } from '@/widgets/language-switcher/ui/LanguageSwitcher'

import { getWorkspaceNavigationGroups } from './workspace-navigation'
import type { WorkspaceRole } from './WorkspaceHeader'

type WorkspaceMobileMenuProps = {
    role: WorkspaceRole
    onClose: () => void
}

export function WorkspaceMobileMenu({ role, onClose }: WorkspaceMobileMenuProps) {
    const { t } = useTranslation()
    const groups = getWorkspaceNavigationGroups(role)

    return (
        <div
            id="workspace-mobile-menu"
            className="absolute right-0 top-[calc(100%+0.6rem)] z-[80] max-h-[min(72dvh,38rem)] w-[min(23rem,calc(100vw-1.5rem))] overflow-y-auto rounded-2xl border border-border bg-popover p-2 text-popover-foreground shadow-2xl shadow-black/30"
            role="dialog"
            aria-label={t('navigation.mainNavigation')}
        >
            <div className="flex items-center justify-between gap-3 border-b border-border px-3 pb-3 pt-2">
                <p className="text-sm font-black">{t('common.menu')}</p>
                <div className="flex items-center gap-2">
                    <LanguageSwitcher compact />
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex size-9 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={t('common.close')}
                    >
                        <X className="size-4" aria-hidden="true" />
                    </button>
                </div>
            </div>

            {role === 'owner' && (
                <NavLink
                    to={ROUTES.ownerAutoCareProviders}
                    onClick={onClose}
                    className="mt-3 flex min-h-11 cursor-pointer items-center gap-3 rounded-xl bg-primary px-3 py-2.5 text-sm font-black text-primary-foreground shadow-lg shadow-primary/20 transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <Plus className="size-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{t('autocare.ownerProvidersCreate')}</span>
                </NavLink>
            )}

            <nav className="grid gap-3 px-1 pb-1 pt-3" aria-label={t('navigation.profileWorkspace')}>
                {groups.map((group) => (
                    <section key={group.labelKey}>
                        <p className="px-2 pb-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">
                            {t(group.labelKey as TranslationKey)}
                        </p>
                        <div className="grid gap-0.5">
                            {group.items.map(({ icon: Icon, labelKey, to, end }) => (
                                <NavLink
                                    key={to}
                                    to={to}
                                    {...(end === undefined ? {} : { end })}
                                    onClick={onClose}
                                    className={({ isActive }) => `flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${isActive ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'}`}
                                >
                                    <Icon className="size-4 shrink-0" aria-hidden="true" />
                                    <span className="truncate">{t(labelKey)}</span>
                                </NavLink>
                            ))}
                        </div>
                    </section>
                ))}
            </nav>
        </div>
    )
}
