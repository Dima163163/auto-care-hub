import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { BootShell } from './BootShell'

describe('BootShell', () => {
    it('keeps the workspace navigation visible while owner data is loading', () => {
        render(<BootShell workspaceRole="owner" />)

        expect(screen.getByTestId('workspace-boot-sidebar')).toBeVisible()
        expect(screen.getByTestId('workspace-boot-content')).toBeVisible()
        expect(screen.getByRole('status', { name: 'Загрузка кабинета владельца' })).toHaveAttribute('aria-busy', 'true')
    })

    it('uses a shape-matched form and a single map shimmer for workspace loading', () => {
        render(<BootShell workspaceRole="owner" />)

        expect(screen.getByTestId('workspace-boot-content').querySelectorAll('.autocare-map-skeleton')).toHaveLength(1)
        expect(screen.getByTestId('workspace-boot-form')).toBeVisible()
        expect(screen.getByTestId('workspace-boot-content').querySelectorAll('.animate-pulse').length).toBeGreaterThan(12)
    })

    it('reserves the results title and description below the service filters', () => {
        render(<BootShell services />)

        expect(screen.getByTestId('autocare-results-title-skeleton')).toBeVisible()
        expect(screen.getByTestId('autocare-results-description-skeleton')).toBeVisible()
    })

    it('renders the static home map immediately instead of a hero skeleton', () => {
        render(<BootShell home />)

        const hero = screen.getByTestId('home-boot-hero')
        expect(hero.querySelector('img')).toHaveAttribute('src', '/images/autocare/hero-map-generated.webp')
        expect(hero.querySelectorAll('.animate-pulse')).toHaveLength(0)
    })

    it('reserves only remote home sections with skeletons below the bundled map', () => {
        render(<BootShell home />)

        const hero = screen.getByTestId('home-boot-hero')
        const page = screen.getByLabelText('Загрузка данных главной страницы')

        expect(hero.querySelector('img')).toBeVisible()
        expect(page.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
        expect(screen.getByText('Популярные автоуслуги')).toBeVisible()
    })
})
