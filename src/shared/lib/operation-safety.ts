import { useEffect, useSyncExternalStore } from 'react'

type OperationKind = 'dirtyForms' | 'pendingMutations'

type OperationSafetySnapshot = {
    dirtyForms: number
    pendingMutations: number
}

const listeners = new Set<() => void>()
let snapshot: OperationSafetySnapshot = {
    dirtyForms: 0,
    pendingMutations: 0,
}

function subscribe(listener: () => void) {
    listeners.add(listener)

    return () => listeners.delete(listener)
}

function getSnapshot() {
    return snapshot
}

function notify() {
    listeners.forEach((listener) => listener())
}

export function registerProtectedOperation(kind: OperationKind) {
    snapshot = {
        ...snapshot,
        [kind]: snapshot[kind] + 1,
    }
    notify()

    return () => {
        snapshot = {
            ...snapshot,
            [kind]: Math.max(0, snapshot[kind] - 1),
        }
        notify()
    }
}

export function useOperationSafety() {
    return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function useProtectedOperation(kind: OperationKind, enabled: boolean) {
    useEffect(() => {
        if (!enabled) {
            return
        }

        return registerProtectedOperation(kind)
    }, [enabled, kind])
}
