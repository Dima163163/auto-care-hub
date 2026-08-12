import { useCallback, useEffect, useMemo, useState } from 'react'

import {
    clearFormDraft,
    readFormDraft,
    writeFormDraft,
    type FormDraftParser,
} from './form-draft'

type UseFormDraftOptions<T> = {
    storageKey: string | null
    values: T
    enabled: boolean
    debounceMs?: number
    parse?: FormDraftParser<T>
}

type UseFormDraftResult<T> = {
    draft: T | null
    clearDraft: () => void
}

export function useFormDraft<T>({
    storageKey,
    values,
    enabled,
    debounceMs = 400,
    parse,
}: UseFormDraftOptions<T>): UseFormDraftResult<T> {
    const [draft] = useState<T | null>(() =>
        storageKey && parse ? readFormDraft(storageKey, parse) : null,
    )
    const serializedValues = useMemo(() => {
        try {
            const serializedValue = JSON.stringify(values)

            return typeof serializedValue === 'string' ? serializedValue : null
        } catch {
            return null
        }
    }, [values])

    useEffect(() => {
        if (!storageKey || !enabled || serializedValues === null) {
            return
        }

        const timeoutId = window.setTimeout(() => {
            try {
                const draftValue: unknown = JSON.parse(serializedValues)
                writeFormDraft(storageKey, draftValue)
            } catch {
                // A non-serializable form value is ignored by the draft layer.
            }
        }, debounceMs)

        return () => window.clearTimeout(timeoutId)
    }, [debounceMs, enabled, serializedValues, storageKey])

    const clearDraft = useCallback(() => {
        if (!storageKey) {
            return
        }

        clearFormDraft(storageKey)
    }, [storageKey])

    return { draft, clearDraft }
}
