import { Pencil, Save, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'

import { useUpdateOwnerAutoCareOfferMutation, type AutoCareApiOffer } from '@/entities/automotive-service'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'

type OwnerOfferEditorLabels = {
    offerDescription: string
    descriptionPlaceholder: string
    price: string
    priceInvalid: string
    editError: string
    priceSnapshotNotice: string
    save: string
    cancel: string
}

type OwnerOfferEditorProps = {
    providerId: string
    offer: AutoCareApiOffer
    labels: OwnerOfferEditorLabels
    onCancel: () => void
    onSaved: () => void
}

export function OwnerOfferEditor({ providerId, offer, labels, onCancel, onSaved }: OwnerOfferEditorProps) {
    const [description, setDescription] = useState(offer.description ?? '')
    const [price, setPrice] = useState(String(offer.priceFromMinor / 100))
    const [validationError, setValidationError] = useState<string | null>(null)
    const [updateOffer, updateState] = useUpdateOwnerAutoCareOfferMutation()

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const priceFromMinor = Math.round(Number(price) * 100)
        if (!Number.isFinite(priceFromMinor) || priceFromMinor < 0 || priceFromMinor > 10_000_000_000) {
            setValidationError(labels.priceInvalid)
            return
        }

        setValidationError(null)
        try {
            await updateOffer({ providerId, offerId: offer.id, description: description.trim() || null, priceFromMinor }).unwrap()
            onSaved()
        } catch {
            setValidationError(labels.editError)
        }
    }

    return (
        <form className="grid gap-3" onSubmit={handleSubmit}>
            <label className="grid gap-1.5 text-xs font-bold text-muted-foreground">
                <span>{labels.offerDescription}</span>
                <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder={labels.descriptionPlaceholder} rows={3} maxLength={2_000} className="w-full resize-none rounded-[var(--radius-control)] border border-border bg-card px-3 py-2 text-sm font-medium text-foreground outline-none transition focus:border-primary" />
            </label>
            <label className="grid gap-1.5 text-xs font-bold text-muted-foreground">
                <span>{labels.price}</span>
                <input value={price} onChange={(event) => setPrice(event.target.value)} type="number" min="0" max="100000000" step="1" inputMode="decimal" className="h-10 w-full rounded-[var(--radius-control)] border border-border bg-card px-3 text-sm font-black text-foreground outline-none transition focus:border-primary" />
            </label>
            <p className="text-[11px] font-semibold leading-4 text-muted-foreground">{labels.priceSnapshotNotice}</p>
            {validationError ? <p className="text-xs font-bold text-destructive">{updateState.error ? getApiErrorMessage(updateState.error, validationError) : validationError}</p> : null}
            <div className="flex flex-wrap gap-2">
                <button type="submit" disabled={updateState.isLoading} className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-control)] bg-primary px-3 text-xs font-black text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"><Save className="size-3.5" />{labels.save}</button>
                <button type="button" onClick={onCancel} disabled={updateState.isLoading} className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-control)] border border-border px-3 text-xs font-black text-foreground transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"><X className="size-3.5" />{labels.cancel}</button>
            </div>
        </form>
    )
}

export function EditOfferButton({ label, onClick }: { label: string; onClick: () => void }) {
    return <button type="button" onClick={onClick} className="inline-flex items-center gap-1.5 rounded-[var(--radius-control)] border border-border px-2.5 py-1.5 text-[11px] font-black text-primary transition hover:border-primary hover:bg-primary/5"><Pencil className="size-3.5" />{label}</button>
}
