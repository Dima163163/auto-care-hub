import { useEffect, useState } from 'react'

export function getInitialOnlineStatus() {
    return typeof navigator === 'undefined' || navigator.onLine
}

export function useOnlineStatus() {
    const [isOnline, setIsOnline] = useState(getInitialOnlineStatus)

    useEffect(() => {
        const handleOnline = () => setIsOnline(true)
        const handleOffline = () => setIsOnline(false)

        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)

        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [])

    return isOnline
}
