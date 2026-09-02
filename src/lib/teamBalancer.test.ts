import { describe, expect, it } from 'vitest'
import type { Participant, TeamOptions } from '../types'
import { createBalancedTeams, getTeamMetrics, reorderTeamMember } from './teamBalancer'

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

  it('keeps decimal ability scores in team metrics', () => {
    const decimalParticipants = participants.slice(0, 2).map((participant, index) => ({
      ...participant,
      defense: index === 0 ? 2.8 : 4.1,
    }))

    const result = createBalancedTeams(decimalParticipants, { ...options, teamCount: 2 })
    const defenseAverages = getTeamMetrics(result, 2).map(({ averages }) => averages.defense)

    expect(defenseAverages.sort()).toEqual([2.8, 4.1])
  })

  it('numbers each team rotation from one without gaps', () => {
    const result = createBalancedTeams(participants, options)

    for (let team = 1; team <= options.teamCount; team += 1) {
      expect(result.filter((assignment) => assignment.team === team).map(({ rotationOrder }) => rotationOrder))
        .toEqual(Array.from({ length: result.filter((assignment) => assignment.team === team).length }, (_, index) => index + 1))
    }
  })

  it('moves a player to a new rotation position and shifts the others', () => {
    const result = createBalancedTeams(participants.slice(0, 6), { ...options, teamCount: 2 })
    const team = result.filter((assignment) => assignment.team === 1)
    const moved = reorderTeamMember(result, team[2].participant.id, 1)

    expect(moved.filter((assignment) => assignment.team === 1).sort((left, right) => left.rotationOrder - right.rotationOrder)[0].participant.id)
      .toBe(team[2].participant.id)
  })
})
