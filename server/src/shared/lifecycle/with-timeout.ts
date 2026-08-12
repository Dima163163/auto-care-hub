export class OperationTimeoutError extends Error {
    constructor(operation: string, timeoutMs: number) {
        super(`${operation} timed out after ${timeoutMs}ms.`)
        this.name = 'OperationTimeoutError'
    }
}

export async function withTimeout<T>(
    operation: string,
    task: () => Promise<T>,
    timeoutMs: number,
) {
    let timeoutHandle: NodeJS.Timeout | undefined

    try {
        return await Promise.race([
            task(),
            new Promise<T>((_, reject) => {
                timeoutHandle = setTimeout(() => {
                    reject(new OperationTimeoutError(operation, timeoutMs))
                }, timeoutMs)
            }),
        ])
    } finally {
        if (timeoutHandle) clearTimeout(timeoutHandle)
    }
}
