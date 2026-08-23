import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { StateCard } from './StateCard'

describe('StateCard', () => {
    it('announces normal states as status', () => {
        render(<StateCard title="Loading" description="Please wait" />)

        expect(screen.getByRole('status')).toHaveTextContent('Loading')
    })

    it('announces errors as alerts', () => {
        render(
            <StateCard
                variant="error"
                title="Could not load"
                description="Try again later"
            />,
        )

        expect(screen.getByRole('alert')).toHaveTextContent('Could not load')
    })

    it('uses an accessible skeleton for loading states', () => {
        render(
            <StateCard
                variant="loading"
                description="Loading bookings"
            />,
        )

        expect(screen.getByRole('status')).toHaveTextContent('Loading bookings')
        expect(screen.getByRole('status').querySelectorAll('.animate-pulse')).toHaveLength(3)
        expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true')
    })

    it.each([
        ['offline', 'No connection', 'offline'],
        ['permission denied', 'Access denied', 'permission-denied'],
        ['suspended', 'Service suspended', 'suspended'],
        ['stale error', 'Saved results shown', 'stale-error'],
    ] as const)('announces %s as a recoverable alert', (_label, title, variant) => {
        render(
            <StateCard
                variant={variant}
                title={title}
                description="Try another action."
            />,
        )

        expect(screen.getByRole('alert')).toHaveAttribute('data-state', variant)
        expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive')
    })

    it.each([
        ['empty', 'Nothing here yet'],
        ['stale', 'Showing saved results'],
    ] as const)('renders %s as a non-blocking status', (variant, title) => {
        render(<StateCard variant={variant} title={title} />)

        expect(screen.getByRole('status')).toHaveAttribute('data-state', variant)
        expect(screen.getByRole('status')).toHaveTextContent(title)
    })
})
