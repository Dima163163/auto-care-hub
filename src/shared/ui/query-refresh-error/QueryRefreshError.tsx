import { RefreshCw } from 'lucide-react'
import { useCallback, useState } from 'react'

import { Button } from '@/components/ui/button'

type AsyncAction = () => void | Promise<unknown>

function useAsyncAction(action: AsyncAction) {
    const [isRunning, setIsRunning] = useState(false)

    const run = useCallback(() => {
        if (isRunning) return

        setIsRunning(true)
        try {
            const result = action()
            if (result && typeof result.then === 'function') {
                void result.then(
                    () => setIsRunning(false),
                    () => setIsRunning(false),
                )
            } else {
                setIsRunning(false)
            }
        } catch {
            setIsRunning(false)
        }
    }, [action, isRunning])

    return { isRunning, run }
}

type RetryButtonProps = {
    label: string
    onRetry: AsyncAction
    className?: string
    size?: 'default' | 'sm' | 'lg' | 'icon' | 'icon-sm' | 'icon-lg'
}

export function RetryButton({ label, onRetry, className, size = 'default' }: RetryButtonProps) {
    const { isRunning, run } = useAsyncAction(onRetry)

    return (
        <Button type="button" variant="outline" size={size} className={className} onClick={run} loading={isRunning}>
            {!isRunning && <RefreshCw aria-hidden="true" className="size-4" />}
            {label}
        </Button>
    )
}

type QueryRefreshErrorProps = {
    message: string
    retryLabel: string
    onRetry: () => void | Promise<unknown>
}

export function QueryRefreshError({
    message,
    retryLabel,
    onRetry,
}: QueryRefreshErrorProps) {
    const { isRunning: isRetrying, run: handleRetry } = useAsyncAction(onRetry)

    return (
        <div
            role="alert"
            aria-busy={isRetrying || undefined}
            data-retrying={isRetrying || undefined}
            className="mt-5 flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
            <p className="text-sm text-destructive">{message}</p>
            <Button type="button" variant="outline" size="sm" onClick={handleRetry} loading={isRetrying}>
                {retryLabel}
            </Button>
        </div>
    )
}
