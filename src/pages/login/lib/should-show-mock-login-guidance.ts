import type { ApiMode } from '@/shared/config/api'

export function shouldShowMockLoginGuidance(apiMode: ApiMode) {
    return apiMode === 'mock'
}
