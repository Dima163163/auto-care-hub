import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Button } from './button'

describe('Button', () => {
    it('exposes an accessible busy state and disables the control while loading', () => {
        render(<Button loading>Saving</Button>)

        const button = screen.getByRole('button', { name: 'Saving' })

        expect(button).toBeDisabled()
        expect(button).toHaveAttribute('aria-busy', 'true')
        expect(button.querySelector('[data-slot="button-loading-indicator"]')).not.toBeNull()
    })

    it('preserves explicit disabled state when not loading', () => {
        render(<Button disabled>Unavailable</Button>)

        expect(screen.getByRole('button', { name: 'Unavailable' })).toBeDisabled()
        expect(screen.getByRole('button', { name: 'Unavailable' })).not.toHaveAttribute('aria-busy')
    })
})
