import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { AutoCareResultsSkeleton, CardsGridSkeleton, ProviderProfileSkeleton } from './index'

describe('loading skeletons', () => {
    it('announces a results loading region without exposing placeholder content', () => {
        render(<AutoCareResultsSkeleton label="Loading services" />)

        const region = screen.getByRole('status', { name: 'Loading services' })

        expect(region).toHaveAttribute('aria-busy', 'true')
        expect(region.querySelectorAll('.animate-pulse')).not.toHaveLength(0)
    })

    it('keeps the provider profile skeleton accessible', () => {
        render(<ProviderProfileSkeleton label="Loading provider" />)

        expect(screen.getByRole('status', { name: 'Loading provider' })).toHaveAttribute('aria-busy', 'true')
    })

    it('renders the requested amount of card placeholders', () => {
        render(<CardsGridSkeleton label="Loading cards" count={3} />)

        expect(screen.getByRole('status', { name: 'Loading cards' }).querySelectorAll('.animate-pulse')).not.toHaveLength(0)
    })
})
