import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { StatCard } from './StatCard'

describe('StatCard', () => {
    it('renders its value and both description levels', () => {
        render(
            <StatCard
                description="Active today"
                label="Cabinets"
                secondaryDescription="Updated just now"
                value={12}
            />,
        )

        expect(screen.getByText('Cabinets')).toBeInTheDocument()
        expect(screen.getByText('12')).toBeInTheDocument()
        expect(screen.getByText('Active today')).toBeInTheDocument()
        expect(screen.getByText('Updated just now')).toBeInTheDocument()
    })
})
