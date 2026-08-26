import { render, screen } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { I18nProvider } from '@/shared/lib/i18n-provider'

import { QueryStateCard } from './QueryStateCard'

function renderCard(state: ComponentProps<typeof QueryStateCard>['state']) {
    return render(
        <I18nProvider>
            <QueryStateCard state={state} onRetry={vi.fn()} />
        </I18nProvider>,
    )
}

describe('QueryStateCard', () => {
    it.each(['offline', 'permission-denied', 'suspended', 'session-expired', 'stale-error', 'error'] as const)('renders %s as an announced error state', (state) => {
        renderCard(state)

        expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    it('renders partial data as a non-blocking status', () => {
        renderCard('partial')

        expect(screen.getByRole('status')).toHaveAttribute('data-state', 'partial')
    })

    it('renders loading accessibly', () => {
        renderCard('loading')

        expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true')
    })

    it('renders empty as a non-blocking status', () => {
        renderCard('empty')

        expect(screen.getByRole('status')).toHaveAttribute('data-state', 'empty')
    })
})
