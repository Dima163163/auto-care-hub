import { describe, expect, it } from 'vitest'

import { createReconciliationDryRunResult } from './reconciliation-dry-run.js'

describe('reconciliation dry-run contract', () => {
    it('marks repair counts as preview-only', () => {
        expect(createReconciliationDryRunResult({ checked: 5, wouldRepair: 2, errors: 0 })).toEqual({
            dryRun: true,
            checked: 5,
            wouldRepair: 2,
            errors: 0,
        })
    })

    it('rejects inconsistent counters', () => {
        expect(() => createReconciliationDryRunResult({ checked: 1, wouldRepair: 2, errors: 0 })).toThrow(/inconsistent/)
    })
})
