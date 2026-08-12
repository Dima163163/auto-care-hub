import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { I18nProvider } from '@/shared/lib/i18n-provider'

import { ConfirmDialog } from './ConfirmDialog'

describe('ConfirmDialog', () => {
    it('focuses cancel, closes on Escape, and restores prior focus', async () => {
        const user = userEvent.setup()
        const onCancel = vi.fn()

        const { rerender } = render(
            <I18nProvider>
                <>
                    <button type="button">Open dialog</button>
                    <ConfirmDialog
                        isOpen={false}
                        title="Delete cabinet?"
                        description="This action cannot be undone."
                        onCancel={onCancel}
                        onConfirm={vi.fn()}
                    />
                </>
            </I18nProvider>,
        )

        const trigger = screen.getByRole('button', { name: 'Open dialog' })
        trigger.focus()

        rerender(
            <I18nProvider>
                <>
                    <button type="button">Open dialog</button>
                    <ConfirmDialog
                        isOpen
                        title="Delete cabinet?"
                        description="This action cannot be undone."
                        onCancel={onCancel}
                        onConfirm={vi.fn()}
                    />
                </>
            </I18nProvider>,
        )

        expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus()

        await user.keyboard('{Escape}')
        expect(onCancel).toHaveBeenCalledTimes(1)

        rerender(
            <I18nProvider>
                <>
                    <button type="button">Open dialog</button>
                    <ConfirmDialog
                        isOpen={false}
                        title="Delete cabinet?"
                        description="This action cannot be undone."
                        onCancel={onCancel}
                        onConfirm={vi.fn()}
                    />
                </>
            </I18nProvider>,
        )

        expect(trigger).toHaveFocus()
    })

    it('prevents actions while a confirmation is processing', async () => {
        const user = userEvent.setup()
        const onCancel = vi.fn()
        const onConfirm = vi.fn()

        render(
            <I18nProvider>
                <ConfirmDialog
                    isOpen
                    isLoading
                    title="Delete cabinet?"
                    description="This action cannot be undone."
                    onCancel={onCancel}
                    onConfirm={onConfirm}
                />
            </I18nProvider>,
        )

        await user.keyboard('{Escape}')
        await user.click(screen.getByRole('button', { name: 'Saving...' }))

        expect(onCancel).not.toHaveBeenCalled()
        expect(onConfirm).not.toHaveBeenCalled()
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    })
})
