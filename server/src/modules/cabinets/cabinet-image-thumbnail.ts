import sharp from 'sharp'

export const CABINET_IMAGE_THUMBNAIL_WIDTH = 640
export const CABINET_IMAGE_THUMBNAIL_HEIGHT = 480
export const CABINET_IMAGE_PREVIEW_WIDTH = 1280
export const CABINET_IMAGE_PREVIEW_HEIGHT = 960

async function createCabinetImageVariant(content: Buffer, width: number, height: number) {
    return sharp(content, { failOn: 'error', sequentialRead: true })
        .resize({
            width,
            height,
            fit: 'inside',
            withoutEnlargement: true,
        })
        .webp({ quality: 80 })
        .toBuffer()
}

export function createCabinetImageThumbnail(content: Buffer) {
    return createCabinetImageVariant(
        content,
        CABINET_IMAGE_THUMBNAIL_WIDTH,
        CABINET_IMAGE_THUMBNAIL_HEIGHT,
    )
}

export function createCabinetImagePreview(content: Buffer) {
    return createCabinetImageVariant(
        content,
        CABINET_IMAGE_PREVIEW_WIDTH,
        CABINET_IMAGE_PREVIEW_HEIGHT,
    )
}
