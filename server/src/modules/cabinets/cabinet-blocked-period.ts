type BlockedPeriodTimeRange = {
    startTime: string | null
    endTime: string | null
}

export function isTimeRangeBlocked(
    startTime: string,
    endTime: string,
    periods: BlockedPeriodTimeRange[],
) {
    return periods.some((period) =>
        !period.startTime ||
        !period.endTime ||
        (startTime < period.endTime.slice(0, 5) && endTime > period.startTime.slice(0, 5))
    )
}
