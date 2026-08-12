export type ReconciliationDryRunResult = {
    dryRun: true
    checked: number
    wouldRepair: number
    errors: number
}

export function createReconciliationDryRunResult(input: {
    checked: number
    wouldRepair: number
    errors: number
}): ReconciliationDryRunResult {
    const values = [input.checked, input.wouldRepair, input.errors]
    if (values.some((value) => !Number.isSafeInteger(value) || value < 0)) {
        throw new Error('Reconciliation dry-run counters are invalid.')
    }
    if (input.wouldRepair > input.checked || input.errors > input.checked) {
        throw new Error('Reconciliation dry-run counters are inconsistent.')
    }

    return {
        dryRun: true,
        checked: input.checked,
        wouldRepair: input.wouldRepair,
        errors: input.errors,
    }
}
