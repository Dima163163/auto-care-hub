import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    createProvider: vi.fn(),
    uploadLogo: vi.fn(),
    uploadMedia: vi.fn(),
    prepareProviderMedia: vi.fn(),
}))

vi.mock('sonner', () => ({
    toast: { error: vi.fn(), success: vi.fn() },
}))

vi.mock('@/shared/lib/useTranslation', () => ({
    useTranslation: () => ({ locale: 'en', t: (key: string) => key }),
}))

vi.mock('@/shared/lib/form-draft', () => ({
    readFormDraft: vi.fn(() => null),
}))

vi.mock('@/shared/lib/useFormDraft', () => ({
    useFormDraft: () => ({ clearDraft: vi.fn() }),
}))

vi.mock('@/shared/ui/form-draft-notice/FormDraftNotice', () => ({
    FormDraftNotice: () => null,
}))

vi.mock('@/entities/automotive-service/lib/providerLogoUpload', () => ({
    prepareProviderMedia: (...args: unknown[]) => mocks.prepareProviderMedia(...args),
}))

vi.mock('@/entities/automotive-service', () => ({
    automotiveAmenities: [{ id: 'waiting_area' }],
    defaultAutomotiveAmenityIds: ['waiting_area'],
    automotiveVehicleBrands: [],
    AutomotiveAmenityIcon: () => null,
    getAutomotiveAmenityLabel: () => 'Waiting area',
    getVehicleBrandLabel: () => 'Brand',
    useCreateOwnerAutoCareProviderMutation: () => [mocks.createProvider, { isLoading: false }],
    useUploadOwnerAutoCareProviderLogoMutation: () => [mocks.uploadLogo, { isLoading: false }],
    useUploadOwnerAutoCareProviderMediaMutation: () => [mocks.uploadMedia, { isLoading: false }],
}))

import { OwnerAutoCareProviderForm } from './OwnerAutoCareProviderForm'

describe('OwnerAutoCareProviderForm', () => {
    beforeEach(() => {
        mocks.createProvider.mockReset().mockImplementation(() => ({ unwrap: vi.fn().mockResolvedValue({}) }))
        mocks.uploadLogo.mockReset().mockImplementation(() => ({ unwrap: vi.fn().mockResolvedValue({ url: '/uploads/logo.webp' }) }))
        mocks.uploadMedia.mockReset().mockImplementation(() => ({ unwrap: vi.fn().mockResolvedValue({ url: '/uploads/media.webp' }) }))
        mocks.prepareProviderMedia.mockReset().mockResolvedValue({ fileName: 'service.webp', mimeType: 'image/webp', size: 1, contentBase64: 'image' })
    })

    it('blocks media uploads when trimmed required data is invalid', async () => {
        const user = userEvent.setup()
        const { container } = render(<OwnerAutoCareProviderForm market={{ id: 'market-samara', cityName: 'Samara' }} />)

        await user.type(screen.getByLabelText('autocare.ownerProviderNameLabel'), ' A ')
        await user.type(screen.getByLabelText('autocare.ownerProviderAddressLabel'), 'Lenina 1')
        await user.type(screen.getByLabelText('autocare.ownerProviderHoursLabel'), 'Mon–Sun: 09:00–21:00')
        fireEvent.submit(container.querySelector('form') as HTMLFormElement)

        expect(await screen.findByRole('alert')).toHaveTextContent('autocare.ownerProviderValidationError')
        expect(mocks.uploadLogo).not.toHaveBeenCalled()
        expect(mocks.uploadMedia).not.toHaveBeenCalled()
        expect(mocks.createProvider).not.toHaveBeenCalled()
    })

    it('shows an accessible media error and keeps the form retryable when image preparation fails', async () => {
        const user = userEvent.setup()
        const { container } = render(<OwnerAutoCareProviderForm market={{ id: 'market-samara', cityName: 'Samara' }} />)

        await user.type(screen.getByLabelText('autocare.ownerProviderNameLabel'), 'ProService')
        await user.type(screen.getByLabelText('autocare.ownerProviderAddressLabel'), 'Lenina 1')
        await user.type(screen.getByLabelText('autocare.ownerProviderHoursLabel'), 'Mon–Sun: 09:00–21:00')
        expect(screen.getByLabelText('autocare.ownerProviderNameLabel')).toHaveValue('ProService')
        mocks.prepareProviderMedia.mockRejectedValueOnce(new Error('Unable to read image'))
        await user.upload(container.querySelector('input[name="logo"]') as HTMLInputElement, new File(['image'], 'logo.png', { type: 'image/png' }))
        expect((container.querySelector('input[name="logo"]') as HTMLInputElement).files?.length).toBe(1)
        expect(container.querySelector('form')?.checkValidity()).toBe(true)
        fireEvent.submit(container.querySelector('form') as HTMLFormElement)

        expect(mocks.prepareProviderMedia).toHaveBeenCalled()
        expect(await screen.findByRole('alert')).toHaveTextContent('autocare.ownerProviderMediaUploadFailed')
        expect(mocks.createProvider).not.toHaveBeenCalled()
        expect(screen.getByLabelText('autocare.ownerProviderNameLabel')).toHaveValue('ProService')
    })

    it('reuses a successfully uploaded logo when profile creation is retried', async () => {
        const user = userEvent.setup()
        const { container } = render(<OwnerAutoCareProviderForm market={{ id: 'market-samara', cityName: 'Samara' }} />)

        await user.type(screen.getByLabelText('autocare.ownerProviderNameLabel'), 'ProService')
        await user.type(screen.getByLabelText('autocare.ownerProviderAddressLabel'), 'Lenina 1')
        await user.type(screen.getByLabelText('autocare.ownerProviderHoursLabel'), 'Mon–Sun: 09:00–21:00')
        await user.upload(container.querySelector('input[name="logo"]') as HTMLInputElement, new File(['image'], 'logo.png', { type: 'image/png' }))

        mocks.createProvider.mockReset()
            .mockImplementationOnce(() => ({ unwrap: vi.fn().mockRejectedValue({ data: { message: 'Temporary server error.' } }) }))
            .mockImplementation(() => ({ unwrap: vi.fn().mockResolvedValue({}) }))
        fireEvent.submit(container.querySelector('form') as HTMLFormElement)
        await waitFor(() => expect(mocks.createProvider).toHaveBeenCalledTimes(1))

        fireEvent.submit(container.querySelector('form') as HTMLFormElement)
        await waitFor(() => expect(mocks.createProvider).toHaveBeenCalledTimes(2))

        expect(mocks.uploadLogo).toHaveBeenCalledOnce()
        expect(mocks.prepareProviderMedia).toHaveBeenCalledOnce()
    })
})
