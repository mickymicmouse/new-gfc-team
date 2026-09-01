export const ABILITIES = ['defense', 'passing', 'shooting', 'control', 'activity'] as const

export type Ability = (typeof ABILITIES)[number]
export type BalanceMode = 'random' | 'overall' | 'specific'
export type AppView = 'attendance' | 'teams' | 'players'

export const ABILITY_LABELS: Record<Ability, string> = {
  defense: '수비',
  passing: '패스',
  shooting: '슈팅',
  control: '컨트롤',
  activity: '활동량',
}

export interface AbilityScores {
  defense: number
  passing: number
  shooting: number
  control: number
  activity: number
}

export interface Player extends AbilityScores {
  id: string
  name: string
  jersey_number: number | null
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface Guest extends AbilityScores {
  id: string
  name: string
  jersey_number: number | null
  isGuest: true
}

export type Participant = Player | Guest

export interface TeamOptions {
  teamCount: 2 | 3
  balanceMode: BalanceMode
  specificAbility: Ability
  seed: number
}

export interface TeamAssignment {
  participant: Participant
  team: number
  autoTeam: number
}

export interface MatchDraft {
  id?: string
  title: string
  matchDate: string
  status: 'draft' | 'confirmed'
  options: TeamOptions
}

export interface StoredMatchState {
  draft: MatchDraft
  attendingIds: Set<string>
  guests: Guest[]
  assignments: TeamAssignment[]
}

export const isGuest = (participant: Participant): participant is Guest =>
  'isGuest' in participant

export const overallScore = (participant: Participant) =>
  ABILITIES.reduce((total, key) => total + participant[key], 0) / ABILITIES.length
