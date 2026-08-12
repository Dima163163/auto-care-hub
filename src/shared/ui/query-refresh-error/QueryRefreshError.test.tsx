import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { QueryRefreshError, RetryButton } from './QueryRefreshError'

describe('QueryRefreshError', () => {
    it('shows a retry action and calls it', () => {
        const onRetry = vi.fn()

        render(
            <QueryRefreshError
                message="Could not refresh notifications."
                onRetry={onRetry}
                retryLabel="Retry"
            />,
        )

        expect(screen.getByRole('alert')).toHaveTextContent(
            'Could not refresh notifications.',
        )
        fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

        expect(onRetry).toHaveBeenCalledOnce()
    })

    it('keeps the retry action busy until an async refresh settles', async () => {
        let resolveRetry: (() => void) | undefined
        const onRetry = vi.fn(() => new Promise<void>((resolve) => {
            resolveRetry = resolve
        }))

        render(
            <QueryRefreshError
                message="Could not refresh notifications."
                onRetry={onRetry}
                retryLabel="Retry"
            />,
        )

        const alert = screen.getByRole('alert')
        const retryButton = screen.getByRole('button', { name: 'Retry' })
        fireEvent.click(retryButton)
        fireEvent.click(retryButton)

        expect(onRetry).toHaveBeenCalledOnce()
        expect(alert).toHaveAttribute('aria-busy', 'true')
        expect(retryButton).toBeDisabled()

        resolveRetry?.()
        await waitFor(() => expect(alert).not.toHaveAttribute('aria-busy'))
    })

    it('clears busy state when an async refresh rejects', async () => {
        const onRetry = vi.fn(() => Promise.reject(new Error('temporary failure')))

        render(
            <QueryRefreshError
                message="Could not refresh notifications."
                onRetry={onRetry}
                retryLabel="Retry"
            />,
        )

        fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

        await waitFor(() => expect(screen.getByRole('alert')).not.toHaveAttribute('aria-busy'))
    })
})

describe('RetryButton', () => {
    it('prevents duplicate clicks while the retry is pending', async () => {
        let resolveRetry: (() => void) | undefined
        const onRetry = vi.fn(() => new Promise<void>((resolve) => {
            resolveRetry = resolve
        }))

        render(<RetryButton label="Retry" onRetry={onRetry} />)

        const retryButton = screen.getByRole('button', { name: 'Retry' })
        fireEvent.click(retryButton)
        fireEvent.click(retryButton)

        expect(onRetry).toHaveBeenCalledOnce()
        expect(retryButton).toBeDisabled()

        resolveRetry?.()
        await waitFor(() => expect(retryButton).not.toBeDisabled())
    })

    it('clears loading when the retry rejects', async () => {
        const onRetry = vi.fn(() => Promise.reject(new Error('temporary failure')))

        render(<RetryButton label="Retry" onRetry={onRetry} />)

        fireEvent.click(screen.getByRole('button', { name: 'Retry' }))

        await waitFor(() => expect(screen.getByRole('button', { name: 'Retry' })).not.toBeDisabled())
    })
})
