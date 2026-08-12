import { serializeError } from './logger.js'
import { sanitizeLogMetadata } from './sensitive-data.js'
import { metrics } from './metrics.js'
import { boundExternalErrorContext } from './error-report-policy.js'

export type ExternalErrorReport = {
    error: ReturnType<typeof serializeError>
    context: Record<string, unknown>
}

export interface ExternalErrorReporter {
    report(report: ExternalErrorReport): Promise<void>
}

let externalErrorReporter: ExternalErrorReporter | null = null

export function setExternalErrorReporter(reporter: ExternalErrorReporter | null) {
    externalErrorReporter = reporter
}

export function buildExternalErrorReport(
    error: unknown,
    context: Record<string, unknown> = {},
): ExternalErrorReport {
    return {
        error: serializeError(error),
        context: sanitizeLogMetadata(boundExternalErrorContext(context)),
    }
}

export async function reportExternalErrorSafely(
    error: unknown,
    context: Record<string, unknown> = {},
) {
    if (!externalErrorReporter) {
        metrics.increment('external_error_reports_total', 1, { outcome: 'disabled' })
        return
    }

    try {
        await externalErrorReporter.report(buildExternalErrorReport(error, context))
        metrics.increment('external_error_reports_total', 1, { outcome: 'sent' })
    } catch {
        // External monitoring must never break the application error path.
        metrics.increment('external_error_reports_total', 1, { outcome: 'failed' })
    }
}
