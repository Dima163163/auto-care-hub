import type { FastifyInstance } from 'fastify'

import { requireAuth, requireVerifiedEmail } from '../auth/require-auth.js'
import {
    validateBody,
    validateParams,
    validateQuery,
} from '../../shared/validation/validate.js'
import {
    cabinetParamsSchema,
    createOwnerCabinetSchema,
    MAX_CABINET_IMAGE_SIZE_BYTES,
    publicCabinetsQuerySchema,
    updateOwnerCabinetSchema,
} from './cabinets.schemas.js'
import {
    createOwnerCabinet,
    deleteOwnerCabinet,
    getOwnerCabinetById,
    getOwnerCabinets,
    getAllPublicCabinets,
    getPublicCabinetById,
    getPublicCabinets,
    updateOwnerCabinet,
} from './cabinets.service.js'
import type {
    DeleteCabinetResponse,
    OwnerCabinet,
    PublicCabinet,
} from './cabinets.types.js'
import {
    assertSafeImageFileName,
    createCabinetImageReadStream,
    imageContentTypesByExtension,
    saveCabinetImage,
} from './cabinet-image-storage.js'
import { CABINET_IMAGE_CACHE_CONTROL } from './cabinet-image-response.js'
import {
    assertCabinetImageContentMatchesMimeType,
    assertCabinetImageContentMatchesSize,
    decodeCabinetImageBase64,
    normalizeCabinetImage,
    validateUploadCabinetImageBody,
} from './cabinet-image-upload.js'
import {
    createRateLimitPreHandler,
    getAuthenticatedUserRateLimitIdentifier,
} from '../../shared/security/rate-limit.js'
import { assertCabinetOwner } from './cabinet-owner-access.js'
import { AppDataSource } from '../../database/data-source.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { CabinetEntity } from '../../entities/cabinet/cabinet.entity.js'
import { CabinetScheduleEntity } from '../../entities/cabinet/cabinet-schedule.entity.js'
import { CabinetScheduleExceptionEntity } from '../../entities/cabinet/cabinet-schedule-exception.entity.js'
import {
    CabinetBlockedPeriodEntity,
} from '../../entities/cabinet/cabinet-blocked-period.entity.js'
import { blockedPeriodsSchema, exceptionsSchema, scheduleSchema } from './cabinet-schedule-policy.js'
import type { EntityManager } from 'typeorm'

type CabinetsListResponse = {
    items: PublicCabinet[]
    total: number
    page: number
    totalPages: number
}
type AllCabinetsResponse = PublicCabinet[]
type CabinetDetailsResponse = PublicCabinet
type OwnerCabinetsListResponse = OwnerCabinet[]
type OwnerCabinetResponse = OwnerCabinet
type UploadCabinetImageResponse = {
    url: string
}
type CabinetImageParams = {
    fileName: string
}

const ONE_MINUTE_MS = 60 * 1000

const cabinetImageUploadRateLimit = createRateLimitPreHandler({
    maxRequests: 10,
    scope: 'cabinet:image-upload',
    windowMs: ONE_MINUTE_MS,
    keyResolvers: [getAuthenticatedUserRateLimitIdentifier],
})

async function withCabinetCalendarLock<T>(
    cabinetId: string,
    operation: (manager: EntityManager) => Promise<T>,
) {
    return AppDataSource.transaction(async (manager) => {
        const lockedCabinet = await manager.getRepository(CabinetEntity).findOne({
            where: { id: cabinetId },
            lock: { mode: 'pessimistic_write' },
        })

        if (!lockedCabinet) {
            throw new AppError({
                statusCode: 404,
                code: ERROR_CODES.NotFound,
                message: 'Cabinet not found.',
            })
        }

        return operation(manager)
    })
}

export async function cabinetsRoutes(app: FastifyInstance) {
    app.get<{ Querystring: unknown; Reply: CabinetsListResponse }>('/cabinets', async (request) => {
        const query = validateQuery(publicCabinetsQuerySchema, request.query)

        return getPublicCabinets(query)
    })

    app.get<{ Reply: AllCabinetsResponse }>('/cabinets/all', async () => {
        return getAllPublicCabinets()
    })

    app.get<{ Params: unknown; Reply: CabinetDetailsResponse }>(
        '/cabinets/:id',
        async (request) => {
            const params = validateParams(cabinetParamsSchema, request.params)

            return getPublicCabinetById(params.id)
        }
    )

    app.get<{ Params: CabinetImageParams }>(
        '/uploads/cabinets/:fileName',
        async (request, reply) => {
            const { fileName } = request.params
            assertSafeImageFileName(fileName)

            const extension = fileName.split('.').at(-1) as keyof typeof imageContentTypesByExtension

            return reply
                .header('cache-control', CABINET_IMAGE_CACHE_CONTROL)
                .type(imageContentTypesByExtension[extension])
                .send(createCabinetImageReadStream(fileName))
        }
    )

    app.get<{ Reply: OwnerCabinetsListResponse }>(
        '/owner/cabinets',
        async (request) => {
            const user = await requireAuth(request)

            return getOwnerCabinets(user)
        }
    )

    app.get<{ Params: unknown; Reply: OwnerCabinetResponse }>(
        '/owner/cabinets/:id',
        async (request) => {
            const user = await requireAuth(request)
            const params = validateParams(cabinetParamsSchema, request.params)

            return getOwnerCabinetById(user, params.id)
        }
    )

    app.get<{ Params: unknown }>('/owner/cabinets/:id/schedule', async (request) => {
        const user = await requireAuth(request)
        const params = validateParams(cabinetParamsSchema, request.params)
        const cabinet = await getOwnerCabinetById(user, params.id)
        const items = await AppDataSource.getRepository(CabinetScheduleEntity).find({
            where: { cabinetId: cabinet.id },
            order: { weekday: 'ASC' },
        })
        return { items }
    })

    app.put<{ Params: unknown; Body: unknown }>('/owner/cabinets/:id/schedule', async (request) => {
        const user = await requireAuth(request)
        const params = validateParams(cabinetParamsSchema, request.params)
        const cabinet = await getOwnerCabinetById(user, params.id)
        const body = validateBody(scheduleSchema, request.body)
        const items = await withCabinetCalendarLock(cabinet.id, async (manager) => {
            const repository = manager.getRepository(CabinetScheduleEntity)
            await repository.delete({ cabinetId: cabinet.id })
            await repository.save(body.items.map((item) => repository.create({ ...item, cabinetId: cabinet.id })))
            return repository.find({ where: { cabinetId: cabinet.id }, order: { weekday: 'ASC' } })
        })
        return { items }
    })

    app.get<{ Params: unknown }>('/owner/cabinets/:id/schedule-exceptions', async (request) => {
        const user = await requireAuth(request)
        const params = validateParams(cabinetParamsSchema, request.params)
        const cabinet = await getOwnerCabinetById(user, params.id)
        const items = await AppDataSource.getRepository(CabinetScheduleExceptionEntity).find({
            where: { cabinetId: cabinet.id }, order: { date: 'ASC' },
        })
        return { items }
    })

    app.put<{ Params: unknown; Body: unknown }>('/owner/cabinets/:id/schedule-exceptions', async (request) => {
        const user = await requireAuth(request)
        const params = validateParams(cabinetParamsSchema, request.params)
        const cabinet = await getOwnerCabinetById(user, params.id)
        const body = validateBody(exceptionsSchema, request.body)
        const items = await withCabinetCalendarLock(cabinet.id, async (manager) => {
            const repository = manager.getRepository(CabinetScheduleExceptionEntity)
            await repository.delete({ cabinetId: cabinet.id })
            await repository.save(body.items.map((item) => repository.create({ ...item, cabinetId: cabinet.id })))
            return repository.find({ where: { cabinetId: cabinet.id }, order: { date: 'ASC' } })
        })
        return { items }
    })

    app.get<{ Params: unknown }>('/owner/cabinets/:id/blocked-periods', async (request) => {
        const user = await requireAuth(request)
        const params = validateParams(cabinetParamsSchema, request.params)
        const cabinet = await getOwnerCabinetById(user, params.id)
        const items = await AppDataSource.getRepository(CabinetBlockedPeriodEntity).find({
            where: { cabinetId: cabinet.id },
            order: { date: 'ASC', startTime: 'ASC' },
        })
        return { items }
    })

    app.put<{ Params: unknown; Body: unknown }>('/owner/cabinets/:id/blocked-periods', async (request) => {
        const user = await requireAuth(request)
        const params = validateParams(cabinetParamsSchema, request.params)
        const cabinet = await getOwnerCabinetById(user, params.id)
        const body = validateBody(blockedPeriodsSchema, request.body)

        const items = await withCabinetCalendarLock(cabinet.id, async (manager) => {
            const repository = manager.getRepository(CabinetBlockedPeriodEntity)
            await repository.delete({ cabinetId: cabinet.id })
            await repository.save(body.items.map((item) => repository.create({
                ...item,
                reason: item.reason || null,
                cabinetId: cabinet.id,
            })))
            return repository.find({
                where: { cabinetId: cabinet.id },
                order: { date: 'ASC', startTime: 'ASC' },
            })
        })

        return { items }
    })

    app.post<{ Body: unknown; Reply: OwnerCabinetResponse }>(
        '/cabinets',
        async (request) => {
            const user = await requireVerifiedEmail(request)
            const body = validateBody(createOwnerCabinetSchema, request.body)

            return createOwnerCabinet(user, body)
        }
    )

    app.post<{ Body: unknown; Reply: UploadCabinetImageResponse }>(
        '/cabinet-images',
        {
            bodyLimit: MAX_CABINET_IMAGE_SIZE_BYTES * 2,
            preHandler: cabinetImageUploadRateLimit,
        },
        async (request) => {
            const user = await requireVerifiedEmail(request)

            assertCabinetOwner(user)

            const body = validateUploadCabinetImageBody(request.body)
            const imageBuffer = decodeCabinetImageBase64(body.contentBase64)

            assertCabinetImageContentMatchesSize(imageBuffer, body)
            assertCabinetImageContentMatchesMimeType(imageBuffer, body)
            const normalizedImage = await normalizeCabinetImage({
                content: imageBuffer,
                mimeType: body.mimeType,
            })

            return {
                url: await saveCabinetImage({
                    content: normalizedImage,
                    mimeType: body.mimeType,
                }),
            }
        }
    )

    app.patch<{ Params: unknown; Body: unknown; Reply: OwnerCabinetResponse }>(
        '/cabinets/:id',
        async (request) => {
            const user = await requireVerifiedEmail(request)
            const params = validateParams(cabinetParamsSchema, request.params)
            const body = validateBody(updateOwnerCabinetSchema, request.body)

            return updateOwnerCabinet(user, params.id, body)
        }
    )

    app.delete<{ Params: unknown; Reply: DeleteCabinetResponse }>(
        '/cabinets/:id',
        async (request) => {
            const user = await requireVerifiedEmail(request)
            const params = validateParams(cabinetParamsSchema, request.params)

            return deleteOwnerCabinet(user, params.id)
        }
    )
}
