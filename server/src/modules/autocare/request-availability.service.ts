import { Between, In, type EntityManager } from 'typeorm'
import { AppDataSource } from '../../database/data-source.js'
import { isAutoCareCountryEnabled } from '../../config/enabled-market-countries.js'
import { AutomotiveProviderEntity, AutomotiveProviderStatus, AutomotiveMarketEntity, AutomotiveMarketCountryEntity, AutomotiveServiceLocationEntity, AutomotiveServiceOfferingEntity, ServiceRequestEntity, ServiceRequestStatus } from '../../entities/index.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import type { AutoCareAvailabilitySlotResponse } from './autocare.types.js'
import { getScheduleForDate, isValidTimeZone, localDateRangeToUtc, localDateTimeParts, zonedWallTimeToUtc } from './availability.js'
import { hasAvailableAppointmentCapacity } from './capacity-reservation.js'
import { hasAutoCareResourceAvailability } from './capacity-resource.service.js'
import { normalizeAutoCareAvailabilityDate, normalizeAutoCareAvailabilityUuid } from './availability-input-policy.js'
import { isAutoCareVisitTimeBookable } from './request-lifecycle-policy.js'
import { conflict, notFound } from './request-errors.js'

function formatClock(totalMinutes: number) {
    return `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`
}

export async function assertAutoCareSlotCapacity(
    manager: EntityManager,
    input: {
        locationId: string
        providerId: string
        preferredAt: Date
        durationMinutes: number
        excludeRequestId?: string
        requireAvailableCapacity?: boolean
        scheduleMessage: string
        capacityMessage: string
    },
) {
    const location = await manager.getRepository(AutomotiveServiceLocationEntity).findOne({
        where: { id: input.locationId, providerId: input.providerId },
        lock: { mode: 'pessimistic_write' },
    })
    if (!location) conflict('The service location for this request is no longer available.')

    const timezone = isValidTimeZone(location.timezone) ? location.timezone : 'UTC'
    const localVisit = localDateTimeParts(input.preferredAt, timezone)
    const schedule = getScheduleForDate(localVisit.date, location.hours, location.weeklySchedule)
    const dayRange = localDateRangeToUtc(localVisit.date, timezone)
    const visitEndMinutes = localVisit.minutes + input.durationMinutes
    const scheduleOpenMinutes = Number(schedule.open.slice(0, 2)) * 60 + Number(schedule.open.slice(3))
    const scheduleCloseMinutes = Number(schedule.close.slice(0, 2)) * 60 + Number(schedule.close.slice(3))
    if (location.blackoutDates.includes(localVisit.date) || schedule.closed || !dayRange || localVisit.minutes < scheduleOpenMinutes || visitEndMinutes > scheduleCloseMinutes) {
        conflict(input.scheduleMessage)
    }

    const reservations = await manager.getRepository(ServiceRequestEntity).find({
        where: {
            providerId: input.providerId,
            locationId: input.locationId,
            preferredAt: Between(dayRange.start, dayRange.end),
            status: ServiceRequestStatus.Accepted,
        },
    })
    const occupied = reservations.filter((reservation) => reservation.id !== input.excludeRequestId && reservation.preferredAt)
    const offeringIds = occupied.flatMap((reservation) => reservation.offeringId ? [reservation.offeringId] : [])
    const offerings = offeringIds.length > 0
        ? await manager.getRepository(AutomotiveServiceOfferingEntity).findBy({ id: In(offeringIds) })
        : []
    const durationByOfferingId = new Map(offerings.map((offering) => [offering.id, offering.durationMinutes]))
    const activeReservations = occupied.flatMap((reservation) => {
        if (!reservation.preferredAt) return []
        const local = localDateTimeParts(reservation.preferredAt, timezone)
        if (local.date !== localVisit.date) return []
        return [{
            startsAtMinutes: local.minutes,
            durationMinutes: durationByOfferingId.get(reservation.offeringId ?? '')
                ?? (typeof reservation.offeringSnapshot?.durationMinutes === 'number' ? reservation.offeringSnapshot.durationMinutes : 60),
        }]
    })
    if (input.requireAvailableCapacity !== false && !hasAvailableAppointmentCapacity({
        capacity: location.appointmentCapacity,
        candidate: { startsAtMinutes: localVisit.minutes, durationMinutes: input.durationMinutes },
        reservations: activeReservations,
    })) {
        throw new AppError({ statusCode: 409, code: ERROR_CODES.SlotUnavailable, message: input.capacityMessage })
    }
    return { ...location, timezone }
}

export function getRequestDurationMinutes(request: ServiceRequestEntity) {
    return typeof request.offeringSnapshot?.durationMinutes === 'number'
        ? request.offeringSnapshot.durationMinutes
        : 60
}

export async function assertAutoCareRescheduleSlot(
    manager: EntityManager,
    request: ServiceRequestEntity,
    proposedAt: Date,
    requireAvailableCapacity: boolean,
) {
    const offeringRepository = manager.getRepository(AutomotiveServiceOfferingEntity)
    const offering = request.offeringId
        ? await offeringRepository.findOneBy({ id: request.offeringId, locationId: request.locationId, active: true })
        : null
    const durationMinutes = offering?.durationMinutes
        ?? (typeof request.offeringSnapshot?.durationMinutes === 'number' ? request.offeringSnapshot.durationMinutes : 60)
    await assertAutoCareSlotCapacity(manager, {
        locationId: request.locationId,
        providerId: request.providerId,
        preferredAt: proposedAt,
        durationMinutes,
        excludeRequestId: request.id,
        requireAvailableCapacity,
        scheduleMessage: 'The proposed visit time is outside the service schedule.',
        capacityMessage: 'The proposed visit time is no longer available.',
    })
}

export async function getAutoCareAvailability(providerId: string, locationId: string, offeringId: string, date: string) {
    const normalizedProviderId = normalizeAutoCareAvailabilityUuid(providerId)
    const normalizedLocationId = normalizeAutoCareAvailabilityUuid(locationId)
    const normalizedOfferingId = normalizeAutoCareAvailabilityUuid(offeringId)
    const normalizedDate = normalizeAutoCareAvailabilityDate(date)
    if (!normalizedProviderId || !normalizedLocationId || !normalizedOfferingId || !normalizedDate) throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Availability query is invalid.' })
    const provider = await AppDataSource.getRepository(AutomotiveProviderEntity).findOneBy({ id: normalizedProviderId, status: AutomotiveProviderStatus.Active })
    const location = await AppDataSource.getRepository(AutomotiveServiceLocationEntity).findOneBy({ id: normalizedLocationId, providerId: normalizedProviderId })
    if (!provider || !location) notFound('Automotive availability references missing service data.')
    const market = await AppDataSource.getRepository(AutomotiveMarketEntity).findOneBy({ id: location.marketId, launchReady: true })
    if (!market || !isAutoCareCountryEnabled(market.countryCode)) notFound('Automotive availability references missing service data.')
    const country = await AppDataSource.getRepository(AutomotiveMarketCountryEntity).findOneBy({ id: market.countryId, active: true })
    if (!country) notFound('Automotive availability references missing service data.')
    const offering = await AppDataSource.getRepository(AutomotiveServiceOfferingEntity).findOneBy({ id: normalizedOfferingId, locationId: normalizedLocationId, active: true })
    if (!offering) notFound('Automotive availability references missing service data.')

    const timezone = isValidTimeZone(location.timezone) ? location.timezone : 'UTC'
    const range = localDateRangeToUtc(normalizedDate, timezone)
    const schedule = getScheduleForDate(normalizedDate, location.hours, location.weeklySchedule)
    if (!range) notFound('Availability date is invalid.')
    if (location.blackoutDates.includes(normalizedDate) || schedule.closed) return { date: normalizedDate, timezone, durationMinutes: offering.durationMinutes, slots: [] }
    const openMinutes = Number(schedule.open.slice(0, 2)) * 60 + Number(schedule.open.slice(3))
    const closeMinutes = Number(schedule.close.slice(0, 2)) * 60 + Number(schedule.close.slice(3))
    const dayStart = range.start
    const dayEnd = range.end
    const requests = await AppDataSource.getRepository(ServiceRequestEntity).find({
        where: {
            providerId: normalizedProviderId,
            locationId: normalizedLocationId,
            preferredAt: Between(dayStart, dayEnd),
            status: ServiceRequestStatus.Accepted,
        },
    })
    const requestOfferings = await Promise.all(requests.map((request) => request.offeringId
        ? AppDataSource.getRepository(AutomotiveServiceOfferingEntity).findOneBy({ id: request.offeringId })
        : null))
    const slots: AutoCareAvailabilitySlotResponse[] = []
    for (let start = openMinutes; start + offering.durationMinutes <= closeMinutes; start += 30) {
        const end = start + offering.durationMinutes
        const occupied = requests.filter((request, index) => {
            const preferred = request.preferredAt
            if (!preferred) return false
            const local = localDateTimeParts(preferred, timezone)
            if (local.date !== normalizedDate) return false
            const requestStart = local.minutes
            const requestDuration = requestOfferings[index]?.durationMinutes ?? 60
            return start < requestStart + requestDuration && end > requestStart
        }).length
        if (occupied < Math.max(1, location.appointmentCapacity)) {
            const startsAt = zonedWallTimeToUtc(normalizedDate, `${formatClock(start)}`, timezone)
            if (!startsAt || !isAutoCareVisitTimeBookable(startsAt)) continue
            const resourcesAvailable = await hasAutoCareResourceAvailability(AppDataSource.manager, {
                requestId: undefined,
                providerId: normalizedProviderId,
                locationId: normalizedLocationId,
                startsAt,
                durationMinutes: offering.durationMinutes,
                requiredResourceTypes: offering.requiredResourceTypes,
                requiredResourceIds: offering.requiredResourceIds,
            })
            if (resourcesAvailable) slots.push({ startTime: formatClock(start), endTime: formatClock(end), startsAt: startsAt.toISOString() })
        }
    }
    return { date: normalizedDate, timezone, durationMinutes: offering.durationMinutes, slots }
}
