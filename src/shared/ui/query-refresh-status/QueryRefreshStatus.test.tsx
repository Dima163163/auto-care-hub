import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { QueryRefreshStatus } from './QueryRefreshStatus'

describe('QueryRefreshStatus', () => {
    it('announces active background refreshes', () => {
        render(<QueryRefreshStatus isRefreshing label="Refreshing..." />)

        expect(screen.getByRole('status')).toHaveTextContent('Refreshing...')
    })

    it('does not add an announcement when the query is idle', () => {
        render(<QueryRefreshStatus isRefreshing={false} label="Refreshing..." />)

        expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })
})
