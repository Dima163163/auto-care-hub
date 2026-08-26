import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { I18nProvider } from '@/shared/lib/i18n-provider'

import { AutoCareResultsRouteSkeleton, AutoCareResultsSkeleton, CardsGridSkeleton, ProviderProfileSkeleton } from './index'

describe('loading skeletons', () => {
    it('announces a results loading region without exposing placeholder content', () => {
        render(<AutoCareResultsSkeleton label="Loading services" />)

        const region = screen.getByRole('status', { name: 'Loading services' })

        expect(region).toHaveAttribute('aria-busy', 'true')
        expect(region.querySelector('.autocare-results-loading-surface')).not.toBeNull()
        expect(region.querySelectorAll('.animate-pulse')).not.toHaveLength(0)
    })

    it('keeps the map fallback as one shimmering surface', () => {
        render(<AutoCareResultsSkeleton label="Loading services" />)

        const map = screen.getByTestId('autocare-results-map-skeleton')

        expect(map).toHaveClass('autocare-map-skeleton')
        expect(map.children).toHaveLength(0)
    })

    it('reserves title and description space above the results grid', () => {
        render(<AutoCareResultsSkeleton label="Loading services" />)

        expect(screen.getByTestId('autocare-results-title-skeleton')).toBeVisible()
        expect(screen.getByTestId('autocare-results-description-skeleton')).toBeVisible()
    })

    it('keeps discovery filters visible while the route is loading', () => {
        render(<I18nProvider><AutoCareResultsRouteSkeleton label="Loading services" /></I18nProvider>)

        const region = screen.getByRole('status', { name: 'Loading services' })
        const controls = screen.getAllByRole('combobox')

        expect(region).toHaveAttribute('aria-busy', 'true')
        expect(controls.length).toBeGreaterThanOrEqual(5)
        expect(controls.every((control) => (control as HTMLSelectElement).disabled)).toBe(true)
        expect(screen.getByRole('button', { name: /Начать поиск|Start search/i })).toBeDisabled()
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
