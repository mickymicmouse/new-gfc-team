import { describe, expect, it } from 'vitest'
import { buildNavigationSearch, readNavigationState } from './navigationState'

describe('navigation state', () => {
  it('restores the current page and selected match date', () => {
    expect(readNavigationState('?view=teams&date=2026-07-13', '2026-09-07')).toEqual({
      view: 'teams',
      matchDate: '2026-07-13',
    })
  })

  it('falls back safely for invalid URL values', () => {
    expect(readNavigationState('?view=unknown&date=2026-02-30', '2026-09-07')).toEqual({
      view: 'attendance',
      matchDate: '2026-09-07',
    })
  })

  it('updates navigation values while preserving unrelated query parameters', () => {
    expect(buildNavigationSearch('?source=home', 'players', '2026-09-06')).toBe(
      '?source=home&view=players&date=2026-09-06',
    )
  })
})
