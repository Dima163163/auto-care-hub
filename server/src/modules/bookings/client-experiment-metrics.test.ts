import { describe, expect, it } from 'vitest'

import { UserRole, UserStatus, type UserEntity } from '../../entities/user/user.entity.js'
import { MetricsRegistry } from '../../shared/observability/metrics.js'
import { AppError } from '../../shared/errors/app-error.js'
import {
    recordClientExperimentCompletion,
    recordClientExperimentEvent,
    assertClientExperimentActor,
    normalizeClientExperimentEvent,
} from './client-experiment-metrics.js'

function createUser(role: UserRole): UserEntity {
    return {
        id: 'client-id',
        name: 'Client',
        email: 'client@example.com',
        role,
        status: UserStatus.Active,
    } as UserEntity
}

describe('client experiment metrics', () => {
    it('keeps the client role guard reusable before event normalization', () => {
        expect(() => assertClientExperimentActor(createUser(UserRole.Owner))).toThrowError(AppError)
        expect(() => assertClientExperimentActor(createUser(UserRole.Client))).not.toThrow()
    })

    it('normalizes only known experiment events', () => {
        expect(normalizeClientExperimentEvent(' catalog_filter_used ')).toBe('catalog_filter_used')
        expect(normalizeClientExperimentEvent('unknown')).toBeNull()
        expect(normalizeClientExperimentEvent(null)).toBeNull()
    })

    it('accepts only bounded client events and records no identity labels', () => {
        const registry = new MetricsRegistry()

        expect(recordClientExperimentEvent(createUser(UserRole.Client), 'book_again_clicked', registry))
            .toEqual({ accepted: true })
        expect(registry.snapshot().counters).toEqual([
            {
                name: 'client_experiment_events_total',
                labels: { event: 'book_again_clicked' },
                value: 1,
            },
        ])
    })

    it('accepts bounded catalog funnel and frustration signals without free-form labels', () => {
        const registry = new MetricsRegistry()

        for (const event of [
            'catalog_filter_used',
            'catalog_filter_reset',
            'catalog_search_to_detail',
            'catalog_search_to_book',
            'catalog_no_results',
        ] as const) {
            expect(recordClientExperimentEvent(createUser(UserRole.Client), event, registry))
                .toEqual({ accepted: true })
        }

        expect(registry.snapshot().counters).toHaveLength(5)
        expect(registry.snapshot().counters.every(({ labels }) => Object.keys(labels).length === 1)).toBe(true)
    })

    it('rejects non-client actors', () => {
        expect(() => recordClientExperimentEvent(createUser(UserRole.Owner), 'preference_shortcut_used'))
            .toThrowError(AppError)
    })

    it('records a successful Book again completion only when the server marks the source', () => {
        const registry = new MetricsRegistry()

        recordClientExperimentCompletion(undefined, registry)
        recordClientExperimentCompletion('book_again', registry)

        expect(registry.snapshot().counters).toEqual([
            {
                name: 'client_experiment_events_total',
                labels: { event: 'book_again_completed' },
                value: 1,
            },
        ])
    })
})
