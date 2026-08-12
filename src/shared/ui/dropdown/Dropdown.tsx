import {
    useCallback,
    useEffect,
    useId,
    useRef,
    useState,
} from 'react'
import type {
    KeyboardEvent as ReactKeyboardEvent,
    MouseEvent as ReactMouseEvent,
    ReactNode,
} from 'react'
import { cn } from '@/lib/utils'

type DropdownItem = {
    label: string
    value: string
    icon?: ReactNode
}

type DropdownTriggerProps = {
    'aria-controls': string
    'aria-expanded': boolean
    'aria-haspopup': 'menu'
    id: string
    onClick: (event: ReactMouseEvent<HTMLElement>) => void
    onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => void
}

type DropdownProps = {
    trigger: (props: DropdownTriggerProps) => ReactNode
    items: DropdownItem[]
    onSelect: (value: string) => void
    value?: string | undefined
    className?: string
    align?: 'left' | 'right'
}

export function Dropdown({
    trigger,
    items,
    onSelect,
    value,
    className,
    align = 'right',
}: DropdownProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [pendingFocusIndex, setPendingFocusIndex] = useState<number | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const triggerId = useId()
    const menuId = useId()

    const focusTrigger = useCallback(() => {
        document.getElementById(triggerId)?.focus()
    }, [triggerId])

    const closeMenu = useCallback((restoreFocus = false) => {
        setIsOpen(false)

        if (restoreFocus) {
            focusTrigger()
        }
    }, [focusTrigger])

    const focusMenuItem = useCallback((index: number) => {
        const menuItems = document.getElementById(menuId)?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')

        if (!menuItems?.length) {
            return
        }

        const normalizedIndex = (index + menuItems.length) % menuItems.length
        menuItems[normalizedIndex]?.focus()
    }, [menuId])

    const handleMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
        const menuItems = document.getElementById(menuId)?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')
        const activeIndex = Array.from(menuItems ?? []).findIndex((item) => item === document.activeElement)

        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault()
                focusMenuItem(activeIndex + 1)
                break
            case 'ArrowUp':
                event.preventDefault()
                focusMenuItem(activeIndex - 1)
                break
            case 'Home':
                event.preventDefault()
                focusMenuItem(0)
                break
            case 'End':
                event.preventDefault()
                focusMenuItem(-1)
                break
            case 'Escape':
                event.preventDefault()
                closeMenu(true)
                break
            default:
                break
        }
    }

    useEffect(() => {
        const handleClickOutside = (event: globalThis.MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen])

    useEffect(() => {
        if (!isOpen) {
            return
        }

        focusMenuItem(pendingFocusIndex ?? 0)
    }, [focusMenuItem, isOpen, pendingFocusIndex])

    const triggerProps: DropdownTriggerProps = {
        id: triggerId,
        'aria-controls': menuId,
        'aria-expanded': isOpen,
        'aria-haspopup': 'menu',
        onClick: () => {
            if (isOpen) {
                closeMenu()
            } else {
                setPendingFocusIndex(null)
                setIsOpen(true)
            }
        },
        onKeyDown: (event) => {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault()
                setPendingFocusIndex(event.key === 'ArrowDown' ? 0 : -1)
                setIsOpen(true)
            }

            if (event.key === 'Escape' && isOpen) {
                event.preventDefault()
                closeMenu(true)
            }
        },
    }

    return (
        <div className={cn('relative inline-block', className)} ref={containerRef}>
            {trigger(triggerProps)}

            {isOpen && (
                    <div
                        className={cn(
                            'origin-top animate-in fade-in zoom-in-95 absolute top-full z-[60] mt-2 min-w-[160px] overflow-hidden rounded-2xl border bg-card p-1 shadow-xl shadow-primary/5 duration-150',
                            align === 'right' ? 'right-0' : 'left-0'
                        )}
                    >
                        <div
                            id={menuId}
                            aria-labelledby={triggerId}
                            role="menu"
                            className="flex flex-col gap-0.5"
                            onKeyDown={handleMenuKeyDown}
                        >
                            {items.map((item) => (
                                <button
                                    key={item.value}
                                    type="button"
                                    role="menuitem"
                                    onClick={() => {
                                        onSelect(item.value)
                                        closeMenu(true)
                                    }}
                                    aria-current={value === item.value ? 'true' : undefined}
                                    className={cn(
                                        'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors hover:bg-muted active:scale-[0.98]',
                                        value === item.value ? 'bg-muted text-primary' : 'text-foreground'
                                    )}
                                >
                                    {item.icon && <span className="size-4 shrink-0">{item.icon}</span>}
                                    <span className="truncate">{item.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
            )}
        </div>
    )
}
