import { In } from 'typeorm'
import { AppDataSource } from '../../database/data-source.js'
import { BookingEntity, BookingStatus } from '../../entities/booking/booking.entity.js'
import {
    CabinetEntity,
    CabinetStatus,
} from '../../entities/cabinet/cabinet.entity.js'
import { UserEntity } from '../../entities/user/user.entity.js'
import { ServiceEntity } from '../../entities/service/service.entity.js'
import { CabinetScheduleEntity } from '../../entities/cabinet/cabinet-schedule.entity.js'
import { CabinetScheduleExceptionEntity } from '../../entities/cabinet/cabinet-schedule-exception.entity.js'
import { CabinetBlockedPeriodEntity } from '../../entities/cabinet/cabinet-blocked-period.entity.js'
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
import { getWeekday, getZonedDateTime } from '../../shared/date-time/cabinet-timezone.js'
import { isTimeRangeBlocked } from './cabinet-blocked-period.js'
import { getAvailableTodayCandidateSql } from './available-today-candidate.js'
import { normalizeCabinetTitle } from './cabinet-input-policy.js'
import { getCabinetPagination } from './cabinet-pagination-policy.js'
import { normalizeCabinetSearchTerm } from './cabinet-search-policy.js'
import { assertCabinetNumericFilters } from './cabinet-filter-policy.js'
import { assertCabinetPhotoList } from './cabinet-photo-policy.js'
import { assertCabinetSort } from './cabinet-sort-policy.js'
import { getAvailabilityQueryLimits } from './availability-query-policy.js'
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

function timeToMinutes(value: string) {
    const [hours = '0', minutes = '0'] = value.slice(0, 5).split(':')
    return Number(hours) * 60 + Number(minutes)
}

async function getAvailabilityPreview(
    cabinets: CabinetEntity[],
    services: ServiceEntity[],
    bookings: BookingEntity[],
    options?: {
        date?: string
        durationMinutes?: number
    },
) {
    const limits = getAvailabilityQueryLimits()
    const cabinetIds = cabinets.map((cabinet) => cabinet.id)
    const activeBookings = bookings.filter((booking) =>
        [BookingStatus.Pending, BookingStatus.Confirmed].includes(booking.status)
    )
    const schedules = await AppDataSource.getRepository(CabinetScheduleEntity).find({
        where: { cabinetId: In(cabinetIds) },
        take: limits.schedules,
    })
    const exceptions = await AppDataSource.getRepository(CabinetScheduleExceptionEntity).find({
        where: { cabinetId: In(cabinetIds) },
        take: limits.schedules,
    })
    const blockedPeriods = await AppDataSource.getRepository(CabinetBlockedPeriodEntity).find({
        where: { cabinetId: In(cabinetIds) },
        take: limits.schedules,
    })
    const previews = new Map<string, PublicCabinet['availabilityPreview']>()

    for (const cabinetId of cabinetIds) {
        const cabinet = cabinets.find((item) => item.id === cabinetId)
        if (!cabinet) continue
        const zonedNow = getZonedDateTime(cabinet.timezone)
        const durations = services
            .filter((service) => service.cabinetId === cabinetId && service.isActive)
            .map((service) => service.durationMinutes)
        const durationMinutes = options?.durationMinutes ?? Math.min(...durations)

        if (!Number.isFinite(durationMinutes)) {
            previews.set(cabinetId, null)
            continue
        }

        let freeSlots = 0
        let firstSlot: { date: string; startTime: string; endTime: string } | null = null
        const slots: Array<{ startTime: string; endTime: string }> = []

        const dateString = options?.date ?? zonedNow.date
        const isPastDate = dateString < zonedNow.date
        const occupied = activeBookings
            .filter((booking) => booking.cabinetId === cabinetId && booking.date === dateString)
            .map((booking) => ({
                start: booking.startTime.slice(0, 5),
                end: booking.endTime.slice(0, 5),
            }))

        const schedule = schedules.find((item) => item.cabinetId === cabinetId && item.weekday === getWeekday(dateString))
        const exception = exceptions.find((item) => item.cabinetId === cabinetId && item.date === dateString)
        const dateBlockedPeriods = blockedPeriods.filter((item) =>
            item.cabinetId === cabinetId && item.date === dateString
        )
        const startMinutes = exception?.isClosed ? 0 : exception?.openTime ? timeToMinutes(exception.openTime) : schedule?.isOpen === false ? 0 : schedule ? timeToMinutes(schedule.openTime) : 8 * 60
        const endMinutes = exception?.isClosed ? 0 : exception?.closeTime ? timeToMinutes(exception.closeTime) : schedule?.isOpen === false ? 0 : schedule ? timeToMinutes(schedule.closeTime) : 22 * 60

        for (let start = startMinutes; start + durationMinutes <= endMinutes; start += 30) {
            const slotStart = formatTime(start)
            const slotEnd = formatTime(start + durationMinutes)
            const isPast = isPastDate || (dateString === zonedNow.date && start <= zonedNow.minutes)
            const isOccupied = occupied.some((slot) => slotStart < slot.end && slotEnd > slot.start)
            const isBlocked = isTimeRangeBlocked(slotStart, slotEnd, dateBlockedPeriods)

            if (!isPast && !isOccupied && !isBlocked) {
                freeSlots += 1
                if (slots.length < 4) {
                    slots.push({ startTime: slotStart, endTime: slotEnd })
                }
                firstSlot ??= { date: dateString, startTime: slotStart, endTime: slotEnd }
            }
        }

        previews.set(cabinetId, firstSlot ? { ...firstSlot, freeSlots, slots } : null)
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

    if (input?.availableToday && !input.availabilityDate) {
        query.andWhere(getAvailableTodayCandidateSql())
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

    const { page, limit } = getCabinetPagination(input?.page, input?.limit)
    const skip = (page - 1) * limit
    const needsAvailability = Boolean(
        input?.availableToday || input?.availabilityDate || input?.durationMinutes,
    )
    const candidates = needsAvailability
        ? await query.take(getAvailabilityQueryLimits().candidates).getMany()
        : null
    const [cabinets, total] = candidates
        ? [candidates, candidates.length]
        : await query.skip(skip).take(limit).getManyAndCount()
    const cabinetIds = cabinets.map((cabinet) => cabinet.id)
    const serviceRepository = AppDataSource.getRepository(ServiceEntity)
    const bookingRepository = AppDataSource.getRepository(BookingEntity)
    const limits = getAvailabilityQueryLimits()
    const [services, bookings] = cabinetIds.length === 0
        ? [[], []]
        : await Promise.all([
            serviceRepository.find({
                where: { cabinetId: In(cabinetIds), isActive: true },
                take: limits.services,
            }),
            bookingRepository.find({
                where: { cabinetId: In(cabinetIds), status: In([BookingStatus.Pending, BookingStatus.Confirmed]) },
                select: ['cabinetId', 'date', 'startTime', 'endTime', 'status'],
                take: limits.bookings,
            }),
        ])
    const availabilityPreviews = await getAvailabilityPreview(cabinets, services, bookings, {
        date: input?.availabilityDate,
        durationMinutes: input?.durationMinutes,
    })
    const filteredCabinets = needsAvailability
        ? cabinets.filter((cabinet) => (availabilityPreviews.get(cabinet.id)?.freeSlots ?? 0) > 0)
        : cabinets
    const paginatedCabinets = needsAvailability
        ? filteredCabinets.slice(skip, skip + limit)
        : filteredCabinets
    const imageManifests = await ensureCabinetImageManifests(
        paginatedCabinets.flatMap((cabinet) => cabinet.photos),
    )

    return {
        items: paginatedCabinets.map((cabinet) => toPublicCabinet(
            cabinet,
            availabilityPreviews.get(cabinet.id),
            imageManifests,
        )),
        total: needsAvailability ? filteredCabinets.length : total,
        page,
        totalPages: Math.ceil((needsAvailability ? filteredCabinets.length : total) / limit),
    }
}

/**
 * Legacy flat catalog contract used by the browser mock and by older clients.
 * Keep it public, but never expose drafts or blocked cabinets: those records
 * are owner/admin workflow state and must not leak through a catalog endpoint.
 */
export async function getAllPublicCabinets() {
    const pageSize = 50
    const firstPage = await getPublicCabinets({ page: 1, limit: pageSize })
    const pages = [firstPage.items]

    for (let page = 2; page <= firstPage.totalPages; page += 1) {
        const nextPage = await getPublicCabinets({ page, limit: pageSize })
        pages.push(nextPage.items)
    }

    return pages.flat()
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

    const serviceRepository = AppDataSource.getRepository(ServiceEntity)
    const bookingRepository = AppDataSource.getRepository(BookingEntity)
    const limits = getAvailabilityQueryLimits()
    const [services, bookings] = await Promise.all([
        serviceRepository.find({ where: { cabinetId: cabinet.id, isActive: true }, take: limits.services }),
        bookingRepository.find({
            where: { cabinetId: cabinet.id, status: In([BookingStatus.Pending, BookingStatus.Confirmed]) },
            select: ['cabinetId', 'date', 'startTime', 'endTime', 'status'],
            take: limits.bookings,
        }),
    ])

    const imageManifests = await ensureCabinetImageManifests(cabinet.photos)

    return toPublicCabinet(
        cabinet,
        (await getAvailabilityPreview([cabinet], services, bookings)).get(cabinet.id),
        imageManifests,
    )
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
