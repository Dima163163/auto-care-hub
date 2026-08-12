import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import {
    Dialog,
    DialogDescription,
    DialogTitle,
} from './Dialog'

describe('Dialog', () => {
    it('focuses the first control, exposes its title and description, and restores focus', async () => {
        const user = userEvent.setup()
        const onOpenChange = vi.fn()
        const { rerender } = render(
            <>
                <button type="button">Open dialog</button>
                <Dialog isOpen={false} onOpenChange={onOpenChange}>
                    <DialogTitle>Reschedule booking</DialogTitle>
                    <DialogDescription>Choose a new time.</DialogDescription>
                    <button type="button">Save</button>
                </Dialog>
            </>,
        )

        const trigger = screen.getByRole('button', { name: 'Open dialog' })
        trigger.focus()

        rerender(
            <>
                <button type="button">Open dialog</button>
                <Dialog isOpen onOpenChange={onOpenChange}>
                    <DialogTitle>Reschedule booking</DialogTitle>
                    <DialogDescription>Choose a new time.</DialogDescription>
                    <button type="button">Save</button>
                </Dialog>
            </>,
        )

        const dialog = screen.getByRole('dialog', { name: 'Reschedule booking' })
        expect(dialog).toHaveAttribute('aria-describedby')
        expect(screen.getByRole('button', { name: 'Save' })).toHaveFocus()

        await user.keyboard('{Escape}')
        expect(onOpenChange).toHaveBeenCalledWith(false)

        rerender(
            <>
                <button type="button">Open dialog</button>
                <Dialog isOpen={false} onOpenChange={onOpenChange}>
                    <DialogTitle>Reschedule booking</DialogTitle>
                    <DialogDescription>Choose a new time.</DialogDescription>
                    <button type="button">Save</button>
                </Dialog>
            </>,
        )

        expect(trigger).toHaveFocus()
    })

    it('does not reference a missing description', () => {
        render(
            <Dialog isOpen onOpenChange={vi.fn()}>
                <DialogTitle>Confirm action</DialogTitle>
                <button type="button">Confirm</button>
            </Dialog>,
        )

        expect(screen.getByRole('dialog', { name: 'Confirm action' })).not.toHaveAttribute('aria-describedby')
    })
})
