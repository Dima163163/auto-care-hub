import { AppDataSource } from '../../database/data-source.js'
import { BookingEntity } from '../../entities/booking/booking.entity.js'
import {
    CabinetEntity,
    CabinetStatus,
} from '../../entities/cabinet/cabinet.entity.js'
import { UserEntity } from '../../entities/user/user.entity.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import {
    deleteUploadedCabinetImages,
    ensureCabinetImageManifests,
    getRemovedUploadedCabinetImages,
} from './cabinet-image-storage.js'
import { assertCabinetOwner } from './cabinet-owner-access.js'
import { toOwnerCabinet, toPublicCabinet } from './cabinets.mappers.js'
import type { PublicCabinet } from './cabinets.types.js'
import { normalizeCabinetTitle } from './cabinet-input-policy.js'
import { getCabinetSlotsSql } from './cabinet-availability-sql.js'
import { getCabinetPagination, MAX_CABINET_PAGE_SIZE } from './cabinet-pagination-policy.js'
import { normalizeCabinetSearchTerm } from './cabinet-search-policy.js'
import { assertCabinetNumericFilters } from './cabinet-filter-policy.js'
import { assertCabinetPhotoList } from './cabinet-photo-policy.js'
import { assertCabinetSort } from './cabinet-sort-policy.js'
import {
    assertCabinetPrice,
    MAX_OWNER_CABINETS,
    normalizeCabinetAddress,
    normalizeCabinetAmenities,
    normalizeCabinetCity,
    normalizeCabinetDescription,
    normalizeCabinetPolicy,
    normalizeCabinetTimezone,
} from './cabinet-content-policy.js'

type CreateOwnerCabinetInput = {
    title: string
    description: string
    address: string
    city: string
    timezone?: string
    pricePerHour: number
    status?: CabinetStatus
    photos?: string[]
    amenities?: string[]
    cancellationPolicy?: string | null
    houseRules?: string | null
}

type UpdateOwnerCabinetInput = Partial<CreateOwnerCabinetInput>

function formatTime(minutes: number) {
    return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

async function getAvailabilityPreviews(
    cabinetIds: string[],
    date: string | null,
    duration: number | null,
    now: Date,
) {
    const previews = new Map<string, NonNullable<PublicCabinet['availabilityPreview']>>()
    if (!cabinetIds.length) return previews

    const rows: Array<{ id: string; date: string; start_minute: number; end_minute: number }> =
        await AppDataSource.query(`
            SELECT cabinet.id, slot.*
            FROM cabinets AS cabinet
            CROSS JOIN LATERAL (${getCabinetSlotsSql('positional')}) AS slot
            WHERE cabinet.id = ANY($1::uuid[])
            ORDER BY cabinet.id, slot.start_minute
        `, [cabinetIds, date, duration, now])

    for (const row of rows) {
        const slot = { startTime: formatTime(row.start_minute), endTime: formatTime(row.end_minute) }
        const preview = previews.get(row.id)
        if (!preview) {
            previews.set(row.id, { date: row.date, ...slot, freeSlots: 1, slots: [slot] })
            continue
        }
        preview.freeSlots += 1
        if (preview.slots.length < 4) preview.slots.push(slot)
    }
    return previews
}

async function getOwnerCabinetEntityById(ownerId: string, cabinetId: string) {
    const cabinetRepository = AppDataSource.getRepository(CabinetEntity)

    const cabinet = await cabinetRepository.findOne({
        where: {
            id: cabinetId,
            ownerId,
        },
    })

    if (!cabinet) {
        throw new AppError({
            statusCode: 404,
            code: ERROR_CODES.NotFound,
            message: 'Cabinet not found.',
        })
    }

    return cabinet
}

type GetPublicCabinetsInput = {
    search?: string
    sortBy?: 'price_asc' | 'price_desc' | 'newest' | 'popular'
    city?: string
    category?: string
    minPrice?: number
    maxPrice?: number
    minRating?: number
    service?: string
    availableToday?: boolean
    availabilityDate?: string
    durationMinutes?: number
    page?: number
    limit?: number
}

export async function getPublicCabinets(input?: GetPublicCabinetsInput) {
    const cabinetRepository = AppDataSource.getRepository(CabinetEntity)
    const search = normalizeCabinetSearchTerm(input?.search)
    const city = normalizeCabinetSearchTerm(input?.city)
    const category = normalizeCabinetSearchTerm(input?.category)
    const service = normalizeCabinetSearchTerm(input?.service)
    const sortBy = assertCabinetSort(input?.sortBy)
    assertCabinetNumericFilters(input ?? {})

    const query = cabinetRepository.createQueryBuilder('cabinet')
        .where('cabinet.status = :status', { status: CabinetStatus.Active })

    if (search) {
        query.andWhere(
            '(cabinet.title ILIKE :search OR cabinet.city ILIKE :search)',
            { search: `%${search}%` }
        )
    }

    if (city) {
        query.andWhere('cabinet.city ILIKE :city', {
            city: `%${city}%`,
        })
    }

    if (input?.minPrice !== undefined) {
        query.andWhere('cabinet.pricePerHour >= :minPrice', {
            minPrice: input.minPrice,
        })
    }

    if (input?.maxPrice !== undefined) {
        query.andWhere('cabinet.pricePerHour <= :maxPrice', {
            maxPrice: input.maxPrice,
        })
    }

    if (category) {
        query.andWhere(`(
            cabinet.title ILIKE :category
            OR cabinet.description ILIKE :category
            OR array_to_string(cabinet.amenities, ' ') ILIKE :category
            OR EXISTS (
                SELECT 1
                FROM services category_service
                WHERE category_service."cabinetId" = cabinet.id
                  AND category_service."isActive" = true
                  AND category_service.title ILIKE :category
            )
        )`, {
            category: `%${category}%`,
        })
    }

    if (service) {
        query.andWhere(`EXISTS (
            SELECT 1
            FROM services matching_service
            WHERE matching_service."cabinetId" = cabinet.id
              AND matching_service."isActive" = true
              AND matching_service.title ILIKE :service
        )`, {
            service: `%${service}%`,
        })
    }

    if (input?.minRating !== undefined) {
        query.andWhere(`(
            SELECT COALESCE(AVG(rating_review.rating), 0)
            FROM reviews rating_review
            WHERE rating_review."cabinetId" = cabinet.id
              AND rating_review.status = 'approved'
        ) >= :minRating`, {
            minRating: input.minRating,
        })
    }

    if (sortBy === 'popular') {
        query.addSelect(`(
            (SELECT COUNT(*) FROM reviews review WHERE review."cabinetId" = cabinet.id AND review.status = 'approved') * 3
            + (SELECT COUNT(*) FROM bookings booking WHERE booking."cabinetId" = cabinet.id AND booking.status IN ('pending', 'confirmed'))
        )`, 'popularity_score')
        query.orderBy('popularity_score', 'DESC')
        query.addOrderBy('cabinet.createdAt', 'DESC')
    } else if (sortBy === 'price_asc') {
        query.orderBy('cabinet.pricePerHour', 'ASC')
    } else if (sortBy === 'price_desc') {
        query.orderBy('cabinet.pricePerHour', 'DESC')
    } else {
        query.orderBy('cabinet.createdAt', 'DESC')
    }

    query.addOrderBy('cabinet.id', 'ASC')
    const { page, limit } = getCabinetPagination(input?.page, input?.limit)
    const now = new Date()
    const date = input?.availabilityDate ?? null
    const duration = input?.durationMinutes ?? null
    if (input?.availableToday && !date && duration !== null) {
        query.andWhere(`EXISTS (
            SELECT 1 FROM services AS active_service
            WHERE active_service."cabinetId" = cabinet.id AND active_service."isActive" = true
        )`)
    }
    if (input?.availableToday || date || duration !== null) {
        query.andWhere(`EXISTS (${getCabinetSlotsSql('named')})`, {
            availabilityDate: date,
            availabilityDuration: duration,
            availabilityNow: now,
        })
    }

    const [cabinets, total] = await query.skip((page - 1) * limit).take(limit).getManyAndCount()
    const [availabilityPreviews, imageManifests] = await Promise.all([
        getAvailabilityPreviews(cabinets.map((cabinet) => cabinet.id), date, duration, now),
        ensureCabinetImageManifests(cabinets.flatMap((cabinet) => cabinet.photos)),
    ])

    return {
        items: cabinets.map((cabinet) => toPublicCabinet(cabinet, availabilityPreviews.get(cabinet.id), imageManifests)),
        total,
        page,
        totalPages: Math.ceil(total / limit),
    }
}

/** Preserve the legacy response shape without traversing the entire catalog. */
export async function getAllPublicCabinets() {
    const result = await getPublicCabinets({ page: 1, limit: MAX_CABINET_PAGE_SIZE })
    if (result.total > MAX_CABINET_PAGE_SIZE) {
        throw new AppError({
            statusCode: 409,
            code: ERROR_CODES.Conflict,
            message: 'Use the paginated /cabinets endpoint for catalogs with more than 50 entries.',
        })
    }
    return result.items
}

export async function getPublicCabinetById(id: string) {
    const cabinetRepository = AppDataSource.getRepository(CabinetEntity)

    const cabinet = await cabinetRepository.findOne({
        where: {
            id,
            status: CabinetStatus.Active,
        },
    })

    if (!cabinet) {
        throw new AppError({
            statusCode: 404,
            code: ERROR_CODES.NotFound,
            message: 'Cabinet not found.',
        })
    }

    const [availabilityPreviews, imageManifests] = await Promise.all([
        getAvailabilityPreviews([cabinet.id], null, null, new Date()),
        ensureCabinetImageManifests(cabinet.photos),
    ])
    return toPublicCabinet(cabinet, availabilityPreviews.get(cabinet.id), imageManifests)
}

export async function getOwnerCabinets(owner: UserEntity) {
    assertCabinetOwner(owner)

    const cabinetRepository = AppDataSource.getRepository(CabinetEntity)

    const cabinets = await cabinetRepository.find({
        where: {
            ownerId: owner.id,
        },
        order: {
            createdAt: 'DESC',
        },
        take: MAX_OWNER_CABINETS,
    })
    const imageManifests = await ensureCabinetImageManifests(cabinets.flatMap((cabinet) => cabinet.photos))

    return cabinets.map((cabinet) => toOwnerCabinet(cabinet, imageManifests))
}

export async function getOwnerCabinetById(owner: UserEntity, cabinetId: string) {
    assertCabinetOwner(owner)

    const cabinet = await getOwnerCabinetEntityById(owner.id, cabinetId)

    const imageManifests = await ensureCabinetImageManifests(cabinet.photos)

    return toOwnerCabinet(cabinet, imageManifests)
}

export async function createOwnerCabinet(
    owner: UserEntity,
    input: CreateOwnerCabinetInput
) {
    assertCabinetOwner(owner)
    const timezone = normalizeCabinetTimezone(input.timezone) ?? 'UTC'

    const cabinetRepository = AppDataSource.getRepository(CabinetEntity)

    const cabinet = cabinetRepository.create({
        ownerId: owner.id,
        title: normalizeCabinetTitle(input.title),
        description: normalizeCabinetDescription(input.description),
        address: normalizeCabinetAddress(input.address),
        city: normalizeCabinetCity(input.city),
        timezone,
        pricePerHour: assertCabinetPrice(input.pricePerHour),
        status: input.status ?? CabinetStatus.Draft,
        photos: assertCabinetPhotoList(input.photos ?? []),
        amenities: normalizeCabinetAmenities(input.amenities ?? []),
        cancellationPolicy: normalizeCabinetPolicy(input.cancellationPolicy),
        houseRules: normalizeCabinetPolicy(input.houseRules),
    })

    const savedCabinet = await cabinetRepository.save(cabinet)

    const imageManifests = await ensureCabinetImageManifests(savedCabinet.photos)

    return toOwnerCabinet(savedCabinet, imageManifests)
}

export async function updateOwnerCabinet(
    owner: UserEntity,
    cabinetId: string,
    input: UpdateOwnerCabinetInput
) {
    assertCabinetOwner(owner)

    const cabinetRepository = AppDataSource.getRepository(CabinetEntity)
    const cabinet = await getOwnerCabinetEntityById(owner.id, cabinetId)

    if (input.title !== undefined) {
        cabinet.title = normalizeCabinetTitle(input.title)
    }

    if (input.description !== undefined) {
        cabinet.description = normalizeCabinetDescription(input.description)
    }

    if (input.address !== undefined) {
        cabinet.address = normalizeCabinetAddress(input.address)
    }

    if (input.city !== undefined) {
        cabinet.city = normalizeCabinetCity(input.city)
    }

    if (input.timezone !== undefined) {
        cabinet.timezone = normalizeCabinetTimezone(input.timezone) ?? cabinet.timezone
    }

    if (input.pricePerHour !== undefined) {
        cabinet.pricePerHour = assertCabinetPrice(input.pricePerHour)
    }

    if (input.status !== undefined) {
        cabinet.status = input.status
    }

    const previousPhotos = cabinet.photos

    if (input.photos !== undefined) {
        cabinet.photos = assertCabinetPhotoList(input.photos)
    }

    if (input.amenities !== undefined) {
        cabinet.amenities = normalizeCabinetAmenities(input.amenities)
    }

    if (input.cancellationPolicy !== undefined) {
        cabinet.cancellationPolicy = normalizeCabinetPolicy(input.cancellationPolicy)
    }

    if (input.houseRules !== undefined) {
        cabinet.houseRules = normalizeCabinetPolicy(input.houseRules)
    }

    const savedCabinet = await cabinetRepository.save(cabinet)

    if (input.photos !== undefined) {
        await deleteUploadedCabinetImages(
            getRemovedUploadedCabinetImages(previousPhotos, input.photos)
        )
    }

    const imageManifests = await ensureCabinetImageManifests(savedCabinet.photos)

    return toOwnerCabinet(savedCabinet, imageManifests)
}

export async function deleteOwnerCabinet(owner: UserEntity, cabinetId: string) {
    assertCabinetOwner(owner)

    const bookingRepository = AppDataSource.getRepository(BookingEntity)
    const cabinetRepository = AppDataSource.getRepository(CabinetEntity)

    const cabinet = await getOwnerCabinetEntityById(owner.id, cabinetId)

    const bookingsCount = await bookingRepository.count({
        where: {
            cabinetId: cabinet.id,
        },
    })

    if (bookingsCount > 0) {
        throw new AppError({
            statusCode: 409,
            code: ERROR_CODES.Conflict,
            message: 'Cabinet with bookings cannot be deleted.',
        })
    }

    const photosToDelete = cabinet.photos

    await cabinetRepository.remove(cabinet)
    await deleteUploadedCabinetImages(photosToDelete)

    return {
        success: true,
    } as const
}
