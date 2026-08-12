import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ResilientImage } from './ResilientImage'

describe('ResilientImage', () => {
    it('renders the fallback after an image error', () => {
        render(
            <ResilientImage
                src="/cabinet.webp"
                alt="Cabinet interior"
                fallback={<span>Image unavailable</span>}
            />,
        )

        fireEvent.error(screen.getByRole('img', { name: 'Cabinet interior' }))

        expect(screen.getByText('Image unavailable')).toBeInTheDocument()
        expect(screen.getByRole('img', { name: 'Cabinet interior' })).toHaveTextContent(
            'Image unavailable',
        )
    })

    it('resets an earlier error when the source changes', () => {
        const { rerender } = render(
            <ResilientImage
                src="/first.webp"
                alt="Cabinet interior"
                fallback={<span>Image unavailable</span>}
            />,
        )

        fireEvent.error(screen.getByRole('img', { name: 'Cabinet interior' }))
        rerender(
            <ResilientImage
                src="/second.webp"
                alt="Cabinet interior"
                fallback={<span>Image unavailable</span>}
            />,
        )

        expect(screen.getByRole('img', { name: 'Cabinet interior' })).toHaveAttribute(
            'src',
            '/second.webp',
        )
    })

    it('renders the same accessible fallback when a source is missing', () => {
        render(
            <ResilientImage
                src={null}
                alt="Cabinet interior"
                fallback={<span>Image unavailable</span>}
            />,
        )

        expect(screen.getByRole('img', { name: 'Cabinet interior' })).toHaveTextContent(
            'Image unavailable',
        )
    })

    it('marks an image loaded after browser decoding completes', async () => {
        render(
            <ResilientImage
                src="/cabinet.webp"
                alt="Cabinet interior"
                fallback={<span>Image unavailable</span>}
            />,
        )

        const image = screen.getByRole('img', { name: 'Cabinet interior' })
        const decode = vi.fn().mockResolvedValue(undefined)
        Object.defineProperty(image, 'decode', {
            configurable: true,
            value: decode,
        })

        expect(image).toHaveAttribute('data-image-state', 'loading')
        fireEvent.load(image)

        await waitFor(() => {
            expect(image).toHaveAttribute('data-image-state', 'loaded')
        })
        expect(decode).toHaveBeenCalledOnce()
    })

    it('retries the canonical source when a responsive variant fails', () => {
        render(
            <ResilientImage
                src="/original.webp"
                srcSet="/preview.webp 1280w"
                alt="Cabinet interior"
                fallback={<span>Image unavailable</span>}
            />,
        )

        const image = screen.getByRole('img', { name: 'Cabinet interior' })
        expect(image).toHaveAttribute('srcSet', '/preview.webp 1280w')

        fireEvent.error(image)
        expect(image).toHaveAttribute('src', '/original.webp')
        expect(image).not.toHaveAttribute('srcSet')

        fireEvent.error(image)
        expect(screen.getByText('Image unavailable')).toBeInTheDocument()
    })
})
