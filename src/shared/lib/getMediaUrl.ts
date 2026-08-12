import { API_BASE_URL } from '@/shared/config/api'

export function getMediaUrl(url: string) {
    if (
        url.startsWith('http://') ||
        url.startsWith('https://') ||
        url.startsWith('data:') ||
        !url.startsWith('/uploads/')
    ) {
        return url
    }

    return `${API_BASE_URL}${url}`
}
