export function createShutdownOnceHandler(
    handler: (signal: NodeJS.Signals) => Promise<void>,
) {
    let shutdownPromise: Promise<void> | null = null

    return (signal: NodeJS.Signals) => {
        if (!shutdownPromise) {
            shutdownPromise = handler(signal)
        }

        return shutdownPromise
    }
}
