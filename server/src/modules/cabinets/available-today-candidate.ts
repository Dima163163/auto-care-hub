export function getAvailableTodayCandidateSql() {
    return `
        EXISTS (
            SELECT 1
            FROM services active_service
            WHERE active_service."cabinetId" = cabinet.id
              AND active_service."isActive" = true
        )
        AND NOT EXISTS (
            SELECT 1
            FROM cabinet_blocked_periods closed_period
            WHERE closed_period."cabinetId" = cabinet.id
              AND closed_period.date = ((CURRENT_TIMESTAMP AT TIME ZONE cabinet.timezone)::date)
              AND closed_period."startTime" IS NULL
              AND closed_period."endTime" IS NULL
        )
        AND (
            EXISTS (
                SELECT 1
                FROM cabinet_schedule_exceptions exception
                WHERE exception."cabinetId" = cabinet.id
                  AND exception.date = ((CURRENT_TIMESTAMP AT TIME ZONE cabinet.timezone)::date)
                  AND exception."isClosed" = false
                  AND (
                      (
                          exception."openTime" IS NOT NULL
                          AND exception."closeTime" IS NOT NULL
                          AND exception."openTime" < exception."closeTime"
                      )
                      OR (
                          exception."openTime" IS NULL
                          AND exception."closeTime" IS NULL
                          AND (
                              EXISTS (
                                  SELECT 1
                                  FROM cabinet_schedules exception_schedule
                                  WHERE exception_schedule."cabinetId" = cabinet.id
                                    AND exception_schedule.weekday = EXTRACT(DOW FROM ((CURRENT_TIMESTAMP AT TIME ZONE cabinet.timezone)::date))
                                    AND exception_schedule."isOpen" = true
                              )
                              OR NOT EXISTS (
                                  SELECT 1
                                  FROM cabinet_schedules exception_schedule
                                  WHERE exception_schedule."cabinetId" = cabinet.id
                                    AND exception_schedule.weekday = EXTRACT(DOW FROM ((CURRENT_TIMESTAMP AT TIME ZONE cabinet.timezone)::date))
                              )
                          )
                      )
                  )
            )
            OR (
                NOT EXISTS (
                    SELECT 1
                    FROM cabinet_schedule_exceptions exception
                    WHERE exception."cabinetId" = cabinet.id
                      AND exception.date = ((CURRENT_TIMESTAMP AT TIME ZONE cabinet.timezone)::date)
                )
                AND (
                    EXISTS (
                        SELECT 1
                        FROM cabinet_schedules schedule
                        WHERE schedule."cabinetId" = cabinet.id
                          AND schedule.weekday = EXTRACT(DOW FROM ((CURRENT_TIMESTAMP AT TIME ZONE cabinet.timezone)::date))
                          AND schedule."isOpen" = true
                    )
                    OR NOT EXISTS (
                        SELECT 1
                        FROM cabinet_schedules schedule
                        WHERE schedule."cabinetId" = cabinet.id
                          AND schedule.weekday = EXTRACT(DOW FROM ((CURRENT_TIMESTAMP AT TIME ZONE cabinet.timezone)::date))
                    )
                )
            )
        )
    `
}
