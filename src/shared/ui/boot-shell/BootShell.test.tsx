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

        const form = screen.getByRole('region', { name: 'Загрузка поиска автоуслуг' })
        const controls = form.querySelectorAll('select')

        expect(screen.getByTestId('autocare-results-title-skeleton')).toBeVisible()
        expect(screen.getByTestId('autocare-results-description-skeleton')).toBeVisible()
        expect(screen.getByRole('heading', { name: 'Услуга' })).toBeVisible()
        expect(screen.getByRole('heading', { name: 'Автомобиль' })).toBeVisible()
        expect(screen.getByRole('heading', { name: 'Все фильтры' })).toBeVisible()
        expect(controls).toHaveLength(5)
        expect(Array.from(controls).every((control) => (control as HTMLSelectElement).disabled)).toBe(true)
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

    it('renders static public navigation while only the auth avatar waits for the server', () => {
        render(<BootShell />)

        const navigation = screen.getByRole('navigation', { name: 'Основная навигация' })
        expect(navigation).toHaveTextContent('Автоуслуги')
        expect(navigation).toHaveTextContent('Отзывы')
        expect(navigation).toHaveTextContent('Помощь и информация')
        expect(navigation.querySelectorAll('.animate-pulse')).toHaveLength(0)
        expect(navigation.querySelectorAll('a')).toHaveLength(3)
    })
})
