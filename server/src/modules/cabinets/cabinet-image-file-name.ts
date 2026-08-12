export const MAX_CABINET_IMAGE_OBJECT_KEY_LENGTH = 128

export function normalizeCabinetImageFileName(fileName: string) {
    const normalized = fileName.trim()
    if (
        normalized.length < 1
        || normalized.length > MAX_CABINET_IMAGE_OBJECT_KEY_LENGTH
        || !/^[a-f0-9-]+(?:-(?:thumb|preview))?\.(jpg|png|webp)$/.test(normalized)
    ) {
        throw new Error('Cabinet image file name is invalid.')
    }

    return normalized
}
