import { describe, expect, it } from 'vitest'
import { formatScore, normalizePlayerName, pickAbilityScores, type AbilityScores } from './types'

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

describe('pickAbilityScores', () => {
  it('does not carry stale player identity fields into the score form state', () => {
    const scores = pickAbilityScores({
      defense: 3.21,
      passing: 3.22,
      shooting: 3.23,
      control: 3.24,
      activity: 3.25,
      name: 'Test Player',
      jersey_number: 7,
    } as AbilityScores & { name: string; jersey_number: number })

    expect(scores).toEqual({
      defense: 3.21,
      passing: 3.22,
      shooting: 3.23,
      control: 3.24,
      activity: 3.25,
    })
    expect(scores).not.toHaveProperty('jersey_number')
  })
})
