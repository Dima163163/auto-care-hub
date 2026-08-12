import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Badge } from './badge'

describe('Badge', () => {
    it('renders inline status content as a span', () => {
        render(<Badge variant="outline">Open</Badge>)

        const badge = screen.getByText('Open')

        expect(badge.tagName).toBe('SPAN')
        expect(badge).toHaveClass('rounded-md', 'text-foreground')
    })

    it('keeps the caller class while applying the selected variant', () => {
        render(<Badge variant="destructive" className="text-xs">Blocked</Badge>)

        expect(screen.getByText('Blocked')).toHaveClass(
            'bg-destructive',
            'text-xs',
        )
    })
})
