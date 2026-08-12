import { useEffect } from 'react'
import { useProtectedOperation } from './operation-safety'

export function useBeforeUnload(enabled: boolean): void {
    useProtectedOperation('dirtyForms', enabled)

    useEffect(() => {
        if (!enabled) {
            return
        }

        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault()
            event.returnValue = ''
        }

        window.addEventListener('beforeunload', handleBeforeUnload)

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload)
        }
    }, [enabled])
}
