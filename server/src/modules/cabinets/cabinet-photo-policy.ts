import { stripControlCharacters } from '../../shared/security/string-normalization.js'

export const MAX_CABINET_PHOTOS = 20
export const MAX_CABINET_PHOTO_URL_LENGTH = 2_048

export function assertCabinetPhotoList(photos: string[]) {
    const normalizedPhotos = photos.map((photo) => stripControlCharacters(photo).trim())
    if (
        normalizedPhotos.length > MAX_CABINET_PHOTOS
        || normalizedPhotos.some((photo) => photo.length < 1 || photo.length > MAX_CABINET_PHOTO_URL_LENGTH)
    ) {
        throw new Error('Cabinet photo list is invalid.')
    }

    return normalizedPhotos
}
