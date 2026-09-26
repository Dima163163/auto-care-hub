import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { providerProfiles } from '@/entities/automotive-service/model/autocareMockData'

import { RequestOrderSummary } from './RequestSummary'

vi.mock('@/shared/lib/useTranslation', () => ({
    useTranslation: () => ({
        locale: 'en-US',
        t: (key: string) => key,
    }),
}))

describe('RequestOrderSummary', () => {
    it('shows the appointment date, selected time, and service timezone', () => {
        const provider = providerProfiles[0]!
        const offering = provider.offerings[0]!

        render(
            <RequestOrderSummary
                provider={provider}
                offering={offering}
                appointmentDate="2026-09-26"
                appointmentTime="10:30"
                serviceTimezone="Europe/Moscow"
            />,
        )

        expect(screen.getByText('September 26 · 10:30 (Europe/Moscow)')).toBeInTheDocument()
        expect(screen.queryByText(/10:00/)).not.toBeInTheDocument()
    })
})
