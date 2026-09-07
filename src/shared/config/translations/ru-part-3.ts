import { ruPart3Admin } from './ru-part-3-admin'
import { ruPart3Autocare } from './ru-part-3-autocare'

export const ruPart3 = {
    ...ruPart3Admin,
    autocare: {
        ...ruPart3Autocare,
    },
} as const
