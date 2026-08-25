import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { DateInputTrigger } from './DateInputTrigger'

describe('DateInputTrigger', () => {
    it('opens the native date picker from the visible button', async () => {
        const user = userEvent.setup()
        const showPicker = vi.fn()
        Object.defineProperty(HTMLInputElement.prototype, 'showPicker', {
            configurable: true,
            value: showPicker,
        })

        render(<DateInputTrigger label="Another date and time" value="" onChange={vi.fn()} />)

        await user.click(screen.getByRole('button', { name: 'Another date and time' }))

        expect(showPicker).toHaveBeenCalledTimes(1)
    })

    it('forwards the selected date to the caller', () => {
        const onChange = vi.fn()

        render(<DateInputTrigger label="Another date and time" value="" onChange={onChange} />)

        const input = screen.getByLabelText('Another date and time input')
        fireEvent.change(input, { target: { value: '2026-08-24' } })

        expect(onChange).toHaveBeenLastCalledWith('2026-08-24')
    })
})
