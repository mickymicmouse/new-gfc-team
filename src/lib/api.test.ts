import { describe, expect, it } from 'vitest'
import { mapStoredMatch, type StoredMatchRow } from './api'

const player = {
  id: 'player-1',
  name: '테스트 선수',
  jersey_number: 11,
  defense: 4,
  passing: 4,
  shooting: 3,
  control: 4,
  activity: 5,
  is_active: true,
}

describe('mapStoredMatch', () => {
  it('restores attendance, guests, and manual team assignments', () => {
    const stored: StoredMatchRow = {
      id: 'match-1',
      title: 'GFC 정기 풋살',
      match_date: '2026-09-01',
      team_count: 2,
      balance_mode: 'overall',
      specific_ability: null,
      random_seed: 3,
      status: 'confirmed',
      match_players: [
        {
          id: 'row-player',
          player_id: player.id,
          guest_name: null,
          guest_jersey_number: null,
          guest_defense: null,
          guest_passing: null,
          guest_shooting: null,
          guest_control: null,
          guest_activity: null,
          attending: true,
          assigned_team: 1,
          manual_team: 2,
          rotation_order: 1,
          player,
        },
        {
          id: 'row-guest',
          player_id: null,
          guest_name: '게스트',
          guest_jersey_number: null,
          guest_defense: 3,
          guest_passing: 4,
          guest_shooting: 3,
          guest_control: 2,
          guest_activity: 5,
          attending: true,
          assigned_team: 1,
          manual_team: null,
          rotation_order: 2,
          player: null,
        },
      ],
    }

    const result = mapStoredMatch(stored)

    expect(result.draft).toMatchObject({ id: 'match-1', matchDate: '2026-09-01', status: 'confirmed' })
    expect([...result.attendingIds]).toEqual(['player-1'])
    expect(result.guests).toHaveLength(1)
    expect(result.assignments.map(({ participant, autoTeam, team, rotationOrder }) => [participant.name, autoTeam, team, rotationOrder])).toEqual([
      ['테스트 선수', 1, 2, 1],
      ['게스트', 1, 1, 2],
    ])
  })
})
