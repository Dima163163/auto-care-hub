export type OnboardingRole = 'client' | 'owner'

const STORAGE_PREFIX = 'autocare-hub:onboarding-progress:'

export function getOnboardingProgressStorageKey(userId: string, role: OnboardingRole) {
    return `${STORAGE_PREFIX}${role}:${userId}`
}

export function readOnboardingProgress(storageKey: string): string[] {
    try {
        const value = window.localStorage.getItem(storageKey)
        if (!value) return []

        const parsed = JSON.parse(value)
        return Array.isArray(parsed)
            ? parsed.filter((stepId): stepId is string => typeof stepId === 'string')
            : []
    } catch {
        return []
    }
}

export function writeOnboardingProgress(storageKey: string, completedSteps: string[]) {
    try {
        window.localStorage.setItem(storageKey, JSON.stringify(completedSteps))
    } catch {
        // Storage can be unavailable in private or restricted browser contexts.
    }
}

export function addCompletedOnboardingStep(completedSteps: string[], stepId: string) {
    return completedSteps.includes(stepId)
        ? completedSteps
        : [...completedSteps, stepId]
}
