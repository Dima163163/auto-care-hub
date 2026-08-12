import type { ZodError } from 'zod'

import type { ValidationErrorDetail } from '../errors/types.js'

type ZodIssue = ZodError['issues'][number]

export function formatZodIssues(issues: ZodIssue[]): ValidationErrorDetail[] {
    return issues.map((issue) => ({
        path: issue.path.length > 0 ? issue.path.map(String).join('.') : 'body',
        message: issue.message,
    }))
}