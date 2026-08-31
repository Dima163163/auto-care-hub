import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ClientBookingField } from './ClientBookingField'
import { OwnerBookingField } from '../../create-owner-booking/ui/OwnerBookingField'

describe('booking field errors', () => {
    it('announces client and owner booking validation errors', () => {
        render(
            <>
                <ClientBookingField error="Выберите услугу." errorId="client-error" htmlFor="client" label="Услуга">
                    <select id="client" />
                </ClientBookingField>
                <OwnerBookingField error="Выберите клиента." errorId="owner-error" htmlFor="owner" label="Клиент">
                    <select id="owner" />
                </OwnerBookingField>
            </>,
        )

        expect(screen.getAllByRole('alert')).toHaveLength(2)
        expect(screen.getByText('Выберите услугу.')).toHaveAttribute('id', 'client-error')
        expect(screen.getByText('Выберите клиента.')).toHaveAttribute('id', 'owner-error')
    })
})
