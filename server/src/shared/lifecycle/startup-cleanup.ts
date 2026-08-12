import type { FastifyInstance } from 'fastify'

export type StartupResources = {
    app: FastifyInstance | null
    stopBackgroundJobs: (() => Promise<void>) | null
    disconnectDatabase: () => Promise<void>
}

export async function cleanupStartupResources(resources: StartupResources) {
    const errors: unknown[] = []

    try {
        await resources.stopBackgroundJobs?.()
    } catch (error) {
        errors.push(error)
    }

    try {
        await resources.app?.close()
    } catch (error) {
        errors.push(error)
    }

    try {
        await resources.disconnectDatabase()
    } catch (error) {
        errors.push(error)
    }

    return errors
}
