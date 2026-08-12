import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'

import { I18nProvider } from '@/shared/lib/i18n-provider'

import { RouteErrorBoundary } from './RouteErrorBoundary'

function BrokenPage(): never {
    throw new Error('Chunk failed')
}

describe('RouteErrorBoundary', () => {
    beforeEach(() => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined)
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('renders a retryable alert when a route throws', () => {
        render(
            <I18nProvider>
                <MemoryRouter>
                    <RouteErrorBoundary>
                        <BrokenPage />
                    </RouteErrorBoundary>
                </MemoryRouter>
            </I18nProvider>,
        )

        expect(screen.getByRole('alert')).toHaveTextContent('Page unavailable')
        expect(screen.getByRole('button', { name: 'Reload page' })).toBeInTheDocument()
    })
})
