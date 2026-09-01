import {
  ABILITIES,
  type Ability,
  type Participant,
  type TeamAssignment,
  type TeamOptions,
} from '../types'

const mulberry32 = (seed: number) => {
  let value = seed >>> 0
  return () => {
    value += 0x6d2b79f5
    let result = value
    result = Math.imul(result ^ (result >>> 15), result | 1)
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61)
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296
  }
}

const shuffle = <T,>(items: T[], seed: number) => {
  const random = mulberry32(seed)
  const copy = [...items]
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1))
    ;[copy[index], copy[target]] = [copy[target], copy[index]]
  }
  return copy
}

const weightsFor = (options: TeamOptions): Record<Ability, number> =>
  Object.fromEntries(
    ABILITIES.map((ability) => [
      ability,
      options.balanceMode === 'specific' && options.specificAbility === ability ? 4 : 1,
    ]),
  ) as Record<Ability, number>

const scoreParticipant = (
  participant: Participant,
  weights: Record<Ability, number>,
) => ABILITIES.reduce((sum, ability) => sum + participant[ability] * weights[ability], 0)

const teamSizes = (assignments: TeamAssignment[], teamCount: number) =>
  Array.from({ length: teamCount }, (_, index) =>
    assignments.filter(({ team }) => team === index + 1).length,
  )

export const getTeamMetrics = (assignments: TeamAssignment[], teamCount: number) =>
  Array.from({ length: teamCount }, (_, index) => {
    const team = assignments.filter(({ team }) => team === index + 1)
    const averages = Object.fromEntries(
      ABILITIES.map((ability) => [
        ability,
        team.length
          ? team.reduce((sum, item) => sum + item.participant[ability], 0) / team.length
          : 0,
      ]),
    ) as Record<Ability, number>

    return {
      team: index + 1,
      size: team.length,
      averages,
      overall: ABILITIES.reduce((sum, ability) => sum + averages[ability], 0) / ABILITIES.length,
    }
  })

const imbalanceCost = (assignments: TeamAssignment[], options: TeamOptions) => {
  const metrics = getTeamMetrics(assignments, options.teamCount)
  const weights = weightsFor(options)
  const sizePenalty = Math.max(...metrics.map(({ size }) => size)) - Math.min(...metrics.map(({ size }) => size))

  const abilityCost = ABILITIES.reduce((total, ability) => {
    const values = metrics.map(({ averages }) => averages[ability])
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length
    return total + values.reduce((sum, value) => sum + (value - mean) ** 2, 0) * weights[ability]
  }, 0)

  return abilityCost + sizePenalty * 1000
}

const randomAssignment = (participants: Participant[], options: TeamOptions) =>
  shuffle(participants, options.seed).map((participant, index) => {
    const team = (index % options.teamCount) + 1
    return { participant, team, autoTeam: team }
  })

export const createBalancedTeams = (
  participants: Participant[],
  options: TeamOptions,
): TeamAssignment[] => {
  if (participants.length === 0) return []
  if (options.balanceMode === 'random') return randomAssignment(participants, options)

  const weights = weightsFor(options)
  const random = mulberry32(options.seed)
  const ordered = shuffle(participants, options.seed).sort(
    (left, right) =>
      scoreParticipant(right, weights) - scoreParticipant(left, weights) + (random() - 0.5) * 0.2,
  )
  const maximumSize = Math.ceil(participants.length / options.teamCount)
  const assignments: TeamAssignment[] = []

  ordered.forEach((participant) => {
    let bestTeam = 1
    let bestCost = Number.POSITIVE_INFINITY

    for (let team = 1; team <= options.teamCount; team += 1) {
      const sizes = teamSizes(assignments, options.teamCount)
      if (sizes[team - 1] >= maximumSize) continue

      const candidate = [...assignments, { participant, team, autoTeam: team }]
      const cost = imbalanceCost(candidate, options) + random() * 0.001
      if (cost < bestCost) {
        bestCost = cost
        bestTeam = team
      }
    }

    assignments.push({ participant, team: bestTeam, autoTeam: bestTeam })
  })

  let best = assignments
  let bestCost = imbalanceCost(best, options)

  for (let pass = 0; pass < 8; pass += 1) {
    let improved = false
    for (let left = 0; left < best.length; left += 1) {
      for (let right = left + 1; right < best.length; right += 1) {
        if (best[left].team === best[right].team) continue

        const candidate = best.map((item, index) => {
          if (index === left) return { ...item, team: best[right].team }
          if (index === right) return { ...item, team: best[left].team }
          return item
        })
        const candidateCost = imbalanceCost(candidate, options)
        if (candidateCost + 0.0001 < bestCost) {
          best = candidate
          bestCost = candidateCost
          improved = true
        }
      }
    }
    if (!improved) break
  }

  return best.map((assignment) => ({ ...assignment, autoTeam: assignment.team }))
}
