import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { OwnerFleetVehicleForm } from './OwnerFleetVehicleForm'

const mocks = vi.hoisted(() => ({ accountId: 'owner-a', createVehicle: vi.fn() }))

vi.mock('@/features/auth', () => ({
    useGetMeQuery: () => ({ data: { id: mocks.accountId } }),
}))

vi.mock('@/entities/automotive-service', () => ({
    getVehicleBrandLabel: () => 'Test brand',
    useCreateAutoCareFleetVehicleMutation: () => [mocks.createVehicle, { isLoading: false }],
    useGetVehicleCatalogQuery: () => ({ data: null }),
    vehicleCatalog: [{ id: 'brand-1', models: [] }],
}))

vi.mock('@/shared/lib/useTranslation', () => ({
    useTranslation: () => ({ locale: 'en', t: (key: string) => key }),
}))

describe('OwnerFleetVehicleForm', () => {
    beforeEach(() => {
        mocks.accountId = 'owner-a'
        mocks.createVehicle.mockReset()
        localStorage.clear()
    })

    it('does not restore a fleet vehicle draft under another owner account', async () => {
        const props = { fleetId: 'fleet-1', onCancel: vi.fn(), onCreated: vi.fn() }
        localStorage.setItem('autocare-owner-fleet-vehicle:fleet-1', 'legacy shared draft')
        const { rerender } = render(<OwnerFleetVehicleForm {...props} />)
        expect(localStorage.getItem('autocare-owner-fleet-vehicle:fleet-1')).toBeNull()

        fireEvent.change(screen.getByLabelText('autocare.ownerFleetVehicleMake'), { target: { value: 'brand-1' } })
        await waitFor(() => expect(localStorage.getItem('autocare-owner-fleet-vehicle:owner-a:fleet-1')).not.toBeNull())

        mocks.accountId = 'owner-b'
        rerender(<OwnerFleetVehicleForm {...props} />)

        expect(screen.getByLabelText('autocare.ownerFleetVehicleMake')).toHaveValue('')
        expect(localStorage.getItem('autocare-owner-fleet-vehicle:owner-b:fleet-1')).toBeNull()
    })

    it('aborts a pending vehicle creation when the owner account changes', async () => {
        const abort = vi.fn()
        let rejectCreate: (error: Error) => void = () => {}
        mocks.createVehicle.mockImplementation(() => ({
            abort,
            unwrap: () => new Promise((_, reject) => { rejectCreate = reject }),
        }))
        const props = { fleetId: 'fleet-1', onCancel: vi.fn(), onCreated: vi.fn() }
        const { rerender } = render(<OwnerFleetVehicleForm {...props} />)

        fireEvent.change(screen.getByLabelText('autocare.ownerFleetVehicleMake'), { target: { value: 'brand-1' } })
        fireEvent.submit(screen.getByRole('button', { name: 'autocare.ownerFleetVehicleSave' }).closest('form') as HTMLFormElement)
        await waitFor(() => expect(mocks.createVehicle).toHaveBeenCalledOnce())

        mocks.accountId = 'owner-b'
        rerender(<OwnerFleetVehicleForm {...props} />)
        expect(abort).toHaveBeenCalledOnce()
        await act(async () => rejectCreate(new Error('aborted')))
        expect(props.onCreated).not.toHaveBeenCalled()
    })
})
