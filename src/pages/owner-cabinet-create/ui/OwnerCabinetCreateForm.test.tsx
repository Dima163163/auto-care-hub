import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'

import { I18nProvider } from '@/shared/lib/i18n-provider'
import { useOperationSafety } from '@/shared/lib/operation-safety'
import { PwaLifecycle } from '@/features/pwa-lifecycle'
import { OwnerCabinetCreateForm } from './OwnerCabinetCreateForm'

const mocks = vi.hoisted(() => ({
    createCabinet: vi.fn(() => ({
        unwrap: vi.fn().mockResolvedValue({}),
    })),
    uploadCabinetImage: vi.fn(() => ({
        unwrap: vi.fn().mockResolvedValue({ url: '/uploaded.webp' }),
    })),
    navigate: vi.fn(),
    updateServiceWorker: vi.fn().mockResolvedValue(undefined),
    setNeedRefresh: vi.fn(),
}))

vi.mock('@/entities/cabinet', () => ({
    CabinetImageField: ({ label }: { label: string }) => (
        <input aria-label={label} type="file" />
    ),
    useCreateCabinetMutation: () => [mocks.createCabinet, { isLoading: false }],
    useUploadCabinetImageMutation: () => [
        mocks.uploadCabinetImage,
        { isLoading: false },
    ],
}))

vi.mock('@/entities/cabinet/lib/useCabinetImageInput', () => ({
    useCabinetImageInput: () => ({
        clearImageError: vi.fn(),
        hasUploadedImage: false,
        handleImageChange: vi.fn(),
        imageError: null,
        imagePreviewUrl: null,
        uploadSelectedImage: vi.fn().mockResolvedValue(null),
    }),
}))

vi.mock('@/features/auth', () => ({
    useGetMeQuery: () => ({
        data: {
            id: 'owner-1',
        },
    }),
}))

vi.mock('react-router', async () => {
    const actual = await vi.importActual<typeof import('react-router')>('react-router')

    return {
        ...actual,
        useNavigate: () => mocks.navigate,
    }
})

vi.mock('virtual:pwa-register/react', () => ({
    useRegisterSW: () => ({
        needRefresh: [true, mocks.setNeedRefresh],
        offlineReady: [false, vi.fn()],
        updateServiceWorker: mocks.updateServiceWorker,
    }),
}))

function OperationSafetyProbe() {
    const { dirtyForms, pendingMutations } = useOperationSafety()

    return (
        <div data-testid="operation-safety">
            {`${dirtyForms}:${pendingMutations}`}
        </div>
    )
}

function TestHarness() {
    return (
        <MemoryRouter>
            <I18nProvider>
                <OwnerCabinetCreateForm />
                <PwaLifecycle />
                <OperationSafetyProbe />
            </I18nProvider>
        </MemoryRouter>
    )
}

describe('OwnerCabinetCreateForm operation safety wiring', () => {
    beforeEach(() => {
        mocks.createCabinet.mockReturnValue({
            unwrap: vi.fn().mockResolvedValue({}),
        })
    })

    afterEach(() => {
        localStorage.clear()
        vi.clearAllMocks()
    })

    it('blocks a PWA update while the real form has unsaved values', async () => {
        const user = userEvent.setup()
        const { unmount } = render(<TestHarness />)

        expect(screen.getByTestId('operation-safety')).toHaveTextContent('0:0')
        const title = screen.getByRole('textbox', { name: /title/i })
        await user.clear(title)
        await user.type(title, 'New cabinet')

        await waitFor(() => {
            expect(screen.getByTestId('operation-safety')).toHaveTextContent('1:0')
        })

        await user.click(screen.getByRole('button', { name: /update/i }))

        expect(mocks.updateServiceWorker).not.toHaveBeenCalled()
        expect(screen.getByRole('status')).toHaveTextContent('Finish or save active work')

        unmount()
        render(<OperationSafetyProbe />)
        expect(screen.getByTestId('operation-safety')).toHaveTextContent('0:0')
    })

    it('keeps the draft and avoids success navigation after a network failure', async () => {
        const user = userEvent.setup()
        mocks.createCabinet.mockReturnValue({
            unwrap: vi.fn().mockRejectedValue({ status: 'FETCH_ERROR' }),
        })

        render(<TestHarness />)

        await user.type(screen.getByRole('textbox', { name: /title/i }), 'New cabinet')
        await user.type(
            screen.getByRole('textbox', { name: /description/i }),
            'A quiet cabinet for private client appointments.',
        )
        await user.type(screen.getByRole('textbox', { name: /city/i }), 'Berlin')
        await user.type(screen.getByRole('textbox', { name: /address/i }), 'Main Street 12')

        const draftKey = 'autocare-hub:owner-cabinet-create:v2:owner-1'
        await waitFor(() => {
            expect(localStorage.getItem(draftKey)).toContain('New cabinet')
        })

        await user.click(screen.getByRole('button', { name: /create cabinet/i }))

        await waitFor(() => {
            expect(screen.getByText(/connection was interrupted/i)).toBeVisible()
        })
        expect(mocks.navigate).not.toHaveBeenCalled()
        expect(localStorage.getItem(draftKey)).toContain('New cabinet')
    })
})
