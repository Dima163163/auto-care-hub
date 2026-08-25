export type RolloutRule = {
    enabled: boolean
    marketIds?: readonly string[]
    percentage?: number
}

export type RolloutContext = {
    marketId: string | null
    subjectKey: string
}

/** Deterministic rollout gate: market allow-list is evaluated before percentage. */
export function isRolloutEnabled(rule: RolloutRule | undefined, context: RolloutContext) {
    if (!rule?.enabled) return false
    if (rule.marketIds && (!context.marketId || !rule.marketIds.includes(context.marketId))) return false
    const percentage = Math.min(100, Math.max(0, rule.percentage ?? 100))
    if (percentage >= 100) return true
    if (percentage <= 0) return false
    let hash = 0
    for (const character of context.subjectKey) hash = (hash * 31 + character.charCodeAt(0)) >>> 0
    return hash % 100 < percentage
}
