import { act, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import {
    registerProtectedOperation,
    useOperationSafety,
} from './operation-safety'

function OperationSafetyProbe() {
    const { dirtyForms, pendingMutations } = useOperationSafety()

    return (
        <output data-testid="operation-safety">
            {`${dirtyForms}:${pendingMutations}`}
        </output>
    )
}

describe('operation safety registry', () => {
    it('keeps independent dirty and pending counts balanced', () => {
        render(<OperationSafetyProbe />)
        let dirtyCleanup: () => void = () => undefined
        let pendingCleanup: () => void = () => undefined

        act(() => {
            dirtyCleanup = registerProtectedOperation('dirtyForms')
            pendingCleanup = registerProtectedOperation('pendingMutations')
        })

        expect(screen.getByTestId('operation-safety')).toHaveTextContent('1:1')

        act(() => {
            dirtyCleanup()
            pendingCleanup()
        })

        expect(screen.getByTestId('operation-safety')).toHaveTextContent('0:0')
    })

    it('does not underflow when cleanup is called more than once', () => {
        render(<OperationSafetyProbe />)
        let cleanup: () => void = () => undefined

        act(() => {
            cleanup = registerProtectedOperation('dirtyForms')
        })

        act(() => {
            cleanup()
            cleanup()
        })

        expect(screen.getByTestId('operation-safety')).toHaveTextContent('0:0')
    })
})
