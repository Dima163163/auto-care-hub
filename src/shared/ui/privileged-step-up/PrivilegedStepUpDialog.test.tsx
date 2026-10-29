import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { requestPrivilegedStepUpCode } from '@/shared/lib/privileged-step-up'
import { PrivilegedStepUpDialog } from './PrivilegedStepUpDialog'

vi.mock('@/shared/lib/useTranslation', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}))

describe('privileged step-up dialog', () => {
    it('collects a code only after an explicit confirmation and allows cancellation', async () => {
        const user = userEvent.setup()
        render(<PrivilegedStepUpDialog />)

        const first = requestPrivilegedStepUpCode(false)
        expect(await screen.findByRole('dialog', { name: 'auth.stepUpTitle' })).toBeInTheDocument()
        await user.type(screen.getByLabelText('auth.mfaCodeLabel'), '123456')
        await user.click(screen.getByRole('button', { name: 'common.confirm' }))
        await expect(first).resolves.toBe('123456')

        const second = requestPrivilegedStepUpCode(true)
        expect(await screen.findByRole('alert')).toHaveTextContent('auth.stepUpInvalid')
        expect(screen.getByLabelText('auth.mfaCodeLabel')).toHaveValue('')
        await user.click(screen.getByRole('button', { name: 'common.cancel' }))
        await expect(second).resolves.toBeNull()
    })
})
