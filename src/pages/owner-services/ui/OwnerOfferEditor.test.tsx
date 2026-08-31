import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { AutoCareApiOffer } from '@/entities/automotive-service'

import { OwnerOfferEditor } from './OwnerOfferEditor'

const updateOffer = vi.hoisted(() => vi.fn())

vi.mock('@/entities/automotive-service', () => ({
    useUpdateOwnerAutoCareOfferMutation: () => [updateOffer, { isLoading: false, error: { data: { message: 'Цена уже изменилась.' } } }],
}))

const labels = {
    edit: 'Редактировать',
    offerDescription: 'Описание услуги',
    descriptionPlaceholder: 'Опишите услугу',
    price: 'Цена',
    bookingMode: 'Режим записи',
    bookingModeRequest: 'Заявка',
    bookingModeInstant: 'Мгновенно',
    priceInvalid: 'Укажите корректную цену.',
    editError: 'Не удалось сохранить услугу.',
    priceSnapshotNotice: 'Цена для новых заявок.',
    save: 'Сохранить',
    cancel: 'Отмена',
}

const offer = {
    id: 'offer-1',
    description: 'Замена масла',
    priceFromMinor: 2_500_00,
    bookingMode: 'request',
} as unknown as AutoCareApiOffer

describe('OwnerOfferEditor', () => {
    it('announces save failures and keeps the edited values for retry', async () => {
        updateOffer.mockReset().mockImplementation(() => ({
            unwrap: vi.fn().mockRejectedValue({ data: { message: 'Цена уже изменилась.' } }),
        }))
        const user = userEvent.setup()
        const onCancel = vi.fn()
        const onSaved = vi.fn()

        render(<OwnerOfferEditor providerId="provider-1" offer={offer} labels={labels} onCancel={onCancel} onSaved={onSaved} />)

        const price = screen.getByRole('spinbutton')
        await user.clear(price)
        await user.type(price, '2750')
        await user.click(screen.getByRole('button', { name: 'Сохранить' }))

        expect(await screen.findByRole('alert')).toHaveTextContent('Цена уже изменилась.')
        expect(price).toHaveValue(2750)
        expect(onSaved).not.toHaveBeenCalled()
    })
})
