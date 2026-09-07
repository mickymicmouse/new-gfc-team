import { describe, expect, it } from 'vitest'
import { formatScore, normalizePlayerName } from './types'

describe('formatScore', () => {
  it('always displays ability scores to two decimal places', () => {
    expect(formatScore(3)).toBe('3.00')
    expect(formatScore(3.456)).toBe('3.46')
  })
})

describe('normalizePlayerName', () => {
  it('ignores surrounding spaces and letter case', () => {
    expect(normalizePlayerName('  Test Player ')).toBe(normalizePlayerName('test player'))
  })
})
