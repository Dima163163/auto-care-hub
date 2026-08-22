import { ArrowUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router'

import { useTranslation } from '@/shared/lib/useTranslation'

const VISIBILITY_OFFSET = 320

export function ScrollToTopButton() {
    const { t } = useTranslation()
    const { pathname } = useLocation()
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        const scrollContainer = document.querySelector<HTMLElement>('[data-workspace-scroll-container]')
        const getScrollTop = () => scrollContainer?.scrollTop ?? window.scrollY
        const handleScroll = () => setIsVisible(getScrollTop() > VISIBILITY_OFFSET)
        const target = scrollContainer ?? window

        handleScroll()
        target.addEventListener('scroll', handleScroll, { passive: true })
        return () => target.removeEventListener('scroll', handleScroll)
    }, [pathname])

    if (!isVisible) return null

    return (
        <button
            type="button"
            onClick={() => {
                const scrollContainer = document.querySelector<HTMLElement>('[data-workspace-scroll-container]')
                if (scrollContainer) {
                    scrollContainer.scrollTo({ top: 0, behavior: 'smooth' })
                    return
                }

                window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            aria-label={t('common.backToTop')}
            title={t('common.backToTop')}
            className="fixed bottom-[calc(7rem+env(safe-area-inset-bottom))] right-4 z-[1100] flex size-11 items-center justify-center rounded-full border border-primary/25 bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition hover:-translate-y-0.5 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:bottom-24 md:right-6"
        >
            <ArrowUp className="size-5" aria-hidden="true" />
        </button>
    )
}
