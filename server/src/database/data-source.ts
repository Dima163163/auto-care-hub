import 'reflect-metadata'
import { DataSource } from 'typeorm'

import { env } from '../config/env.js'
import { entities } from '../entities/index.js'
import { DatabaseLogger } from './database-logger.js'

export function getMigrationPaths(nodeEnv: 'development' | 'test' | 'production') {
    return [
        nodeEnv === 'development'
            ? 'src/database/migrations/!(*.test).ts'
            : 'dist/database/migrations/*.js',
    ]
}

export const AppDataSource = new DataSource({
    type: 'postgres',
    url: env.database.url ?? undefined,
    host: env.database.host,
    port: env.database.port,
    username: env.database.username,
    password: env.database.password,
    database: env.database.name,
    entities,
    migrations: getMigrationPaths(env.nodeEnv),
    migrationsTableName: 'migrations',
    migrationsTransactionMode: 'each',
    synchronize: false,
    logger: new DatabaseLogger(),
    poolSize: env.database.poolSize,
    maxQueryExecutionTime: env.database.slowQueryThresholdMs,
    connectTimeoutMS: env.database.connectionTimeoutMs,
    extra: {
        min: env.database.poolMin,
        idleTimeoutMillis: env.database.idleTimeoutMs,
        connectionTimeoutMillis: env.database.connectionTimeoutMs,
        query_timeout: env.database.queryTimeoutMs,
        statement_timeout: env.database.statementTimeoutMs,
    },
    ssl:
        env.nodeEnv === 'production'
            ? { rejectUnauthorized: false } // Required for many cloud providers like Render/DigitalOcean
            : false,
    })
