import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { StatusBadge } from './StatusBadge'

describe('StatusBadge', () => {
    it('renders the shared status presentation with its variant styles', () => {
        render(<StatusBadge variant="success">Active</StatusBadge>)

        const badge = screen.getByText('Active')

        expect(badge).toHaveClass('rounded-full', 'bg-status-success-surface')
    })

    it('allows a local class override without replacing the base styles', () => {
        render(
            <StatusBadge className="text-xs" variant="neutral">
                Draft
            </StatusBadge>,
        )

        expect(screen.getByText('Draft')).toHaveClass(
            'rounded-full',
            'text-xs',
        )
    })
})
