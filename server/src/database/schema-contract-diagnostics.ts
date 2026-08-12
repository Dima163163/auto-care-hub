import {
    getSchemaContractReasonCodes,
    type SchemaContractReasonCode,
    type SchemaContractStatus,
} from './schema-contract.js'

export type SchemaContractCheckResult = {
    ok: boolean
    reasonCodes: SchemaContractReasonCode[]
    status: SchemaContractStatus
}

export function createSchemaContractCheckResult(
    status: SchemaContractStatus,
): SchemaContractCheckResult {
    const reasonCodes = getSchemaContractReasonCodes(status)

    return {
        ok: reasonCodes.length === 0,
        reasonCodes,
        status,
    }
}

