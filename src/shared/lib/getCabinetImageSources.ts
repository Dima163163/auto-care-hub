import { getMediaUrl } from './getMediaUrl'
import type { CabinetImageAsset } from '@/entities/cabinet'

export function getCabinetImageSources(
    source: string | undefined,
    assets?: CabinetImageAsset[] | undefined,
) {
    if (!source) {
        return { src: undefined, srcSet: undefined }
    }

    const normalizedSource = getMediaUrl(source)
    const explicitAsset = assets?.find((asset) =>
        asset.original.url === source || getMediaUrl(asset.original.url) === normalizedSource,
    )

    if (explicitAsset) {
        const candidates = [explicitAsset.thumbnail, explicitAsset.preview]
            .filter((variant): variant is NonNullable<typeof variant> => Boolean(variant))
            .map((variant) => `${getMediaUrl(variant.url)} ${variant.width}w`)

        return {
            src: getMediaUrl(explicitAsset.fallbackUrl),
            srcSet: candidates.length > 0 ? candidates.join(', ') : undefined,
        }
    }

    return {
        src: normalizedSource,
        srcSet: undefined,
    }
}
