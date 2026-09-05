import { randomUUID } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import {
    isAllowedAutoCareProviderPublicMediaReference,
    normalizeAutoCareProviderPublicMedia,
    normalizeAutoCareProviderPublicMediaForWrite,
    normalizeAutoCareReviewPhotoUrls,
    selectAutoCareProviderModerationMedia,
} from './autocare-public-media-policy.js'
import { isSafePrivateReference, normalizePrivateReference } from './private-reference-policy.js'

describe('AutoCare public media policy', () => {
    it('keeps only generated uploads and trusted bundled provider assets', () => {
        const gallery = `/uploads/autocare/media/gallery/${randomUUID()}.webp`
        expect(normalizeAutoCareProviderPublicMedia({
            logoUrl: 'https://evil.example/logo.webp',
            coverImageUrl: 'https://evil.example/cover.webp',
            galleryImageUrls: [gallery, gallery, '//evil.example/gallery.webp', '/images/autocare/providers/generated/service-detailing.png'],
        })).toEqual({
            logoUrl: null,
            coverImageUrl: null,
            galleryImageUrls: [gallery, '/images/autocare/providers/generated/service-detailing.png'],
        })
        expect(isAllowedAutoCareProviderPublicMediaReference('/images/autocare/providers/logos/proservice.svg', 'logo')).toBe(true)
        expect(isAllowedAutoCareProviderPublicMediaReference('/images/autocare/providers/../../users/avatar.webp', 'gallery')).toBe(false)
    })

    it('queues only application-generated provider uploads for moderation', () => {
        const cover = `/uploads/autocare/media/cover/${randomUUID()}.webp`
        const gallery = `/uploads/autocare/media/gallery/${randomUUID()}.webp`
        expect(selectAutoCareProviderModerationMedia({
            coverImageUrl: cover,
            galleryImageUrls: [
                'https://evil.example/gallery.webp',
                '/images/autocare/providers/proservice.webp',
                gallery,
                gallery,
            ],
        })).toEqual([
            { kind: 'provider_cover', label: 'Главное фото сервиса', reference: cover },
            { kind: 'provider_gallery', label: 'Фото сервиса 1', reference: gallery },
        ])
    })

    it('does not expose arbitrary review photo URLs', () => {
        expect(normalizeAutoCareReviewPhotoUrls([
            'https://evil.example/review.webp',
            '/images/autocare/providers/generated/review-detailing.webp',
            '/images/autocare/providers/generated/review-detailing.webp',
        ])).toEqual(['/images/autocare/providers/generated/review-detailing.webp'])
    })

    it('rejects invalid provider media at the write boundary instead of filtering it', () => {
        const logo = `/uploads/autocare/logos/${randomUUID()}.webp`
        const cover = `/uploads/autocare/media/cover/${randomUUID()}.webp`
        const gallery = `/uploads/autocare/media/gallery/${randomUUID()}.webp`
        expect(normalizeAutoCareProviderPublicMediaForWrite({ logoUrl: ` ${logo} `, coverImageUrl: cover, galleryImageUrls: [gallery, gallery] })).toEqual({
            logoUrl: logo,
            coverImageUrl: cover,
            galleryImageUrls: [gallery],
        })
        expect(normalizeAutoCareProviderPublicMediaForWrite({ logoUrl: 'https://evil.example/logo.webp' })).toBeNull()
        expect(normalizeAutoCareProviderPublicMediaForWrite({ coverImageUrl: cover, galleryImageUrls: ['//evil.example/gallery.webp'] })).toBeNull()
        expect(normalizeAutoCareProviderPublicMediaForWrite({ galleryImageUrls: Array.from({ length: 13 }, () => gallery) })).toBeNull()
        expect(normalizeAutoCareProviderPublicMediaForWrite({ galleryImageUrls: [null] })).toBeNull()
    })
    it('keeps private evidence references opaque and traversal-safe', () => {
        expect(isSafePrivateReference('private://providers/docs/license.pdf')).toBe(true)
        expect(normalizePrivateReference(' private://providers/docs/license.pdf ')).toBe('private://providers/docs/license.pdf')
        expect(isSafePrivateReference('private://providers/../secrets')).toBe(false)
        expect(isSafePrivateReference('private://providers//secrets')).toBe(false)
        expect(isSafePrivateReference('private:///secrets')).toBe(false)
    })
})
