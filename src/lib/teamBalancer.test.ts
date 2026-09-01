import { describe, expect, it } from 'vitest'
import type { Participant, TeamOptions } from '../types'
import { createBalancedTeams, getTeamMetrics } from './teamBalancer'

const participants: Participant[] = Array.from({ length: 17 }, (_, index) => ({
  id: String(index),
  name: `선수 ${index + 1}`,
  jersey_number: index + 1,
  defense: (index % 5) + 1,
  passing: ((index + 1) % 5) + 1,
  shooting: ((index + 2) % 5) + 1,
  control: ((index + 3) % 5) + 1,
  activity: ((index + 4) % 5) + 1,
  is_active: true,
}))

const options: TeamOptions = {
  teamCount: 3,
  balanceMode: 'overall',
  specificAbility: 'defense',
  seed: 7,
}

describe('createBalancedTeams', () => {
  it('keeps team sizes within one player', () => {
    const result = createBalancedTeams(participants, options)
    const sizes = getTeamMetrics(result, 3).map(({ size }) => size)
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1)
  })

  it('is deterministic for the same seed', () => {
    const first = createBalancedTeams(participants, options)
    const second = createBalancedTeams(participants, options)
    expect(second.map(({ participant, team }) => [participant.id, team])).toEqual(
      first.map(({ participant, team }) => [participant.id, team]),
    )
  })

  it('changes random teams when the seed changes', () => {
    const first = createBalancedTeams(participants, { ...options, balanceMode: 'random', seed: 1 })
    const second = createBalancedTeams(participants, { ...options, balanceMode: 'random', seed: 2 })
    expect(second.map(({ participant }) => participant.id)).not.toEqual(
      first.map(({ participant }) => participant.id),
    )
  })
})
