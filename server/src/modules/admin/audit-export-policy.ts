export const MAX_AUDIT_CSV_CELL_LENGTH = 10_000
export const MAX_AUDIT_EXPORT_ROWS = 10_000

export function boundAuditCsvCell(value: string) {
    return value.length > MAX_AUDIT_CSV_CELL_LENGTH
        ? `${value.slice(0, MAX_AUDIT_CSV_CELL_LENGTH - 3)}...`
        : value
}

export function getAuditExportRowLimit(limit: number) {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_AUDIT_EXPORT_ROWS) {
        throw new Error('Audit export row limit is invalid.')
    }

    return limit
}
