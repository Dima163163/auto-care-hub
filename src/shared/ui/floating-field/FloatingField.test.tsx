import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { FloatingInput, FloatingSelect } from './FloatingField'

describe('Floating fields', () => {
    it('keeps an empty select label inside the field and lifts a filled label to the border', () => {
        const { rerender } = render(
            <FloatingSelect label="Какая услуга нужна?" value="" onChange={() => undefined}>
                <option value="" />
                <option value="diagnostics">Диагностика</option>
            </FloatingSelect>,
        )

        const select = screen.getByLabelText('Какая услуга нужна?')
        expect(select.parentElement).toHaveAttribute('data-filled', 'false')
        expect(select).toHaveClass('select-with-icon')

        rerender(
            <FloatingSelect label="Какая услуга нужна?" value="diagnostics" onChange={() => undefined}>
                <option value="" />
                <option value="diagnostics">Диагностика</option>
            </FloatingSelect>,
        )

        expect(screen.getByLabelText('Какая услуга нужна?').parentElement).toHaveAttribute('data-filled', 'true')
    })

    it('keeps the focus treatment on the whole input container', () => {
        render(<FloatingInput label="Цена до" placeholder="Без ограничения" value="" onChange={() => undefined} />)

        const input = screen.getByLabelText('Цена до')
        fireEvent.focus(input)

        expect(input.parentElement).toHaveClass('focus-within:ring-2')
        expect(input.parentElement?.querySelector('span')).toHaveClass('group-focus-within:top-0')
        expect(input).toHaveClass('placeholder:text-transparent')
        expect(input).toHaveClass('focus-visible:ring-0', 'focus-visible:ring-offset-0')
    })

    it('keeps the native select ring suppressed so the rounded wrapper owns focus', () => {
        render(
            <FloatingSelect label="Услуга" value="oil-change" tone="dark" onChange={() => undefined}>
                <option value="oil-change">Замена масла</option>
            </FloatingSelect>,
        )

        const select = screen.getByLabelText('Услуга')
        expect(select).toHaveClass('focus-visible:ring-0', 'focus-visible:ring-offset-0')
        expect(select.parentElement).toHaveClass('rounded-[var(--radius-control)]')
        expect(select.parentElement?.querySelector('span')).toHaveClass('bg-white', 'text-slate-700')
    })

    it('uses muted text for an unselected dark select and keeps selected values prominent', () => {
        const { rerender } = render(
            <FloatingSelect label="Марка" value="" tone="dark" onChange={() => undefined}>
                <option value="">Любая марка</option>
                <option value="bmw">BMW</option>
            </FloatingSelect>,
        )

        expect(screen.getByLabelText('Марка')).toHaveClass('text-muted-foreground')

        rerender(
            <FloatingSelect label="Марка" value="bmw" tone="dark" onChange={() => undefined}>
                <option value="">Любая марка</option>
                <option value="bmw">BMW</option>
            </FloatingSelect>,
        )

        expect(screen.getByLabelText('Марка')).toHaveClass('text-primary-foreground')
    })

    it('uses an opaque field surface behind the floating label so the border stays clean', () => {
        render(<FloatingInput label="Точка поиска" value="Рядом с вами" readOnly />)

        const input = screen.getByLabelText('Точка поиска')
        const label = input.parentElement?.querySelector('span')

        expect(input).toHaveValue('Рядом с вами')
        expect(label).toHaveClass('bg-white')
    })
})
