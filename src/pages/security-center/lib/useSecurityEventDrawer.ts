import { useEffect, useRef, useSyncExternalStore } from 'react'

const mobileQuery = '(max-width: 767px)'
const subscribeMobile = (notify: () => void) => {
    const media = window.matchMedia(mobileQuery)
    media.addEventListener('change', notify)
    return () => media.removeEventListener('change', notify)
}
const readMobile = () => window.matchMedia(mobileQuery).matches
const readServer = () => false

export function useSecurityEventDrawer(selectedId: string | null, onClose: () => void) {
    const drawerRef = useRef<HTMLElement>(null)
    const isMobile = useSyncExternalStore(subscribeMobile, readMobile, readServer)

    useEffect(() => {
        const drawer = drawerRef.current
        if (!isMobile || !selectedId || !drawer) return
        const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
        const previousOverflow = document.body.style.overflow
        const inertElements: HTMLElement[] = []
        // The drawer stays in its existing layout. Make siblings at every
        // ancestor level inert without hiding or moving the visual surface.
        let ancestor: HTMLElement | null = drawer
        while (ancestor?.parentElement) {
            for (const sibling of ancestor.parentElement.children) {
                if (sibling instanceof HTMLElement && sibling !== ancestor && !sibling.hasAttribute('data-drawer-backdrop') && !sibling.inert) {
                    sibling.inert = true
                    inertElements.push(sibling)
                }
            }
            ancestor = ancestor.parentElement
            if (ancestor === document.body) break
        }
        document.body.style.overflow = 'hidden'
        const controls = () => [...drawer.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        )].filter((element) => element.checkVisibility())
        ;(drawer.querySelector<HTMLElement>('[data-drawer-close]') ?? controls()[0] ?? drawer).focus()
        const keepFocus = (event: FocusEvent) => {
            if (event.target instanceof Node && !drawer.contains(event.target)) (controls()[0] ?? drawer).focus()
        }
        const handleKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault()
                onClose()
            } else if (event.key === 'Tab') {
                const items = controls()
                const first = items[0]
                const last = items.at(-1)
                if (!first || !last) {
                    event.preventDefault()
                    drawer.focus()
                } else if (event.shiftKey && (document.activeElement === first || document.activeElement === drawer)) {
                    event.preventDefault()
                    last.focus()
                } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault()
                    first.focus()
                }
            }
        }
        document.addEventListener('keydown', handleKey)
        document.addEventListener('focusin', keepFocus)
        return () => {
            document.removeEventListener('keydown', handleKey)
            document.removeEventListener('focusin', keepFocus)
            for (const element of inertElements) element.inert = false
            document.body.style.overflow = previousOverflow
            if (opener?.isConnected) opener.focus()
        }
    }, [isMobile, onClose, selectedId])

    return { drawerRef, isMobile }
}
