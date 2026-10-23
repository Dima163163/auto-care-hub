import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useNavigate } from 'react-router'
import { describe, expect, it } from 'vitest'

import { StoreProvider } from '@/app/store'
import { I18nProvider } from '@/shared/lib/i18n-provider'
import { SeoHead } from './SeoHead'

function NavigateToLogin() {
    const navigate = useNavigate()
    return <button onClick={() => navigate('/login')}>Go to login</button>
}

describe('client route metadata lifecycle', () => {
    it('replaces public canonical and robots after navigating to auth', async () => {
        render(
            <StoreProvider>
                <I18nProvider>
                    <MemoryRouter initialEntries={['/services']}>
                        <SeoHead />
                        <NavigateToLogin />
                    </MemoryRouter>
                </I18nProvider>
            </StoreProvider>,
        )

        await waitFor(() => expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toContain('/services'))
        fireEvent.click(screen.getByRole('button', { name: 'Go to login' }))

        await waitFor(() => {
            expect(document.title).toBe('Sign in | AutoCare Hub')
            expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(new URL('/login', window.location.origin).href)
            expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex, follow')
        })
    })
})
