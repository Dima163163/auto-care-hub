import sharp from 'sharp'

export type CabinetImageDimensions = {
    width: number
    height: number
}

export async function readCabinetImageDimensions(content: Buffer): Promise<CabinetImageDimensions> {
    const metadata = await sharp(content, { failOn: 'error' }).metadata()
    const width = metadata.width ?? 0
    const height = metadata.height ?? 0

    if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1) {
        throw new Error('Cabinet image dimensions are unavailable.')
    }

    return { width, height }
}
