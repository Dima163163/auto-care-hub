import { useEffect, useRef, useState } from 'react'

type CounterProps = {
    value: number
    duration?: number
    formatter?: (value: number) => string
    className?: string
}

export function Counter({
    value,
    duration = 2,
    formatter = (v) => Math.round(v).toString(),
    className
}: CounterProps) {
    const [displayValue, setDisplayValue] = useState(0)
    const [isVisible, setIsVisible] = useState(false)
    const ref = useRef<HTMLSpanElement>(null)

    useEffect(() => {
        const element = ref.current
        if (!element || typeof IntersectionObserver === 'undefined') {
            setIsVisible(true)
            return
        }

        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setIsVisible(true)
                observer.disconnect()
            }
        }, { threshold: 0.1 })

        observer.observe(element)
        return () => observer.disconnect()
    }, [])

    useEffect(() => {
        if (!isVisible) return

        const startedAt = performance.now()
        let frame = 0
        const tick = (now: number) => {
            const progress = Math.min((now - startedAt) / (duration * 1000), 1)
            const easedProgress = 1 - ((1 - progress) ** 3)
            setDisplayValue(value * easedProgress)
            if (progress < 1) frame = requestAnimationFrame(tick)
        }

        frame = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(frame)
    }, [duration, isVisible, value])

    return <span ref={ref} className={className}>{formatter(displayValue)}</span>
}
