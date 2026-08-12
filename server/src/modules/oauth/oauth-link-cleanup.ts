export function selectExpiredOAuthLinkRequestIds(
    rows: Array<{ id: string }>,
    batchSize: number,
) {
    if (!Number.isInteger(batchSize) || batchSize < 1) {
        throw new Error('OAuth link cleanup batch size must be a positive integer.')
    }

    return rows.slice(0, batchSize).map((row) => row.id)
}
