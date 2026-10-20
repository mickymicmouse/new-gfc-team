import {
  ABILITIES,
  isGuest,
  overallScore,
  type Ability,
  type Participant,
  type TeamAssignment,
  type TeamOptions,
} from '../types'
import type { PreviousTeam } from './api'

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
    return { participant, team, autoTeam: team, rotationOrder: Math.floor(index / options.teamCount) + 1 }
  })

export const DEFAULT_OVERALL_RANGE = 0.2

export const getOverallRange = (participants: Participant[], assignments: TeamAssignment[], teamCount: number) => {
  const center = participants.reduce((sum, player) => sum + overallScore(player), 0) / participants.length
  const deviation = Math.max(...getTeamMetrics(assignments, teamCount).map(({ overall }) => Math.abs(overall - center)))
  return { center, deviation, allowance: Math.max(DEFAULT_OVERALL_RANGE, Math.ceil((deviation - 1e-9) / 0.05) * 0.05) }
}

const createOverallTeams = (
  participants: Participant[], options: TeamOptions, previousTeams: PreviousTeam[],
): TeamAssignment[] => {
  const random = mulberry32(options.seed)
  const center = participants.reduce((sum, player) => sum + overallScore(player), 0) / participants.length
  const scores = participants.map(overallScore)
  const counts = Array.from({ length: options.teamCount }, (_, team) =>
    Math.floor(participants.length / options.teamCount) + (team < participants.length % options.teamCount ? 1 : 0),
  )
  const pastPairs = new Map<string, number>()
  previousTeams.slice(0, 2).forEach(({ teams }, index) => {
    for (const team of teams) for (let left = 0; left < team.length; left += 1) {
      for (let right = left + 1; right < team.length; right += 1) {
        const key = [team[left], team[right]].sort().join(':')
        pastPairs.set(key, (pastPairs.get(key) ?? 0) + (index === 0 ? 2 : 1))
      }
    }
  })
  const pairWeights = participants.map((left, i) => participants.map((right, j) =>
    i === j || isGuest(left) || isGuest(right) ? 0
      : pastPairs.get([left.id, right.id].sort().join(':')) ?? 0,
  ))

  const evaluate = (teams: number[]) => {
    const totals = counts.map(() => 0)
    teams.forEach((team, index) => { totals[team] += scores[index] })
    const deviation = Math.max(...totals.map((total, index) => Math.abs(total / counts[index] - center)))
    let repeats = 0
    for (let left = 0; left < teams.length; left += 1) {
      for (let right = left + 1; right < teams.length; right += 1) {
        if (teams[left] === teams[right]) repeats += pairWeights[left][right]
      }
    }
    return { deviation, repeats }
  }

  const abilitySpreadFor = (teams: number[]) => Math.max(...ABILITIES.map((ability) => {
    const values = counts.map((count, team) =>
      participants.reduce((sum, player, index) => sum + (teams[index] === team ? player[ability] : 0), 0) / count,
    )
    return Math.max(...values) - Math.min(...values)
  }))

  const candidates: { teams: number[]; deviation: number; repeats: number; abilitySpread: number }[] = []
  const slots = counts.flatMap((count, team) => Array.from({ length: count }, () => team))
  // Explore independent starts; swap only across teams so sizes stay balanced.
  for (let attempt = 0; attempt < 180; attempt += 1) {
    const teams = shuffle(slots, Math.floor(random() * 0xffffffff))
    let current = evaluate(teams)
    for (let pass = 0; pass < 5; pass += 1) {
      let best: { left: number; right: number; score: typeof current } | null = null
      for (let left = 0; left < teams.length; left += 1) {
        for (let right = left + 1; right < teams.length; right += 1) {
          if (teams[left] === teams[right]) continue
          ;[teams[left], teams[right]] = [teams[right], teams[left]]
          const score = evaluate(teams)
          ;[teams[left], teams[right]] = [teams[right], teams[left]]
          const better = current.deviation > DEFAULT_OVERALL_RANGE + 1e-9
            ? score.deviation < current.deviation - 1e-9
            : score.deviation <= DEFAULT_OVERALL_RANGE + 1e-9 && score.repeats < current.repeats
          if (better && (!best || (current.deviation > DEFAULT_OVERALL_RANGE + 1e-9
            ? score.deviation < best.score.deviation - 1e-9
            : score.repeats < best.score.repeats))) best = { left, right, score }
        }
      }
      if (!best) break
      ;[teams[best.left], teams[best.right]] = [teams[best.right], teams[best.left]]
      current = best.score
    }
    candidates.push({ teams, ...current, abilitySpread: abilitySpreadFor(teams) })
  }

  const minimum = Math.min(...candidates.map(({ deviation }) => deviation))
  const allowance = Math.max(DEFAULT_OVERALL_RANGE, Math.ceil((minimum - 1e-9) / 0.05) * 0.05)
  const eligible = candidates.filter(({ deviation }) => deviation <= allowance + 1e-9)
  const fewestRepeats = Math.min(...eligible.map(({ repeats }) => repeats))
  const finalists = eligible.filter(({ repeats }) => repeats === fewestRepeats)
  // Preserve variety among equally novel lineups while avoiding a lopsided single ability.
  const moderate = finalists.filter(({ abilitySpread }) => abilitySpread <= 0.7 + 1e-9)
  const pool = moderate.length ? moderate : finalists.filter(({ abilitySpread }) =>
    abilitySpread <= Math.min(...finalists.map((item) => item.abilitySpread)) + 0.05,
  )
  const chosen = pool[Math.floor(random() * pool.length)]
  return normalizeRotationOrders(participants.map((participant, index) => ({
    participant,
    team: chosen.teams[index] + 1,
    autoTeam: chosen.teams[index] + 1,
    rotationOrder: index + 1,
  })))
}

export const normalizeRotationOrders = (assignments: TeamAssignment[]) => {
  const counters = new Map<number, number>()
  return [...assignments]
    .sort((left, right) =>
      left.team - right.team
      || left.rotationOrder - right.rotationOrder
      || left.participant.name.localeCompare(right.participant.name, 'ko'),
    )
    .map((assignment) => {
      const rotationOrder = (counters.get(assignment.team) ?? 0) + 1
      counters.set(assignment.team, rotationOrder)
      return { ...assignment, rotationOrder }
    })
}

export const reorderTeamMember = (
  assignments: TeamAssignment[],
  participantId: string,
  nextOrder: number,
) => {
  const target = assignments.find(({ participant }) => participant.id === participantId)
  if (!target) return assignments

  const teamMembers = assignments
    .filter(({ team }) => team === target.team)
    .sort((left, right) => left.rotationOrder - right.rotationOrder)
  const currentIndex = teamMembers.findIndex(({ participant }) => participant.id === participantId)
  if (currentIndex < 0) return assignments

  const [moved] = teamMembers.splice(currentIndex, 1)
  const boundedIndex = Math.min(Math.max(nextOrder - 1, 0), teamMembers.length)
  teamMembers.splice(boundedIndex, 0, moved)
  const orderById = new Map(teamMembers.map((assignment, index) => [assignment.participant.id, index + 1]))

  return assignments.map((assignment) =>
    assignment.team === target.team
      ? { ...assignment, rotationOrder: orderById.get(assignment.participant.id) ?? assignment.rotationOrder }
      : assignment,
  )
}

export const createBalancedTeams = (
  participants: Participant[],
  options: TeamOptions,
  previousTeams: PreviousTeam[] = [],
): TeamAssignment[] => {
  if (participants.length === 0) return []
  if (options.balanceMode === 'random') return randomAssignment(participants, options)
  if (options.balanceMode === 'overall') return createOverallTeams(participants, options, previousTeams)

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

      const candidate = [...assignments, {
        participant,
        team,
        autoTeam: team,
        rotationOrder: sizes[team - 1] + 1,
      }]
      const cost = imbalanceCost(candidate, options) + random() * 0.001
      if (cost < bestCost) {
        bestCost = cost
        bestTeam = team
      }
    }

    assignments.push({
      participant,
      team: bestTeam,
      autoTeam: bestTeam,
      rotationOrder: assignments.filter(({ team }) => team === bestTeam).length + 1,
    })
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

  return normalizeRotationOrders(
    best.map((assignment) => ({ ...assignment, autoTeam: assignment.team })),
  )
}
