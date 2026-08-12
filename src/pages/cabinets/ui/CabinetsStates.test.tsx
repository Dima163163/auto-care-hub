import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { I18nContext } from '@/shared/lib/i18n-context'

import { CabinetsEmpty } from './CabinetsStates'

const translations: Record<string, string> = {
    'cabinet.publicList.emptyTitle': 'No cabinets found',
    'cabinet.publicList.emptyDescription': 'Try changing your filters.',
    'cabinet.publicList.clearFilters': 'Clear filters',
}

function renderEmptyState(props: { hasActiveFilters: boolean; onClearFilters: () => void }) {
    return render(
        <I18nContext.Provider
            value={{
                locale: 'en',
                setLocale: vi.fn(),
                t: (key) => translations[key] ?? key,
            }}
        >
            <CabinetsEmpty {...props} />
        </I18nContext.Provider>,
    )
}

describe('CabinetsEmpty', () => {
    it('offers to clear filters when the empty result is filtered', async () => {
        const user = userEvent.setup()
        const onClearFilters = vi.fn()

        renderEmptyState({ hasActiveFilters: true, onClearFilters })

        await user.click(screen.getByRole('button', { name: 'Clear filters' }))

        expect(onClearFilters).toHaveBeenCalledOnce()
    })

    it('does not show a reset action for a genuinely empty catalog', () => {
        renderEmptyState({ hasActiveFilters: false, onClearFilters: vi.fn() })

        expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument()
    })
})
