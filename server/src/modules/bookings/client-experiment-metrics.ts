import { UserRole, type UserEntity } from '../../entities/user/user.entity.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { metrics, type MetricsRegistry } from '../../shared/observability/metrics.js'

export const clientExperimentEventNames = [
    'book_again_clicked',
    'preference_shortcut_used',
    'preference_shortcut_reset',
    'catalog_filter_used',
    'catalog_filter_reset',
    'catalog_search_to_detail',
    'catalog_search_to_book',
    'catalog_no_results',
] as const

export type ClientExperimentEventName = typeof clientExperimentEventNames[number]
export type ClientExperimentName = 'book_again'

export function normalizeClientExperimentEvent(value: unknown): ClientExperimentEventName | null {
    if (typeof value !== 'string') return null
    const normalized = value.normalize('NFKC').trim()
    return clientExperimentEventNames.includes(normalized as ClientExperimentEventName)
        ? normalized as ClientExperimentEventName
        : null
}

export function assertClientExperimentActor(user: UserEntity) {
    if (user.role !== UserRole.Client) {
        throw new AppError({
            statusCode: 403,
            code: ERROR_CODES.Forbidden,
            message: 'Only clients can record client experiment events.',
        })
    }
}

export function recordClientExperimentEvent(
    client: UserEntity,
    event: ClientExperimentEventName,
    registry: Pick<MetricsRegistry, 'increment'> = metrics,
) {
    assertClientExperimentActor(client)
    registry.increment('client_experiment_events_total', 1, { event })

    return { accepted: true as const }
}

export function recordClientExperimentCompletion(
    experiment: ClientExperimentName | undefined,
    registry: Pick<MetricsRegistry, 'increment'> = metrics,
) {
    if (!experiment) return

    registry.increment('client_experiment_events_total', 1, {
        event: `${experiment}_completed`,
    })
}
