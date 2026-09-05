import { getAutoCareProviderLogoFileName } from './autocare-provider-logo-storage.js'
import { getAutoCareProviderMediaFileName } from './autocare-provider-media-storage.js'

/**
 * Static provider images are bundled with the application and therefore do
 * not need moderation. The pattern is deliberately narrow: only the
 * provider-assets subtree and known image extensions are trusted. In
 * particular, protocol-relative URLs, query strings and path traversal never
 * match it.
 */
const staticProviderLogoPattern = /^\/images\/autocare\/providers\/logos\/[a-z0-9][a-z0-9_-]*\.(?:svg|webp|png)$/i
const staticProviderMediaPattern = /^\/images\/autocare\/providers\/(?!logos\/)(?:[a-z0-9][a-z0-9_-]*\/)*[a-z0-9][a-z0-9_-]*\.(?:avif|gif|jpe?g|png|webp)$/i

export type AutoCarePublicMediaInput = {
    logoUrl?: string | null
    coverImageUrl?: string | null
    galleryImageUrls?: readonly string[] | null
}

export type AutoCarePublicMedia = {
    logoUrl: string | null
    coverImageUrl: string | null
    galleryImageUrls: string[]
}

function normalizeReference(value: string | null | undefined) {
    const normalized = value?.trim()
    return normalized || null
}

function isStaticProviderAsset(value: string, kind: 'logo' | 'media') {
    return kind === 'logo'
        ? staticProviderLogoPattern.test(value)
        : staticProviderMediaPattern.test(value)
}

/**
 * Public provider media may be either a generated private-upload URL exposed
 * through the application route or a bundled demo asset. Arbitrary external
 * URLs are intentionally not accepted at this output boundary.
 */
export function isAllowedAutoCareProviderPublicMediaReference(
    value: string | null | undefined,
    kind: 'logo' | 'cover' | 'gallery',
) {
    const normalized = normalizeReference(value)
    if (!normalized) return false
    if (kind === 'logo') {
        return Boolean(getAutoCareProviderLogoFileName(normalized)) || isStaticProviderAsset(normalized, 'logo')
    }
    return Boolean(getAutoCareProviderMediaFileName(normalized, kind)) || isStaticProviderAsset(normalized, 'media')
}

function normalizePublicReference(value: string | null | undefined, kind: 'logo' | 'cover' | 'gallery') {
    const normalized = normalizeReference(value)
    return normalized && isAllowedAutoCareProviderPublicMediaReference(normalized, kind) ? normalized : null
}

export function normalizeAutoCareProviderPublicMediaReference(
    value: string | null | undefined,
    kind: 'logo' | 'cover' | 'gallery',
) {
    return normalizePublicReference(value, kind)
}

export function normalizeAutoCareProviderPublicMedia(input: AutoCarePublicMediaInput): AutoCarePublicMedia {
    const galleryImageUrls = [...new Set((input.galleryImageUrls ?? [])
        .map((reference) => normalizePublicReference(reference, 'gallery'))
        .filter((reference): reference is string => Boolean(reference)))]
    return {
        logoUrl: normalizePublicReference(input.logoUrl, 'logo'),
        coverImageUrl: normalizePublicReference(input.coverImageUrl, 'cover'),
        galleryImageUrls,
    }
}

/**
 * Strict write-boundary policy for owner-created provider profiles. Unlike the
 * response normalizer above, invalid values are rejected instead of silently
 * filtered so a direct service call cannot persist an arbitrary media URL.
 */
export function normalizeAutoCareProviderPublicMediaForWrite(input: {
    logoUrl?: unknown
    coverImageUrl?: unknown
    galleryImageUrls?: unknown
}): AutoCarePublicMedia | null {
    const hasLogo = input.logoUrl !== undefined && input.logoUrl !== null
    const hasCover = input.coverImageUrl !== undefined && input.coverImageUrl !== null
    const logoUrl = hasLogo && typeof input.logoUrl === 'string' ? input.logoUrl.trim() : null
    const coverImageUrl = hasCover && typeof input.coverImageUrl === 'string' ? input.coverImageUrl.trim() : null
    if (hasLogo && (!logoUrl || !getAutoCareProviderLogoFileName(logoUrl))) return null
    if (hasCover && (!coverImageUrl || !getAutoCareProviderMediaFileName(coverImageUrl, 'cover'))) return null

    const galleryInput = input.galleryImageUrls === undefined || input.galleryImageUrls === null ? [] : input.galleryImageUrls
    if (!Array.isArray(galleryInput) || galleryInput.length > 12) return null
    const galleryImageUrls: string[] = []
    for (const value of galleryInput) {
        if (typeof value !== 'string') return null
        const reference = value.trim()
        if (!getAutoCareProviderMediaFileName(reference, 'gallery')) return null
        if (!galleryImageUrls.includes(reference)) galleryImageUrls.push(reference)
    }
    return { logoUrl, coverImageUrl, galleryImageUrls }
}

/** Review photos currently arrive from seeded/bundled assets or the same
 * generated provider-media namespace. Keep the response boundary strict until
 * the private review-media uploader is enabled in staging. */
export function normalizeAutoCareReviewPhotoUrls(values: readonly string[] | null | undefined) {
    return [...new Set((values ?? [])
        .map((reference) => normalizePublicReference(reference, 'gallery'))
        .filter((reference): reference is string => Boolean(reference)))]
}

export type AutoCareProviderModerationMediaEntry = {
    kind: 'provider_cover' | 'provider_gallery'
    label: string
    reference: string
}

/**
 * Only application-generated uploads enter the moderation queue. Bundled
 * assets are trusted build artefacts and external URLs are rejected instead
 * of being turned into moderation evidence.
 */
export function selectAutoCareProviderModerationMedia(input: AutoCarePublicMediaInput): AutoCareProviderModerationMediaEntry[] {
    const entries: AutoCareProviderModerationMediaEntry[] = []
    if (input.coverImageUrl && getAutoCareProviderMediaFileName(input.coverImageUrl, 'cover')) {
        entries.push({ kind: 'provider_cover', label: 'Главное фото сервиса', reference: input.coverImageUrl })
    }
    const gallery = [...new Set(input.galleryImageUrls ?? [])]
    let acceptedGalleryCount = 0
    for (const reference of gallery) {
        if (!getAutoCareProviderMediaFileName(reference, 'gallery')) continue
        acceptedGalleryCount += 1
        entries.push({ kind: 'provider_gallery', label: `Фото сервиса ${acceptedGalleryCount}`, reference })
    }
    return entries
}
