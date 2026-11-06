import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Link, MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AutoCareRequestPage } from './AutoCareRequestPage'

const mocks = vi.hoisted(() => ({
    accountId: 'client-a' as string | null,
    profileDataId: null as string | null,
    createRequest: vi.fn(),
    createAttachment: vi.fn(),
}))

vi.mock('@/features/auth', () => ({
    useGetMeQuery: () => ({ data: mocks.accountId ? { id: mocks.accountId, role: 'client', emailVerifiedAt: '2026-01-01' } : undefined, isLoading: false }),
}))

vi.mock('@/entities/user', () => ({ useGetMyVehiclesQuery: () => ({ data: [], isFetching: false }) }))

vi.mock('@/entities/automotive-service', () => ({
    mapAutoCareProviderProfile: (data: { id: string }) => ({ id: data.id, marketId: 'market-1', offerings: [{ id: 'offering-1', serviceId: 'service-1' }] }),
    ServiceRequestChat: () => null,
    useAcceptAutoCareServiceQuoteMutation: () => [vi.fn(), { isLoading: false }],
    useCreateAutoCareServiceAttachmentMutation: () => [mocks.createAttachment],
    useCreateAutoCareServiceRequestMutation: () => [mocks.createRequest, { isLoading: false, error: null }],
    useDeclineAutoCareServiceQuoteMutation: () => [vi.fn(), { isLoading: false }],
    useGetAutoCareProviderProfileQuery: (id: string) => ({ data: { id: mocks.profileDataId ?? id, location: { id: 'location-1', timezone: 'Europe/Moscow' } }, isLoading: false, isError: false }),
    useGetAutoCareRepairTimelineQuery: () => ({ data: [] }),
    useGetAutoCareServiceConversationQuery: () => ({ data: null }),
    useGetMyAutoCareFleetsQuery: () => ({ data: [], isFetching: false }),
}))

vi.mock('@/shared/lib/useTranslation', () => ({
    useTranslation: () => ({ t: (key: string) => key, locale: 'en' }),
}))

vi.mock('./RequestForm', () => ({
    RequestForm: ({ onSubmit }: { onSubmit: (payload: unknown) => Promise<boolean> }) => (
        <button type="button" onClick={() => void onSubmit({
            preferredAt: '2026-11-07T07:00:00.000Z',
            vehicleId: null,
            vehicleSnapshot: null,
            contactSnapshot: { name: 'Client', email: 'client@example.com', phone: '' },
            note: null,
            files: [new File(['image'], 'photo.png', { type: 'image/png' })],
            dataProcessingConsent: true,
        })}>Submit fixture</button>
    ),
}))

vi.mock('./RequestSummary', () => ({
    RequestCompactSummary: () => null,
    RequestOrderSummary: () => null,
    RequestSummary: () => null,
}))

vi.mock('./RequestSteps', () => ({ RequestSteps: () => null }))
vi.mock('./GuaranteeClaimCard', () => ({ GuaranteeClaimCard: () => null }))

function requestPageTree() {
    return (
        <MemoryRouter initialEntries={['/services/provider-1/request?service=service-1']}>
            <Link to="/leave">Leave page</Link>
            <Link to="/services/provider-2/request?service=service-1">Another provider</Link>
            <Routes>
                <Route path="/services/:id/request" element={<AutoCareRequestPage />} />
                <Route path="/leave" element={<p>Left request page</p>} />
            </Routes>
        </MemoryRouter>
    )
}

function renderRequestPage() {
    return render(requestPageTree())
}

describe('AutoCareRequestPage pending operations', () => {
    beforeEach(() => {
        mocks.accountId = 'client-a'
        mocks.profileDataId = null
        mocks.createRequest.mockReset()
        mocks.createAttachment.mockReset()
    })

    it('aborts a slow create and never uploads its files after navigation', async () => {
        const abort = vi.fn()
        let finishCreate: (value: { id: string }) => void = () => {}
        mocks.createRequest.mockImplementation(() => ({
            abort,
            unwrap: () => new Promise((resolve) => { finishCreate = resolve }),
        }))
        renderRequestPage()

        fireEvent.click(screen.getByRole('button', { name: 'Submit fixture' }))
        await waitFor(() => expect(mocks.createRequest).toHaveBeenCalledOnce())
        fireEvent.click(screen.getByRole('link', { name: 'Leave page' }))
        expect(screen.getByText('Left request page')).toBeInTheDocument()
        expect(abort).toHaveBeenCalledOnce()

        await act(async () => finishCreate({ id: 'late-request' }))
        expect(mocks.createAttachment).not.toHaveBeenCalled()
    })

    it('aborts an attachment when the request page is left after creation', async () => {
        const abortAttachment = vi.fn()
        let finishAttachment: () => void = () => {}
        mocks.createRequest.mockImplementation(() => ({ unwrap: vi.fn().mockResolvedValue({ id: 'created-request' }) }))
        mocks.createAttachment.mockImplementation(() => ({
            abort: abortAttachment,
            unwrap: () => new Promise((resolve) => { finishAttachment = () => resolve({}) }),
        }))
        renderRequestPage()

        fireEvent.click(screen.getByRole('button', { name: 'Submit fixture' }))
        await waitFor(() => expect(mocks.createAttachment).toHaveBeenCalledOnce())
        fireEvent.click(screen.getByRole('link', { name: 'Leave page' }))
        expect(abortAttachment).toHaveBeenCalledOnce()

        await act(async () => finishAttachment())
    })

    it('aborts a slow create when the same page changes to another provider', async () => {
        const abort = vi.fn()
        let finishCreate: (value: { id: string }) => void = () => {}
        mocks.createRequest.mockImplementation(() => ({
            abort,
            unwrap: () => new Promise((resolve) => { finishCreate = resolve }),
        }))
        renderRequestPage()

        fireEvent.click(screen.getByRole('button', { name: 'Submit fixture' }))
        await waitFor(() => expect(mocks.createRequest).toHaveBeenCalledOnce())
        fireEvent.click(screen.getByRole('link', { name: 'Another provider' }))
        expect(abort).toHaveBeenCalledOnce()
        expect(screen.getByRole('button', { name: 'Submit fixture' })).toBeInTheDocument()

        await act(async () => finishCreate({ id: 'old-provider-request' }))
        expect(mocks.createAttachment).not.toHaveBeenCalled()
    })

    it('aborts a slow create when the active account signs out', async () => {
        const abort = vi.fn()
        let finishCreate: (value: { id: string }) => void = () => {}
        mocks.createRequest.mockImplementation(() => ({
            abort,
            unwrap: () => new Promise((resolve) => { finishCreate = resolve }),
        }))
        const { rerender } = renderRequestPage()

        fireEvent.click(screen.getByRole('button', { name: 'Submit fixture' }))
        await waitFor(() => expect(mocks.createRequest).toHaveBeenCalledOnce())
        mocks.accountId = null
        rerender(requestPageTree())
        expect(abort).toHaveBeenCalledOnce()

        await act(async () => finishCreate({ id: 'signed-out-request' }))
        expect(mocks.createAttachment).not.toHaveBeenCalled()
    })

    it('does not start an attachment after a slow file read and navigation', async () => {
        const originalFileReader = globalThis.FileReader
        let finishRead: (() => void) | null = null
        class SlowFileReader {
            result = 'data:image/png;base64,aW1hZ2U='
            error = null
            onload: (() => void) | null = null
            onerror: (() => void) | null = null
            readAsDataURL() { finishRead = () => this.onload?.() }
        }
        vi.stubGlobal('FileReader', SlowFileReader)
        mocks.createRequest.mockImplementation(() => ({ unwrap: vi.fn().mockResolvedValue({ id: 'created-request' }) }))

        try {
            renderRequestPage()
            fireEvent.click(screen.getByRole('button', { name: 'Submit fixture' }))
            await waitFor(() => expect(finishRead).not.toBeNull())
            fireEvent.click(screen.getByRole('link', { name: 'Leave page' }))
            await act(async () => finishRead?.())
            expect(mocks.createAttachment).not.toHaveBeenCalled()
        } finally {
            vi.stubGlobal('FileReader', originalFileReader)
        }
    })

    it('hides a stale provider form while the new provider profile loads', () => {
        renderRequestPage()
        expect(screen.getByRole('button', { name: 'Submit fixture' })).toBeInTheDocument()

        mocks.profileDataId = 'provider-1'
        fireEvent.click(screen.getByRole('link', { name: 'Another provider' }))

        expect(screen.queryByRole('button', { name: 'Submit fixture' })).not.toBeInTheDocument()
    })
})
