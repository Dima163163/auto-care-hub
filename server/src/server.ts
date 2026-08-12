import type { FastifyInstance } from 'fastify'

import { logError } from './shared/observability/logger.js'
import { createShutdownOnceHandler } from './shared/lifecycle/shutdown-once.js'
import { cleanupStartupResources } from './shared/lifecycle/startup-cleanup.js'
import { shouldStartApi, shouldStartWorker } from './config/runtime-mode-policy.js'
import { getStartupFailureGuidance } from './shared/lifecycle/startup-failure-policy.js'

type StartupStage = 'build_app' | 'listen' | 'background_jobs'

async function startServer() {
    let app: FastifyInstance | null = null
    let stopBackgroundJobs: (() => Promise<void>) | null = null
    let disconnectDatabase: (() => Promise<void>) | null = null
    let startupStage: StartupStage = 'build_app'

    try {
        const [{ buildApp }, { env }, database] = await Promise.all([
            import('./app.js'),
            import('./config/env.js'),
            import('./database/database.js'),
        ])
        disconnectDatabase = database.disconnectDatabaseGracefully
        app = await buildApp()

        if (shouldStartApi(env.runtimeMode)) {
            startupStage = 'listen'
            app.log.info({ port: env.port, host: env.host, runtimeMode: env.runtimeMode }, 'Attempting to start server...')

            const address = await app.listen({
                port: env.port,
                host: env.host,
            })

            app.log.info({ address }, 'Server is now listening')
        }

        if (shouldStartWorker(env.runtimeMode)) {
            const { startBackgroundJobs } = await import('./modules/jobs/background-jobs.js')
            startupStage = 'background_jobs'
            stopBackgroundJobs = startBackgroundJobs(app.log, app.mailer)
        }
    } catch (error) {
        logError('Server startup failed', error, { stage: startupStage })
        const guidance = getStartupFailureGuidance(error)
        if (guidance) {
            logError('Server startup guidance', undefined, {
                stage: startupStage,
                guidance,
            })
        }

        const cleanupErrors = await cleanupStartupResources({
            app,
            stopBackgroundJobs,
            disconnectDatabase: disconnectDatabase ?? (async () => undefined),
        })
        for (const cleanupError of cleanupErrors) {
            logError('Server startup cleanup failed', cleanupError)
        }

        process.exit(1)
    }

    const shutdown = createShutdownOnceHandler(async (signal) => {
        app?.log.info({ signal }, 'Shutting down server')

        try {
            await stopBackgroundJobs?.()
            await app?.close()
            await disconnectDatabase?.()
            process.exit(0)
        } catch (error) {
            app?.log.error(error)
            process.exit(1)
        }
    })

    process.on('SIGINT', () => {
        void shutdown('SIGINT')
    })

    process.on('SIGTERM', () => {
        void shutdown('SIGTERM')
    })
}

void startServer()
