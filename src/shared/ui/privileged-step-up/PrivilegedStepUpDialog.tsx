import { useEffect, useRef, useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import { useTranslation } from '@/shared/lib/useTranslation'
import { registerPrivilegedStepUpRequester } from '@/shared/lib/privileged-step-up'
import { Dialog, DialogDescription, DialogFooter, DialogTitle } from '@/shared/ui/dialog'

export function PrivilegedStepUpDialog() {
    const { t } = useTranslation()
    const [open, setOpen] = useState(false)
    const [code, setCode] = useState('')
    const [rejected, setRejected] = useState(false)
    const resolver = useRef<((value: string | null) => void) | null>(null)

    useEffect(() => registerPrivilegedStepUpRequester((previousCodeRejected) => new Promise((resolve) => {
        resolver.current = resolve
        setCode('')
        setRejected(previousCodeRejected)
        setOpen(true)
    })), [])

    useEffect(() => () => {
        resolver.current?.(null)
        resolver.current = null
    }, [])

    const finish = (value: string | null) => {
        resolver.current?.(value)
        resolver.current = null
        setCode('')
        setOpen(false)
    }

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const normalized = code.trim()
        if (normalized.length >= 6 && normalized.length <= 64) finish(normalized)
    }

    return (
        <Dialog isOpen={open} onOpenChange={(next) => { if (!next) finish(null) }}>
            <DialogTitle>{t('auth.stepUpTitle')}</DialogTitle>
            <DialogDescription>{t('auth.stepUpDescription')}</DialogDescription>
            <form onSubmit={submit} className="mt-5 space-y-4">
                <div>
                    <label htmlFor="privileged-step-up-code" className="text-sm font-medium">{t('auth.mfaCodeLabel')}</label>
                    <input
                        id="privileged-step-up-code"
                        type="text"
                        autoComplete="one-time-code"
                        value={code}
                        onChange={(event) => setCode(event.target.value)}
                        aria-invalid={rejected}
                        aria-describedby={rejected ? 'privileged-step-up-error' : undefined}
                        className="mt-2 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
                    />
                    {rejected && <p id="privileged-step-up-error" role="alert" className="mt-2 text-sm text-destructive">{t('auth.stepUpInvalid')}</p>}
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => finish(null)}>{t('common.cancel')}</Button>
                    <Button type="submit" disabled={code.trim().length < 6 || code.trim().length > 64}>{t('common.confirm')}</Button>
                </DialogFooter>
            </form>
        </Dialog>
    )
}
