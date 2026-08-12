import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/lib/useTranslation', () => ({
    useTranslation: () => ({
        t: (key: string) => key,
    }),
}))

vi.mock('./cabinetImageUpload', () => ({
    normalizeCabinetImageFile: vi.fn(async (file: File) => file),
    validateCabinetImageFile: vi.fn(() => ({ isValid: true })),
}))

vi.mock('./readCabinetImageFile', () => ({
    readCabinetImageFile: vi.fn(async () => 'base64-image'),
}))

import { useCabinetImageInput } from './useCabinetImageInput'

describe('useCabinetImageInput', () => {
    it('reuses a successful upload until a new file is selected', async () => {
        const uploadImage = vi.fn().mockResolvedValue({
            url: '/uploads/cabinets/first.webp',
        })
        const firstFile = new File(['first'], 'first.jpg', { type: 'image/jpeg' })
        const secondFile = new File(['second'], 'second.jpg', { type: 'image/jpeg' })
        const { result } = renderHook(() => useCabinetImageInput())

        act(() => result.current.handleImageChange(firstFile))

        await act(async () => {
            await result.current.uploadSelectedImage(uploadImage)
        })
        await act(async () => {
            await result.current.uploadSelectedImage(uploadImage)
        })

        expect(uploadImage).toHaveBeenCalledOnce()
        expect(result.current.hasUploadedImage).toBe(true)

        act(() => result.current.handleImageChange(secondFile))

        expect(result.current.hasUploadedImage).toBe(false)
    })
})
