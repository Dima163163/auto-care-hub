import { describe, expect, it } from 'vitest'

import { getPreferenceShortcutPath } from './get-preference-shortcut-path'

describe('getPreferenceShortcutPath', () => {
    it('creates an explicit catalog shortcut from saved client preferences', () => {
        expect(getPreferenceShortcutPath({
            role: 'client',
            preferredCity: ' Berlin ',
            preferredCategories: ['Massage', 'Consulting'],
        })).toBe('/cabinets?city=Berlin&service=Massage')
    })

    it('does not personalize guests or non-client workspaces', () => {
        expect(getPreferenceShortcutPath(null)).toBeNull()
        expect(getPreferenceShortcutPath({ role: 'owner', preferredCity: 'Berlin', preferredCategories: ['Massage'] })).toBeNull()
        expect(getPreferenceShortcutPath({ role: 'client', preferredCity: null, preferredCategories: [] })).toBeNull()
    })
})
