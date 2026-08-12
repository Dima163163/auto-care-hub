export const MAX_CABINET_IMAGE_DELETE_BATCH = 100

export function boundCabinetImageDeleteBatch(fileNames: string[]) {
    if (fileNames.length > MAX_CABINET_IMAGE_DELETE_BATCH) {
        throw new Error('Cabinet image delete batch is too large.')
    }

    return Array.from(new Set(fileNames))
}
