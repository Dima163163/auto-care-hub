import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { RatingStars } from './RatingStars'

describe('RatingStars', () => {
    it('exposes a read-only rating as an accessible image', () => {
        render(<RatingStars ariaLabel="Rating" value={4} />)

        expect(screen.getByRole('img', { name: 'Rating' })).toBeInTheDocument()
    })

    it('exposes editable ratings as a radio group', async () => {
        const user = userEvent.setup()
        const onChange = vi.fn()

        render(<RatingStars ariaLabel="Rating" value={3} onChange={onChange} />)

        expect(screen.getByRole('radiogroup', { name: 'Rating' })).toBeInTheDocument()
        expect(screen.getByRole('radio', { name: 'Rating: 3 / 5' })).toHaveAttribute('aria-checked', 'true')

        await user.click(screen.getByRole('radio', { name: 'Rating: 5 / 5' }))

        expect(onChange).toHaveBeenCalledWith(5)
    })
})
