import type { QueryRunner, Logger as TypeOrmLogger } from 'typeorm'

import { logError, logInfo, logWarn } from '../shared/observability/logger.js'
import { metrics } from '../shared/observability/metrics.js'

const MAX_QUERY_LENGTH = 1_000

function sanitizeQuery(query: string) {
    return query
        .replace(/'(?:''|[^'])*'/g, "'?'")
        .replace(/\b\d+(?:\.\d+)?\b/g, '?')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, MAX_QUERY_LENGTH)
}

export class DatabaseLogger implements TypeOrmLogger {
    logQuery(_query: string, _parameters?: unknown[], _queryRunner?: QueryRunner) {}

    logQueryError(
        error: string | Error,
        query: string,
        _parameters?: unknown[],
        _queryRunner?: QueryRunner,
    ) {
        metrics.increment('database_query_errors_total')
        logError('Database query failed', error, {
            query: sanitizeQuery(query),
        })
    }

    logQuerySlow(
        time: number,
        query: string,
        _parameters?: unknown[],
        _queryRunner?: QueryRunner,
    ) {
        metrics.increment('database_slow_queries_total')
        metrics.observe('database_query_duration_ms', time)
        logWarn('Slow database query', {
            durationMs: time,
            query: sanitizeQuery(query),
        })
    }

    logSchemaBuild(message: string, _queryRunner?: QueryRunner) {
        logInfo('Database schema build', { message })
    }

    logMigration(message: string, _queryRunner?: QueryRunner) {
        logInfo('Database migration', { message })
    }

    log(level: 'log' | 'info' | 'warn', message: unknown, _queryRunner?: QueryRunner) {
        const metadata = { message: String(message) }

        if (level === 'warn') {
            logWarn('Database event', metadata)
            return
        }

        logInfo('Database event', metadata)
    }
}
