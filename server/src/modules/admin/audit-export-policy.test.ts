import { describe, expect, it } from 'vitest'

import {
    boundAuditCsvCell,
    getAuditExportRowLimit,
    MAX_AUDIT_CSV_CELL_LENGTH,
} from './audit-export-policy.js'

describe('audit export policy', () => {
    it('keeps CSV cells within the export bound', () => {
        expect(boundAuditCsvCell('small')).toBe('small')
        expect(boundAuditCsvCell('x'.repeat(MAX_AUDIT_CSV_CELL_LENGTH + 10))).toHaveLength(MAX_AUDIT_CSV_CELL_LENGTH)
        expect(boundAuditCsvCell('x'.repeat(MAX_AUDIT_CSV_CELL_LENGTH + 10)).endsWith('...')).toBe(true)
    })

    it('rejects unsafe export row limits', () => {
        expect(getAuditExportRowLimit(10_000)).toBe(10_000)
        expect(() => getAuditExportRowLimit(0)).toThrow(/invalid/)
        expect(() => getAuditExportRowLimit(10_001)).toThrow(/invalid/)
    })
})
