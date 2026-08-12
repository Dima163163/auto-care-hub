import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { CabinetImageField } from './CabinetImageField'

describe('CabinetImageField', () => {
    it('connects validation help to the file input', () => {
        render(
            <CabinetImageField
                error="Image is invalid"
                hint="JPEG, PNG, or WebP"
                imageUrl={null}
                label="Cabinet image"
                onChange={vi.fn()}
            />,
        )

        expect(screen.getByLabelText('Cabinet image')).toHaveAttribute(
            'aria-describedby',
            'cabinetImageHint cabinetImageError',
        )
        expect(screen.getByLabelText('Cabinet image')).toHaveAttribute(
            'aria-invalid',
            'true',
        )
        expect(screen.getByRole('alert')).toHaveTextContent('Image is invalid')
    })

    it('renders a resilient fallback when the preview fails', () => {
        render(
            <CabinetImageField
                error={null}
                hint="JPEG, PNG, or WebP"
                imageUrl="/cabinet.webp"
                label="Cabinet image"
                onChange={vi.fn()}
            />,
        )

        fireEvent.error(screen.getByRole('img', { name: 'Cabinet image' }))

        expect(screen.getByRole('img', { name: 'Cabinet image' })).toHaveTextContent(
            'Cabinet image',
        )
    })
})
