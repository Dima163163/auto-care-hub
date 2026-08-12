import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { FilterField, FilterInput, FilterSelect } from './FilterControls'

describe('FilterControls', () => {
    it('keeps shared field controls associated with their labels', () => {
        render(
            <FilterField label="City">
                <FilterInput />
            </FilterField>,
        )

        expect(screen.getByLabelText('City')).toBeInTheDocument()
    })

    it('provides the same base control styles for inputs and selects', () => {
        render(
            <>
                <FilterInput aria-label="Minimum price" />
                <FilterSelect aria-label="Category" />
            </>,
        )

        expect(screen.getByLabelText('Minimum price')).toHaveClass('h-11', 'rounded-xl')
        expect(screen.getByLabelText('Category')).toHaveClass('h-11', 'rounded-xl')
    })

    it('uses the shared danger state when a filter is invalid', () => {
        render(
            <>
                <FilterInput aria-label="Invalid minimum price" aria-invalid="true" />
                <FilterSelect aria-label="Invalid category" aria-invalid="true" />
            </>,
        )

        expect(screen.getByLabelText('Invalid minimum price')).toHaveClass('aria-[invalid=true]:border-status-danger-border')
        expect(screen.getByLabelText('Invalid category')).toHaveClass('aria-[invalid=true]:border-status-danger-border')
    })
})
