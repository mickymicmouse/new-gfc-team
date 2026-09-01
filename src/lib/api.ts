import { createAdminClient, supabase } from './supabase'
import type {
  Guest,
  MatchDraft,
  Participant,
  Player,
  StoredMatchState,
  TeamAssignment,
} from '../types'
import { isGuest } from '../types'

type PlayerInput = Omit<Player, 'id' | 'created_at' | 'updated_at'>

const clientFor = (adminPin?: string) => adminPin ? createAdminClient(adminPin) : supabase

export const verifyAdminPin = async (adminPin: string) => {
  const { data, error } = await createAdminClient(adminPin).rpc('is_gfc_admin')
  if (error) throw error
  return data === true
}

export const fetchPlayers = async (adminPin?: string) => {
  const { data, error } = await clientFor(adminPin)
    .from('players')
    .select('*')
    .order('jersey_number', { ascending: true, nullsFirst: false })
    .order('name')

  if (error) throw error
  return data as Player[]
}

export const addPlayer = async (player: PlayerInput, adminPin: string) => {
  const { data, error } = await createAdminClient(adminPin).from('players').insert(player).select().single()
  if (error) throw error
  return data as Player
}

export const updatePlayer = async (id: string, player: PlayerInput, adminPin: string) => {
  const { data, error } = await createAdminClient(adminPin)
    .from('players')
    .update({ ...player, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Player
}

export const setPlayerActive = async (id: string, isActive: boolean, adminPin: string) => {
  const { data, error } = await createAdminClient(adminPin)
    .from('players')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Player
}

interface StoredMatchPlayerRow {
  id: string
  player_id: string | null
  guest_name: string | null
  guest_jersey_number: number | null
  guest_defense: number | null
  guest_passing: number | null
  guest_shooting: number | null
  guest_control: number | null
  guest_activity: number | null
  attending: boolean
  assigned_team: number | null
  manual_team: number | null
  player: Player | Player[] | null
}

export interface StoredMatchRow {
  id: string
  title: string
  match_date: string
  team_count: 2 | 3
  balance_mode: MatchDraft['options']['balanceMode']
  specific_ability: MatchDraft['options']['specificAbility'] | null
  random_seed: number
  status: MatchDraft['status']
  match_players: StoredMatchPlayerRow[]
}

export const mapStoredMatch = (match: StoredMatchRow): StoredMatchState => {
  const attendingIds = new Set<string>()
  const guests: Guest[] = []
  const participants = new Map<string, Participant>()

  match.match_players.forEach((row) => {
    const player = Array.isArray(row.player) ? row.player[0] : row.player

    if (row.player_id) {
      if (row.attending) attendingIds.add(row.player_id)
      if (player) participants.set(row.player_id, player)
      return
    }

    if (!row.guest_name || !row.attending) return
    const guest: Guest = {
      id: `guest-${row.id}`,
      name: row.guest_name,
      jersey_number: row.guest_jersey_number,
      defense: row.guest_defense ?? 3,
      passing: row.guest_passing ?? 3,
      shooting: row.guest_shooting ?? 3,
      control: row.guest_control ?? 3,
      activity: row.guest_activity ?? 3,
      isGuest: true,
    }
    guests.push(guest)
    participants.set(guest.id, guest)
  })

  const assignments = match.match_players.flatMap((row) => {
    if (!row.attending || row.assigned_team === null) return []
    const participantId = row.player_id ?? `guest-${row.id}`
    const participant = participants.get(participantId)
    if (!participant) return []
    return [{
      participant,
      autoTeam: row.assigned_team,
      team: row.manual_team ?? row.assigned_team,
    }]
  })

  return {
    draft: {
      id: match.id,
      title: match.title,
      matchDate: match.match_date,
      status: match.status,
      options: {
        teamCount: match.team_count,
        balanceMode: match.balance_mode,
        specificAbility: match.specific_ability ?? 'defense',
        seed: match.random_seed,
      },
    },
    attendingIds,
    guests,
    assignments,
  }
}

export const fetchMatchByDate = async (matchDate: string) => {
  const { data, error } = await supabase
    .from('matches')
    .select(`
      id,
      title,
      match_date,
      team_count,
      balance_mode,
      specific_ability,
      random_seed,
      status,
      match_players (
        id,
        player_id,
        guest_name,
        guest_jersey_number,
        guest_defense,
        guest_passing,
        guest_shooting,
        guest_control,
        guest_activity,
        attending,
        assigned_team,
        manual_team,
        player:players (
          id,
          name,
          jersey_number,
          defense,
          passing,
          shooting,
          control,
          activity,
          is_active,
          created_at,
          updated_at
        )
      )
    `)
    .eq('match_date', matchDate)
    .eq('status', 'confirmed')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data ? mapStoredMatch(data as unknown as StoredMatchRow) : null
}

interface SaveMatchInput {
  adminPin: string
  draft: MatchDraft
  players: Player[]
  attendingIds: Set<string>
  guests: Guest[]
  assignments: TeamAssignment[]
}

export const saveMatch = async ({
  adminPin,
  draft,
  players,
  attendingIds,
  guests,
  assignments,
}: SaveMatchInput) => {
  const adminClient = createAdminClient(adminPin)
  const matchPayload = {
    title: draft.title.trim() || 'GFC 풋살',
    match_date: draft.matchDate,
    team_count: draft.options.teamCount,
    balance_mode: draft.options.balanceMode,
    specific_ability:
      draft.options.balanceMode === 'specific' ? draft.options.specificAbility : null,
    random_seed: draft.options.seed,
    status: draft.status,
    updated_at: new Date().toISOString(),
  }

  let matchId = draft.id
  if (!matchId) {
    const { data: existing, error: existingError } = await adminClient
      .from('matches')
      .select('id')
      .eq('match_date', draft.matchDate)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (existingError) throw existingError
    matchId = existing?.id
  }

  if (matchId) {
    const { error } = await adminClient.from('matches').update(matchPayload).eq('id', matchId)
    if (error) throw error
  } else {
    const { data, error } = await adminClient.from('matches').insert(matchPayload).select('id').single()
    if (error) throw error
    matchId = data.id
  }

  const { error: deleteError } = await adminClient
    .from('match_players')
    .delete()
    .eq('match_id', matchId)
  if (deleteError) throw deleteError

  const assignmentById = new Map(assignments.map((item) => [item.participant.id, item]))
  const rows = [
    ...players.map((player) => {
      const assignment = assignmentById.get(player.id)
      return {
        match_id: matchId,
        player_id: player.id,
        attending: attendingIds.has(player.id),
        assigned_team: assignment?.autoTeam ?? null,
        manual_team:
          assignment && assignment.team !== assignment.autoTeam ? assignment.team : null,
      }
    }),
    ...guests.map((guest) => {
      const assignment = assignmentById.get(guest.id)
      return {
        match_id: matchId,
        player_id: null,
        guest_name: guest.name,
        guest_jersey_number: guest.jersey_number,
        guest_defense: guest.defense,
        guest_passing: guest.passing,
        guest_shooting: guest.shooting,
        guest_control: guest.control,
        guest_activity: guest.activity,
        attending: true,
        assigned_team: assignment?.autoTeam ?? null,
        manual_team:
          assignment && assignment.team !== assignment.autoTeam ? assignment.team : null,
      }
    }),
  ]

  const { error: insertError } = await adminClient.from('match_players').insert(rows)
  if (insertError) throw insertError

  return matchId
}

export const participantLabel = (participant: Participant) =>
  isGuest(participant) ? `${participant.name} (게스트)` : participant.name
