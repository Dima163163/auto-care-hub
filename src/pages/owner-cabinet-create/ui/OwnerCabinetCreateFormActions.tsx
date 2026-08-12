import { Link } from 'react-router'

import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { ROUTES } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'

type OwnerCabinetCreateFormActionsProps = {
    isCreating: boolean
    isUploadingImage: boolean
}

export function OwnerCabinetCreateFormActions({
    isCreating,
    isUploadingImage,
}: OwnerCabinetCreateFormActionsProps) {
    const { t } = useTranslation()

    return (
        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
                to={ROUTES.ownerCabinets}
                className={buttonVariants({ variant: 'outline' })}
            >
                {t('common.cancel')}
            </Link>

            <Button type="submit" loading={isCreating || isUploadingImage}>
                {isUploadingImage
                    ? t('cabinet.form.uploadingImage')
                    : isCreating
                    ? t('cabinet.form.creatingAction')
                    : t('cabinet.form.createAction')}
            </Button>
        </div>
    )
}
