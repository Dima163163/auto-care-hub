import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Dropdown } from './Dropdown'

describe('Dropdown', () => {
    it('selects an option and closes the menu', async () => {
        const user = userEvent.setup()
        const onSelect = vi.fn()

        render(
            <Dropdown
                trigger={(props) => <button {...props} type="button">Open options</button>}
                items={[
                    { label: 'English', value: 'en' },
                    { label: 'Russian', value: 'ru' },
                ]}
                onSelect={onSelect}
            />,
        )

        await user.click(screen.getByRole('button', { name: 'Open options' }))
        expect(screen.getByRole('menu')).toBeInTheDocument()

        await user.click(screen.getByRole('menuitem', { name: 'Russian' }))

        expect(onSelect).toHaveBeenCalledWith('ru')
        expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    })

    it('closes when the user clicks outside the menu', async () => {
        const user = userEvent.setup()

        render(
            <>
                <Dropdown
                    trigger={(props) => <button {...props} type="button">Open options</button>}
                    items={[{ label: 'English', value: 'en' }]}
                    onSelect={vi.fn()}
                />
                <button type="button">Outside</button>
            </>,
        )

        await user.click(screen.getByRole('button', { name: 'Open options' }))
        expect(screen.getByRole('menu')).toBeInTheDocument()

        await user.click(screen.getByRole('button', { name: 'Outside' }))
        expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    })

    it('supports keyboard navigation and restores focus after Escape', async () => {
        const user = userEvent.setup()

        render(
            <Dropdown
                trigger={(props) => <button {...props} type="button">Open options</button>}
                items={[
                    { label: 'English', value: 'en' },
                    { label: 'Russian', value: 'ru' },
                ]}
                onSelect={vi.fn()}
            />,
        )

        const trigger = screen.getByRole('button', { name: 'Open options' })

        trigger.focus()
        expect(trigger).toHaveAttribute('aria-haspopup', 'menu')
        expect(trigger).toHaveAttribute('aria-expanded', 'false')

        await user.keyboard('{ArrowDown}')

        expect(screen.getByRole('menu')).toBeInTheDocument()
        expect(trigger).toHaveAttribute('aria-expanded', 'true')
        expect(screen.getByRole('menuitem', { name: 'English' })).toHaveFocus()

        await user.keyboard('{ArrowDown}')
        expect(screen.getByRole('menuitem', { name: 'Russian' })).toHaveFocus()

        await user.keyboard('{Escape}')
        expect(screen.queryByRole('menu')).not.toBeInTheDocument()
        expect(trigger).toHaveFocus()
    })
})
