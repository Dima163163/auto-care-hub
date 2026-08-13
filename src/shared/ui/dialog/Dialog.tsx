import {
    createContext,
    useCallback,
    useEffect,
    useId,
    useRef,
    useContext,
    useState,
    type KeyboardEvent,
    type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'

import { cn } from '@/lib/utils'

type DialogProps = {
    isOpen: boolean
    onOpenChange: (open: boolean) => void
    children: ReactNode
    className?: string
}

type DialogContextValue = {
    titleId: string
    descriptionId: string
    registerDescription: (present: boolean) => void
}

const DialogContext = createContext<DialogContextValue | null>(null)

export function Dialog({
    isOpen,
    onOpenChange,
    children,
    className,
}: DialogProps) {
    const dialogRef = useRef<HTMLDivElement | null>(null)
    const previouslyFocusedElementRef = useRef<HTMLElement | null>(null)
    const titleId = useId()
    const descriptionId = useId()
    const [descriptionCount, setDescriptionCount] = useState(0)

    const registerDescription = useCallback((present: boolean) => {
        setDescriptionCount((count) => Math.max(0, count + (present ? 1 : -1)))
    }, [])

    useEffect(() => {
        if (!isOpen) {
            return
        }

        previouslyFocusedElementRef.current =
            document.activeElement instanceof HTMLElement
                ? document.activeElement
                : null

        const focusableElement = dialogRef.current?.querySelector<HTMLElement>(
            'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        )

        focusableElement?.focus()

        return () => {
            previouslyFocusedElementRef.current?.focus()
        }
    }, [isOpen])

    if (!isOpen) {
        return null
    }

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Escape') {
            onOpenChange(false)
            return
        }

        if (event.key !== 'Tab') {
            return
        }

        const focusableElements = dialogRef.current?.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )

        if (!focusableElements || focusableElements.length === 0) {
            return
        }

        const firstElement = focusableElements.item(0)
        const lastElement = focusableElements.item(focusableElements.length - 1)

        if (!firstElement || !lastElement) {
            return
        }

        if (event.shiftKey && document.activeElement === firstElement) {
            event.preventDefault()
            lastElement.focus()
            return
        }

        if (!event.shiftKey && document.activeElement === lastElement) {
            event.preventDefault()
            firstElement.focus()
        }
    }

    return createPortal(
        <div
            className="fixed inset-0 z-[2000] flex items-center justify-center bg-background/80 px-4 py-4 backdrop-blur-sm sm:py-6"
            onKeyDown={handleKeyDown}
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                    onOpenChange(false)
                }
            }}
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={descriptionCount > 0 ? descriptionId : undefined}
                className={cn(
                    "w-full max-w-md rounded-lg border bg-card p-6 shadow-lg",
                    className
                )}
            >
                <DialogContext.Provider value={{ titleId, descriptionId, registerDescription }}>
                    {children}
                </DialogContext.Provider>
            </div>
        </div>,
        document.body,
    )
}

export function DialogHeader({ children, className }: { children: ReactNode; className?: string }) {
    return <div className={cn("space-y-1.5", className)}>{children}</div>
}

export function DialogTitle({ children, className }: { children: ReactNode; className?: string }) {
    const context = useContext(DialogContext)

    return <h2 id={context?.titleId} className={cn("text-xl font-semibold tracking-tight", className)}>{children}</h2>
}

export function DialogDescription({ children, className }: { children: ReactNode; className?: string }) {
    const context = useContext(DialogContext)
    const registerDescription = context?.registerDescription

    useEffect(() => {
        if (!registerDescription) {
            return
        }

        registerDescription(true)
        return () => registerDescription(false)
    }, [registerDescription])

    return <p id={context?.descriptionId} className={cn("text-sm text-muted-foreground", className)}>{children}</p>
}

export function DialogFooter({ children, className }: { children: ReactNode; className?: string }) {
    return <div className={cn("mt-6 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}>{children}</div>
}

export function DialogContent({ children, className }: { children: ReactNode; className?: string }) {
    return <div className={className}>{children}</div>
}
