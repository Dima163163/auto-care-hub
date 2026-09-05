import test from 'node:test'
import assert from 'node:assert/strict'

import { evaluateErrorCodeContract } from './check-error-code-contract.mjs'

const sourceMap = {
    errorCodesSource: [
        "export const ERROR_CODES = {",
        "  ValidationError: 'VALIDATION_ERROR',",
        "  Forbidden: 'FORBIDDEN',",
        '} as const',
    ].join('\n'),
    sourceFiles: {
        'service.ts': 'throw new AppError({ code: ERROR_CODES.Forbidden })',
    },
}

test('passes a complete error-code registry and references', () => {
    const results = evaluateErrorCodeContract(sourceMap)
    assert.equal(results.filter((result) => result.status === 'blocked').length, 0)
})

test('reports unknown references and duplicate values', () => {
    const results = evaluateErrorCodeContract({
        errorCodesSource: sourceMap.errorCodesSource.replace("  Forbidden: 'FORBIDDEN',", "  Forbidden: 'VALIDATION_ERROR',"),
        sourceFiles: { 'service.ts': 'ERROR_CODES.MissingCode' },
    })
    const references = results.find((result) => result.name === 'Error-code references')
    const uniqueness = results.find((result) => result.name === 'Error-code uniqueness')
    assert.equal(references?.status, 'blocked')
    assert.equal(uniqueness?.status, 'blocked')
})
