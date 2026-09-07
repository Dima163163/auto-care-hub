import { render, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getProviderProfile } from '@/entities/automotive-service/model/autocareMockData'
import type { TranslationKey } from '@/shared/lib/i18n'
import { I18nContext } from '@/shared/lib/i18n-context'

import { ProviderLocationMap } from './ProviderLocationMap'

const mocks = vi.hoisted(() => {
    const mapInstance = {
        invalidateSize: vi.fn(),
        remove: vi.fn(),
        setView: vi.fn(),
    }
    mapInstance.setView.mockReturnValue(mapInstance)

    const tileLayerInstance = {
        addTo: vi.fn(),
        on: vi.fn(),
        removeFrom: vi.fn(),
    }
    tileLayerInstance.addTo.mockReturnValue(tileLayerInstance)
    tileLayerInstance.on.mockReturnValue(tileLayerInstance)

    const markerElement = { setAttribute: vi.fn() }
    const markerInstance = {
        addTo: vi.fn(),
        getElement: vi.fn(() => markerElement),
    }
    markerInstance.addTo.mockReturnValue(markerInstance)

    return {
        divIcon: vi.fn(() => ({})),
        map: vi.fn(() => mapInstance),
        marker: vi.fn(() => markerInstance),
        markerElement,
        tileLayer: vi.fn(() => tileLayerInstance),
    }
})

vi.mock('leaflet', () => ({
    divIcon: mocks.divIcon,
    map: mocks.map,
    marker: mocks.marker,
    tileLayer: mocks.tileLayer,
}))

describe('ProviderLocationMap accessibility', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('labels the non-interactive provider marker as an image', async () => {
        const provider = getProviderProfile('proservice-moscow')
        if (!provider) throw new Error('Expected ProService fixture')

        render(
            <I18nContext.Provider value={{
                locale: 'ru',
                setLocale: vi.fn(),
                t: (key: TranslationKey, params) => {
                    if (key === 'autocare.providerMapLabel') return 'Карта расположения сервиса'
                    if (key === 'autocare.providerMapMarkerLabel') return `Расположение сервиса «${params?.name ?? ''}»`
                    if (key === 'autocare.viewOnMap') return 'Открыть карту'
                    return key
                },
            }}>
                <ProviderLocationMap provider={provider} />
            </I18nContext.Provider>,
        )

        await waitFor(() => {
            expect(mocks.marker).toHaveBeenCalledWith(expect.any(Array), expect.objectContaining({ interactive: false, keyboard: false }))
            expect(mocks.markerElement.setAttribute).toHaveBeenCalledWith('role', 'img')
            expect(mocks.markerElement.setAttribute).toHaveBeenCalledWith('aria-label', 'Расположение сервиса «ProService»')
            expect(mocks.markerElement.setAttribute).toHaveBeenCalledWith('title', 'Расположение сервиса «ProService»')
        })
    })
})
