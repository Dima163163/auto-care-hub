import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { I18nProvider } from '@/shared/lib/i18n-provider'
import { registerProtectedOperation } from '@/shared/lib/operation-safety'
import { PwaLifecycle } from './PwaLifecycle'

const pwaMocks = vi.hoisted(() => ({
    setNeedRefresh: vi.fn(),
    updateServiceWorker: vi.fn().mockResolvedValue(undefined),
    reloadApplication: vi.fn(),
    options: undefined as { onNeedReload?: () => void } | undefined,
}))

vi.mock('../lib/reload-application', () => ({
    reloadApplication: pwaMocks.reloadApplication,
}))

vi.mock('virtual:pwa-register/react', () => ({
    useRegisterSW: (options: { onNeedReload?: () => void }) => {
        pwaMocks.options = options

        return {
            needRefresh: [true, pwaMocks.setNeedRefresh],
            offlineReady: [false, vi.fn()],
            updateServiceWorker: pwaMocks.updateServiceWorker,
        }
    },
}))

describe('PwaLifecycle', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    afterEach(() => {
        vi.useRealTimers()
        Object.defineProperty(navigator, 'onLine', {
            configurable: true,
            value: true,
        })
    })

    it('offers an explicit update action when a new service worker is ready', async () => {
        const user = userEvent.setup()

        render(
            <I18nProvider>
                <PwaLifecycle />
            </I18nProvider>,
        )

        expect(screen.getByRole('alert')).toHaveTextContent('New version available')
        await user.click(screen.getByRole('button', { name: 'Update' }))

        expect(pwaMocks.updateServiceWorker).toHaveBeenCalledWith(true)
        expect(screen.getByRole('button', { name: 'Updating...' })).toBeDisabled()
    })

    it('falls back to a full reload when Safari does not emit controllerchange', async () => {
        vi.useFakeTimers()

        render(
            <I18nProvider>
                <PwaLifecycle />
            </I18nProvider>,
        )

        fireEvent.click(screen.getByRole('button', { name: 'Update' }))
        await act(async () => {
            await Promise.resolve()
        })
        act(() => vi.advanceTimersByTime(2_000))

        expect(pwaMocks.reloadApplication).toHaveBeenCalledOnce()
    })

    it('reloads when the service worker update promise stays pending', async () => {
        vi.useFakeTimers()
        pwaMocks.updateServiceWorker.mockReturnValueOnce(new Promise<void>(() => undefined))

        render(
            <I18nProvider>
                <PwaLifecycle />
            </I18nProvider>,
        )

        fireEvent.click(screen.getByRole('button', { name: 'Update' }))
        act(() => vi.advanceTimersByTime(2_000))

        expect(pwaMocks.reloadApplication).toHaveBeenCalledOnce()
    })

    it('cancels the fallback reload when the service worker takes control', async () => {
        vi.useFakeTimers()

        render(
            <I18nProvider>
                <PwaLifecycle />
            </I18nProvider>,
        )

        fireEvent.click(screen.getByRole('button', { name: 'Update' }))
        await act(async () => {
            await Promise.resolve()
        })
        pwaMocks.options?.onNeedReload?.()
        act(() => vi.advanceTimersByTime(2_000))

        expect(pwaMocks.reloadApplication).toHaveBeenCalledOnce()
    })

    it('surfaces an update failure instead of leaving the action unresponsive', async () => {
        const user = userEvent.setup()
        pwaMocks.updateServiceWorker.mockRejectedValueOnce(new Error('registration failed'))

        render(
            <I18nProvider>
                <PwaLifecycle />
            </I18nProvider>,
        )

        await user.click(screen.getByRole('button', { name: 'Update' }))

        expect(await screen.findByRole('status')).toHaveTextContent('The update could not be applied')
        expect(screen.getByRole('button', { name: 'Update' })).toBeEnabled()
    })

    it('announces offline state when the network is unavailable', () => {
        Object.defineProperty(navigator, 'onLine', {
            configurable: true,
            value: false,
        })

        render(
            <I18nProvider>
                <PwaLifecycle />
            </I18nProvider>,
        )

        expect(screen.getByText('You are offline')).toBeVisible()
    })

    it('does not reload while a dirty form is registered', async () => {
        const user = userEvent.setup()
        const unregister = registerProtectedOperation('dirtyForms')

        render(
            <I18nProvider>
                <PwaLifecycle />
            </I18nProvider>,
        )

        await user.click(screen.getByRole('button', { name: 'Update' }))

        expect(pwaMocks.updateServiceWorker).not.toHaveBeenCalled()
        expect(screen.getByRole('status')).toHaveTextContent('Finish or save active work')
        unregister()
    })

    it('does not reload while a mutation is pending', async () => {
        const user = userEvent.setup()
        const unregister = registerProtectedOperation('pendingMutations')

        render(
            <I18nProvider>
                <PwaLifecycle />
            </I18nProvider>,
        )

        await user.click(screen.getByRole('button', { name: 'Update' }))

        expect(pwaMocks.updateServiceWorker).not.toHaveBeenCalled()
        expect(screen.getByRole('status')).toHaveTextContent('Finish or save active work')
        unregister()
    })

    it('retries the update after protected work is released', async () => {
        const user = userEvent.setup()
        const unregister = registerProtectedOperation('dirtyForms')

        render(
            <I18nProvider>
                <PwaLifecycle />
            </I18nProvider>,
        )

        await user.click(screen.getByRole('button', { name: 'Update' }))
        expect(pwaMocks.updateServiceWorker).not.toHaveBeenCalled()

        unregister()
        await user.click(screen.getByRole('button', { name: 'Update' }))

        expect(pwaMocks.updateServiceWorker).toHaveBeenCalledWith(true)
    })
})
