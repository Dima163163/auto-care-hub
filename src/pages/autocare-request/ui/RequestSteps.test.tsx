import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RequestSteps } from './RequestSteps'
vi.mock('@/shared/lib/useTranslation', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
describe('request progress', () => {
    it('marks only the active form stage and retains four steps after submission', () => {
        const { rerender } = render(<RequestSteps submitted={false} activeStep={3} />)
        expect(screen.getAllByRole('listitem')).toHaveLength(4)
        expect(screen.getByText('autocare.requestStepDetails').closest('li')).toHaveAttribute('aria-current', 'step')
        expect(document.querySelectorAll('[aria-current="step"]')).toHaveLength(1)
        rerender(<RequestSteps submitted />)
        expect(screen.getByText('autocare.requestStepReview').closest('li')).toHaveAttribute('aria-current', 'step')
    })
})
