type StepUpCodeRequester = (previousCodeRejected: boolean) => Promise<string | null>

let requester: StepUpCodeRequester | null = null

export function registerPrivilegedStepUpRequester(next: StepUpCodeRequester) {
    requester = next
    return () => {
        if (requester === next) requester = null
    }
}

export function requestPrivilegedStepUpCode(previousCodeRejected: boolean) {
    return requester?.(previousCodeRejected) ?? Promise.resolve(null)
}
