import { ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router'

import { useTranslation } from '@/shared/lib/useTranslation'
import { headerInfoLinks } from '../model/header-info-links'

type HeaderInfoMenuProps = {
    variant: 'dark' | 'light'
}

export function HeaderInfoMenu({ variant }: HeaderInfoMenuProps) {
    const { t } = useTranslation()
    const [isOpen, setIsOpen] = useState(false)
    const rootRef = useRef<HTMLDivElement | null>(null)
    const dark = variant === 'dark'

    useEffect(() => {
        if (!isOpen) return

        const closeOnOutsidePointer = (event: PointerEvent) => {
            if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setIsOpen(false)
        }
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setIsOpen(false)
        }
        document.addEventListener('pointerdown', closeOnOutsidePointer)
        document.addEventListener('keydown', closeOnEscape)
        return () => {
            document.removeEventListener('pointerdown', closeOnOutsidePointer)
            document.removeEventListener('keydown', closeOnEscape)
        }
    }, [isOpen])

    return (
        <div ref={rootRef} className="relative flex h-full items-center">
            <button
                type="button"
                onClick={() => setIsOpen((value) => !value)}
                aria-expanded={isOpen}
                aria-haspopup="menu"
                className={`inline-flex h-full items-center gap-1.5 whitespace-nowrap text-sm font-semibold transition-colors ${dark ? 'text-primary-foreground/90 hover:text-primary-foreground' : 'text-foreground hover:text-primary'}`}
            >
                {t('navigation.helpAndInfo')}
                <ChevronDown className={`size-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
            {isOpen && (
                <div role="menu" className="absolute right-0 top-[calc(100%+0.65rem)] z-[60] w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-border bg-popover p-2 text-popover-foreground shadow-2xl shadow-black/20">
                    <p className="px-3 pb-2 pt-1 text-[11px] font-black uppercase tracking-[0.14em] text-muted-foreground">{t('navigation.helpAndInfo')}</p>
                    <div className="grid gap-1">
                        {headerInfoLinks.map(({ to, labelKey, descriptionKey, icon: Icon }) => (
                            <NavLink
                                key={to}
                                to={to}
                                role="menuitem"
                                onClick={() => setIsOpen(false)}
                                className={({ isActive }) => `flex items-start gap-3 rounded-xl px-3 py-3 transition-colors ${isActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`}
                            >
                                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="size-4" /></span>
                                <span className="min-w-0"><span className="block text-sm font-black">{t(labelKey)}</span><span className="mt-0.5 block text-xs font-medium leading-5 text-muted-foreground">{t(descriptionKey)}</span></span>
                            </NavLink>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
