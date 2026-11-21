/**
 * The same slot query is used to filter the catalog and to build previews for
 * the returned cabinets. All values are bound by the caller.
 */
export function getCabinetSlotsSql(parameterStyle: 'named' | 'positional') {
    const [date, duration, now] = parameterStyle === 'named'
        ? [':availabilityDate', ':availabilityDuration', ':availabilityNow']
        : ['$2', '$3', '$4']

    return `
        SELECT calendar.target_date::text AS date,
               slot.start_minute,
               slot.start_minute + hours.duration_minutes AS end_minute
        FROM (
            SELECT wall_clock.local_now, COALESCE(CAST(${date} AS date), wall_clock.local_now::date) AS target_date
            FROM (SELECT timezone(cabinet.timezone, CAST(${now} AS timestamptz)) AS local_now) AS wall_clock
        ) AS calendar
        LEFT JOIN cabinet_schedules AS schedule
            ON schedule."cabinetId" = cabinet.id AND schedule.weekday = EXTRACT(DOW FROM calendar.target_date)
        LEFT JOIN cabinet_schedule_exceptions AS override
            ON override."cabinetId" = cabinet.id AND override.date = calendar.target_date
        CROSS JOIN LATERAL (
            SELECT COALESCE(CAST(${duration} AS integer), (
                       SELECT MIN(service."durationMinutes")
                       FROM services AS service
                       WHERE service."cabinetId" = cabinet.id AND service."isActive" = true
                   )) AS duration_minutes,
                   CASE WHEN override."isClosed" THEN NULL
                        WHEN override."openTime" IS NOT NULL THEN override."openTime"
                        WHEN schedule."isOpen" = false THEN NULL
                        ELSE COALESCE(schedule."openTime", TIME '08:00') END AS opens_at,
                   CASE WHEN override."isClosed" THEN NULL
                        WHEN override."closeTime" IS NOT NULL THEN override."closeTime"
                        WHEN schedule."isOpen" = false THEN NULL
                        ELSE COALESCE(schedule."closeTime", TIME '22:00') END AS closes_at
        ) AS hours
        CROSS JOIN LATERAL generate_series(
            FLOOR(EXTRACT(EPOCH FROM hours.opens_at) / 60)::integer,
            FLOOR(EXTRACT(EPOCH FROM hours.closes_at) / 60)::integer - hours.duration_minutes, 30
        ) AS slot(start_minute)
        WHERE hours.duration_minutes > 0
          AND (calendar.target_date > calendar.local_now::date OR (
              calendar.target_date = calendar.local_now::date
              AND slot.start_minute > FLOOR(EXTRACT(EPOCH FROM calendar.local_now::time) / 60)
          ))
          AND NOT EXISTS (
              SELECT 1 FROM bookings AS booking
              WHERE booking."cabinetId" = cabinet.id AND booking.date = calendar.target_date
                AND booking.status IN ('pending', 'confirmed')
                AND slot.start_minute < FLOOR(EXTRACT(EPOCH FROM booking."endTime") / 60)
                AND slot.start_minute + hours.duration_minutes > FLOOR(EXTRACT(EPOCH FROM booking."startTime") / 60)
          )
          AND NOT EXISTS (
              SELECT 1 FROM cabinet_blocked_periods AS blocked
              WHERE blocked."cabinetId" = cabinet.id AND blocked.date = calendar.target_date
                AND (blocked."startTime" IS NULL OR blocked."endTime" IS NULL OR (
                    slot.start_minute < FLOOR(EXTRACT(EPOCH FROM blocked."endTime") / 60)
                    AND slot.start_minute + hours.duration_minutes > FLOOR(EXTRACT(EPOCH FROM blocked."startTime") / 60)
                ))
          )
    `
}
