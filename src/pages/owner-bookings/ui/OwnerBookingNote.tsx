import { useState } from 'react'
import { toast } from 'sonner'

import { useUpdateOwnerBookingNoteMutation } from '@/entities/booking'
import { Button } from '@/components/ui/button'
import { getApiErrorMessage } from '@/shared/api/getApiErrorMessage'
import { useTranslation } from '@/shared/lib/useTranslation'

type OwnerBookingNoteProps = {
    bookingId: string
    initialNote: string | null
}

export function OwnerBookingNote({ bookingId, initialNote }: OwnerBookingNoteProps) {
    const { t } = useTranslation()
    const [note, setNote] = useState(initialNote ?? '')
    const [savedNote, setSavedNote] = useState(initialNote ?? '')
    const [updateNote, { isLoading }] = useUpdateOwnerBookingNoteMutation()
    const normalizedNote = note.trim()
    const hasChanges = normalizedNote !== savedNote

    async function handleSave() {
        try {
            const updatedBooking = await updateNote({
                id: bookingId,
                note: normalizedNote || null,
            }).unwrap()
            const nextNote = updatedBooking.ownerNote ?? ''
            setNote(nextNote)
            setSavedNote(nextNote)
            toast.success(t('booking.ownerNoteSaved'))
        } catch (error) {
            toast.error(getApiErrorMessage(error, t('booking.ownerNoteSaveFailed')))
        }
    }

    return (
        <div className="mt-5 border-t pt-5">
            <label className="text-sm font-medium text-foreground" htmlFor={`owner-note-${bookingId}`}>
                {t('booking.ownerNote')}
            </label>
            <p className="mt-1 text-sm text-muted-foreground">
                {t('booking.ownerNoteDescription')}
            </p>
            <textarea
                id={`owner-note-${bookingId}`}
                value={note}
                maxLength={1000}
                rows={3}
                className="mt-3 min-h-24 w-full resize-y rounded-md border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder={t('booking.ownerNotePlaceholder')}
                onChange={(event) => setNote(event.target.value)}
            />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground">{note.length}/1000</span>
                <Button
                    type="button"
                    size="sm"
                    disabled={!hasChanges}
                    loading={isLoading}
                    onClick={() => void handleSave()}
                >
                    {isLoading ? t('booking.savingOwnerNote') : t('booking.saveOwnerNote')}
                </Button>
            </div>
        </div>
    )
}
