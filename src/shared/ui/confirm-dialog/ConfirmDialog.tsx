import {
    useEffect,
    useId,
    useRef,
    type KeyboardEvent,
    type ReactNode,
} from 'react'

import { Button } from '@/components/ui/button'
import { useTranslation } from '@/shared/lib/useTranslation'

type ConfirmDialogProps = {
    isOpen: boolean
    title: string
    description: string
    eyebrow?: string
    children?: ReactNode
    cancelLabel?: string
    confirmLabel?: string
    loadingLabel?: string
    isLoading?: boolean
    confirmVariant?: 'default' | 'destructive'
    onCancel: () => void
    onConfirm: () => void
}

export function ConfirmDialog({
    isOpen,
    title,
    description,
    eyebrow,
    children,
    cancelLabel,
    confirmLabel,
    loadingLabel,
    isLoading = false,
    confirmVariant = 'default',
    onCancel,
    onConfirm,
}: ConfirmDialogProps) {
    const { t } = useTranslation()
    const titleId = useId()
    const descriptionId = useId()
    const cancelButtonRef = useRef<HTMLButtonElement | null>(null)
    const dialogRef = useRef<HTMLDivElement | null>(null)
    const previouslyFocusedElementRef = useRef<HTMLElement | null>(null)
    const resolvedEyebrow = eyebrow ?? t('common.confirm')
    const resolvedCancelLabel = cancelLabel ?? t('common.cancel')
    const resolvedConfirmLabel = confirmLabel ?? t('common.confirm')
    const resolvedLoadingLabel = loadingLabel ?? t('common.saving')

    useEffect(() => {
        if (!isOpen) {
            return
        }

        previouslyFocusedElementRef.current =
            document.activeElement instanceof HTMLElement
                ? document.activeElement
                : null

        cancelButtonRef.current?.focus()

        return () => {
            previouslyFocusedElementRef.current?.focus()
        }
    }, [isOpen])

    if (!isOpen) {
        return null
    }

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Escape' && !isLoading) {
            onCancel()
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

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 backdrop-blur-sm"
            onKeyDown={handleKeyDown}
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={descriptionId}
                className="w-full max-w-md rounded-lg border bg-card p-6 shadow-lg"
            >
                <p className="text-sm font-medium text-muted-foreground">
                    {resolvedEyebrow}
                </p>

                <h2
                    id={titleId}
                    className="mt-2 text-xl font-semibold tracking-tight"
                >
                    {title}
                </h2>

                <p
                    id={descriptionId}
                    className="mt-3 text-sm text-muted-foreground"
                >
                    {description}
                </p>

                {children && (
                    <div className="mt-5 rounded-2xl border bg-muted/40 p-4 text-sm">
                        {children}
                    </div>
                )}

                <div className="mt-6 flex justify-end gap-3">
                    <Button
                        ref={cancelButtonRef}
                        type="button"
                        variant="outline"
                        disabled={isLoading}
                        onClick={onCancel}
                    >
                        {resolvedCancelLabel}
                    </Button>

                    <Button
                        type="button"
                        variant={confirmVariant}
                        loading={isLoading}
                        onClick={onConfirm}
                    >
                        {isLoading ? resolvedLoadingLabel : resolvedConfirmLabel}
                    </Button>
                </div>
            </div>
        </div>
    )
}
