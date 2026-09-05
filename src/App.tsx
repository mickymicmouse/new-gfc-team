import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  CircleAlert,
  Dices,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Trophy,
  UserRoundPlus,
  Users,
} from 'lucide-react'
import { AbilityBars } from './components/AbilityBars'
import { AdminLogin } from './components/AdminLogin'
import { GuestForm } from './components/GuestForm'
import { GuideView } from './components/GuideView'
import { PlayerForm, type PlayerFormValue } from './components/PlayerForm'
import { addPlayer, deleteMatch, fetchMatchByDate, fetchPlayers, saveMatch, setPlayerActive, updatePlayer, verifyAdminPin } from './lib/api'
import { isSupabaseConfigured } from './lib/supabase'
import { createBalancedTeams, getTeamMetrics, normalizeRotationOrders, reorderTeamMember } from './lib/teamBalancer'
import {
  ABILITIES,
  ABILITY_LABELS,
  isGuest,
  overallScore,
  type AppView,
  type Guest,
  type MatchDraft,
  type Participant,
  type Player,
  type TeamAssignment,
} from './types'

const todayInKorea = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())

const initialDraft: MatchDraft = {
  title: 'GFC 정기 풋살',
  matchDate: todayInKorea(),
  status: 'draft',
  options: {
    teamCount: 3,
    balanceMode: 'overall',
    specificAbility: 'defense',
    seed: 1,
  },
}

const TEAM_NAMES = ['GREEN', 'ORANGE', 'NAVY']

interface ToastState {
  kind: 'success' | 'error'
  message: string
}

function App() {
  const [view, setView] = useState<AppView>('attendance')
  const [players, setPlayers] = useState<Player[]>([])
  const [attendingIds, setAttendingIds] = useState<Set<string>>(new Set())
  const [guests, setGuests] = useState<Guest[]>([])
  const [assignments, setAssignments] = useState<TeamAssignment[]>([])
  const [draft, setDraft] = useState<MatchDraft>(initialDraft)
  const [loading, setLoading] = useState(true)
  const [matchLoading, setMatchLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingMatch, setDeletingMatch] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [matchLoadError, setMatchLoadError] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState | null>(null)
  const [playerForm, setPlayerForm] = useState<Player | 'new' | null>(null)
  const [guestFormOpen, setGuestFormOpen] = useState(false)
  const [adminLoginOpen, setAdminLoginOpen] = useState(false)
  const [adminPin, setAdminPin] = useState<string | null>(null)

  const notify = useCallback((kind: ToastState['kind'], message: string) => {
    setToast({ kind, message })
    window.setTimeout(() => setToast(null), 3200)
  }, [])

  const loadPlayers = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      if (!isSupabaseConfigured) throw new Error('Supabase 환경변수가 설정되지 않았습니다.')
      setPlayers(await fetchPlayers(adminPin ?? undefined))
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : '선수 명단을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [adminPin])

  useEffect(() => {
    void loadPlayers()
  }, [loadPlayers])

  useEffect(() => {
    let cancelled = false
    const matchDate = draft.matchDate
    setMatchLoading(true)
    setMatchLoadError(null)

    void fetchMatchByDate(matchDate)
      .then((stored) => {
        if (cancelled) return
        if (stored) {
          setDraft(stored.draft)
          setAttendingIds(stored.attendingIds)
          setGuests(stored.guests)
          setAssignments(stored.assignments)
          return
        }
        setDraft({ ...initialDraft, matchDate })
        setAttendingIds(new Set())
        setGuests([])
        setAssignments([])
      })
      .catch((error) => {
        if (cancelled) return
        setMatchLoadError(error instanceof Error ? error.message : '저장된 경기를 불러오지 못했습니다.')
      })
      .finally(() => {
        if (!cancelled) setMatchLoading(false)
      })

    return () => { cancelled = true }
  }, [draft.matchDate])

  const activePlayers = useMemo(() => players.filter(({ is_active }) => is_active), [players])
  const attendingPlayers = useMemo(
    () => activePlayers.filter(({ id }) => attendingIds.has(id)),
    [activePlayers, attendingIds],
  )
  const participants: Participant[] = useMemo(
    () => [...attendingPlayers, ...guests],
    [attendingPlayers, guests],
  )

  const invalidateTeams = () => {
    if (assignments.length > 0) setAssignments([])
    if (draft.status === 'confirmed') setDraft((current) => ({ ...current, status: 'draft' }))
  }

  const toggleAttendance = (id: string) => {
    invalidateTeams()
    setAttendingIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => {
    invalidateTeams()
    setAttendingIds(new Set(activePlayers.map(({ id }) => id)))
  }

  const clearAttendance = () => {
    invalidateTeams()
    setAttendingIds(new Set())
  }

  const addGuest = (guest: Guest) => {
    invalidateTeams()
    setGuests((current) => [...current, guest])
  }

  const removeGuest = (id: string) => {
    invalidateTeams()
    setGuests((current) => current.filter((guest) => guest.id !== id))
  }

  const handlePlayerSubmit = async (value: PlayerFormValue) => {
    if (!adminPin) {
      setAdminLoginOpen(true)
      throw new Error('관리자 모드가 필요합니다.')
    }
    try {
      if (playerForm && playerForm !== 'new') {
        const saved = await updatePlayer(playerForm.id, value, adminPin)
        setPlayers((current) => current.map((player) => (player.id === saved.id ? saved : player)))
        notify('success', `${saved.name} 선수 정보를 수정했습니다.`)
      } else {
        const saved = await addPlayer(value, adminPin)
        setPlayers((current) => [...current, saved].sort((left, right) => (left.jersey_number ?? 999) - (right.jersey_number ?? 999)))
        notify('success', `${saved.name} 선수를 등록했습니다.`)
      }
    } catch (error) {
      notify('error', error instanceof Error ? error.message : '선수 정보를 저장하지 못했습니다.')
      throw error
    }
  }

  const archivePlayer = async (player: Player) => {
    if (!adminPin) return setAdminLoginOpen(true)
    try {
      const saved = await setPlayerActive(player.id, false, adminPin)
      setPlayers((current) => current.map((item) => (item.id === saved.id ? saved : item)))
      setAttendingIds((current) => {
        const next = new Set(current)
        next.delete(player.id)
        return next
      })
      notify('success', `${player.name} 선수를 비활성화했습니다.`)
    } catch (error) {
      notify('error', error instanceof Error ? error.message : '선수를 비활성화하지 못했습니다.')
    }
  }

  const restorePlayer = async (player: Player) => {
    if (!adminPin) return setAdminLoginOpen(true)
    try {
      const saved = await setPlayerActive(player.id, true, adminPin)
      setPlayers((current) => current.map((item) => (item.id === saved.id ? saved : item)))
      notify('success', `${player.name} 선수를 다시 활성화했습니다.`)
    } catch (error) {
      notify('error', error instanceof Error ? error.message : '선수를 활성화하지 못했습니다.')
    }
  }

  const generateTeams = () => {
    if (participants.length < draft.options.teamCount * 2) {
      notify('error', `${draft.options.teamCount}팀 편성에는 최소 ${draft.options.teamCount * 2}명이 필요합니다.`)
      return
    }
    setAssignments(createBalancedTeams(participants, draft.options))
    setDraft((current) => ({ ...current, status: 'draft' }))
    notify('success', `재편성 ${draft.options.seed}번 조합을 만들었습니다.`)
  }

  const changeManualTeam = (id: string, team: number) => {
    setAssignments((current) =>
      normalizeRotationOrders(current.map((assignment) =>
        assignment.participant.id === id
          ? { ...assignment, team, rotationOrder: Number.MAX_SAFE_INTEGER }
          : assignment,
      )),
    )
    setDraft((current) => ({ ...current, status: 'draft' }))
  }

  const changeRotationOrder = (id: string, rotationOrder: number) => {
    setAssignments((current) => reorderTeamMember(current, id, rotationOrder))
    setDraft((current) => ({ ...current, status: 'draft' }))
  }

  const resetManualTeams = () => {
    setAssignments((current) => normalizeRotationOrders(
      current.map((assignment) => ({ ...assignment, team: assignment.autoTeam })),
    ))
  }

  const confirmTeams = async () => {
    if (assignments.length !== participants.length || assignments.length === 0) {
      notify('error', '먼저 참석 인원으로 팀을 편성해주세요.')
      return
    }
    if (!adminPin) {
      setAdminLoginOpen(true)
      notify('error', '편성을 저장하려면 관리자 PIN이 필요합니다.')
      return
    }
    setSaving(true)
    try {
      const confirmedDraft: MatchDraft = { ...draft, status: 'confirmed' }
      const matchId = await saveMatch({
        adminPin,
        draft: confirmedDraft,
        players: activePlayers,
        attendingIds,
        guests,
        assignments,
      })
      setDraft({ ...confirmedDraft, id: matchId })
      notify('success', '팀 편성을 확정하고 Supabase에 저장했습니다.')
    } catch (error) {
      notify('error', error instanceof Error ? error.message : '팀 편성을 저장하지 못했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const deleteSavedMatch = async () => {
    if (!draft.id) return
    if (!adminPin) {
      setAdminLoginOpen(true)
      notify('error', '저장된 팀을 삭제하려면 관리자 PIN이 필요합니다.')
      return
    }
    if (!window.confirm(`${draft.matchDate} 저장된 팀을 삭제할까요?\n삭제한 기록은 복구할 수 없습니다.`)) return

    setDeletingMatch(true)
    try {
      await deleteMatch(draft.id, adminPin)
      const matchDate = draft.matchDate
      setDraft({ ...initialDraft, matchDate })
      setAttendingIds(new Set())
      setGuests([])
      setAssignments([])
      notify('success', `${matchDate} 저장된 팀을 삭제했습니다.`)
      navigate('attendance')
    } catch (error) {
      notify('error', error instanceof Error ? error.message : '저장된 팀을 삭제하지 못했습니다.')
    } finally {
      setDeletingMatch(false)
    }
  }

  const navigate = (next: AppView) => {
    setView(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const unlockAdmin = async (pin: string) => {
    const valid = await verifyAdminPin(pin)
    if (valid) {
      setAdminPin(pin)
      notify('success', '관리자 모드를 시작했습니다.')
    }
    return valid
  }

  const lockAdmin = () => {
    setAdminPin(null)
    setPlayerForm(null)
    notify('success', '관리자 모드를 종료했습니다.')
  }

  const updateAttendanceDraft = (next: MatchDraft) => {
    if (next.matchDate !== draft.matchDate) {
      setDraft({ ...initialDraft, matchDate: next.matchDate })
      setAttendingIds(new Set())
      setGuests([])
      setAssignments([])
      return
    }
    setDraft(next)
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <Navigation view={view} onNavigate={navigate} />
        <button className={adminPin ? 'sidebar__foot sidebar__foot--admin' : 'sidebar__foot'} onClick={adminPin ? lockAdmin : () => setAdminLoginOpen(true)}>
          {adminPin ? <LogOut size={16} /> : <LockKeyhole size={16} />}
          <div><strong>{adminPin ? '관리자 모드' : '보기 모드'}</strong><small>{adminPin ? '눌러서 잠금' : '눌러서 관리자 전환'}</small></div>
        </button>
      </aside>

      <main className="main-content">
        {view === 'attendance' && (
          <AttendanceView
            players={activePlayers}
            attendingIds={attendingIds}
            guests={guests}
            draft={draft}
            assignments={assignments}
            loading={loading}
            matchLoading={matchLoading}
            error={loadError}
            matchError={matchLoadError}
            onReload={loadPlayers}
            onToggle={toggleAttendance}
            onSelectAll={selectAll}
            onClear={clearAttendance}
            onDraftChange={updateAttendanceDraft}
            onAddGuest={() => setGuestFormOpen(true)}
            onRemoveGuest={removeGuest}
            onContinue={() => navigate('teams')}
            onViewTeams={() => navigate('teams')}
          />
        )}
        {view === 'teams' && (
          <TeamsView
            participants={participants}
            assignments={assignments}
            draft={draft}
            saving={saving}
            deleting={deletingMatch}
            onDraftChange={(next) => { setDraft(next); setAssignments([]) }}
            onGenerate={generateTeams}
            onChangeTeam={changeManualTeam}
            onChangeRotationOrder={changeRotationOrder}
            onResetManual={resetManualTeams}
            onConfirm={confirmTeams}
            onDelete={deleteSavedMatch}
            onBack={() => navigate('attendance')}
          />
        )}
        {view === 'players' && (
          <PlayersView
            players={players}
            loading={loading}
            error={loadError}
            onReload={loadPlayers}
            isAdmin={Boolean(adminPin)}
            onRequestAdmin={() => setAdminLoginOpen(true)}
            onAdd={() => adminPin ? setPlayerForm('new') : setAdminLoginOpen(true)}
            onEdit={(player) => adminPin ? setPlayerForm(player) : setAdminLoginOpen(true)}
            onArchive={archivePlayer}
            onRestore={restorePlayer}
          />
        )}
        {view === 'guide' && (
          <GuideView
            isAdmin={Boolean(adminPin)}
            onStart={() => navigate('attendance')}
            onOpenPlayers={() => navigate('players')}
            onRequestAdmin={() => setAdminLoginOpen(true)}
          />
        )}
      </main>

      <nav className="mobile-nav" aria-label="주요 메뉴"><Navigation view={view} onNavigate={navigate} /></nav>

      {playerForm && (
        <PlayerForm
          player={playerForm === 'new' ? undefined : playerForm}
          onClose={() => setPlayerForm(null)}
          onSubmit={handlePlayerSubmit}
        />
      )}
      {guestFormOpen && <GuestForm onClose={() => setGuestFormOpen(false)} onSubmit={addGuest} />}
      {adminLoginOpen && <AdminLogin onClose={() => setAdminLoginOpen(false)} onUnlock={unlockAdmin} />}
      {toast && <div className={`toast toast--${toast.kind}`} role="status">{toast.kind === 'success' ? <Check size={18} /> : <CircleAlert size={18} />}{toast.message}</div>}
    </div>
  )
}

function Brand() {
  return <div className="brand"><div className="brand__mark"><span>G</span></div><div><strong>GFC</strong><small>FUTSAL CLUB</small></div></div>
}

interface NavigationProps { view: AppView; onNavigate: (view: AppView) => void }

function Navigation({ view, onNavigate }: NavigationProps) {
  const items = [
    { id: 'attendance' as const, label: '이번 주', icon: CalendarDays },
    { id: 'teams' as const, label: '팀 편성', icon: Trophy },
    { id: 'players' as const, label: '선수 DB', icon: Users },
    { id: 'guide' as const, label: '가이드', icon: BookOpen },
  ]
  return <div className="nav-list">{items.map(({ id, label, icon: Icon }) => <button className={view === id ? 'nav-item nav-item--active' : 'nav-item'} key={id} onClick={() => onNavigate(id)}><Icon size={19} /><span>{label}</span>{view === id && <ChevronRight className="nav-chevron" size={16} />}</button>)}</div>
}

interface AttendanceViewProps {
  players: Player[]
  attendingIds: Set<string>
  guests: Guest[]
  draft: MatchDraft
  assignments: TeamAssignment[]
  loading: boolean
  matchLoading: boolean
  error: string | null
  matchError: string | null
  onReload: () => Promise<void>
  onToggle: (id: string) => void
  onSelectAll: () => void
  onClear: () => void
  onDraftChange: (draft: MatchDraft) => void
  onAddGuest: () => void
  onRemoveGuest: (id: string) => void
  onContinue: () => void
  onViewTeams: () => void
}

function AttendanceView(props: AttendanceViewProps) {
  const { players, attendingIds, guests, draft, assignments, loading, matchLoading, error, matchError } = props
  const attendingCount = attendingIds.size + guests.length
  const matchStatus = matchLoading ? '불러오는 중' : draft.id ? (draft.status === 'confirmed' ? '저장된 경기' : '수정 중') : '새 경기'
  return <>
    <PageHeader eyebrow="WEEKLY ROSTER" title="이번 주 참석자" description="참석 선수를 선택하고 게스트를 추가하세요." />
    <section className="match-card pitch-pattern">
      <div className="match-card__heading"><div><span className={draft.id ? 'status-chip status-chip--saved' : 'status-chip'}>{matchStatus}</span><h2>{draft.title}</h2></div><div className="headcount"><strong>{attendingCount}</strong><span>명 참석</span></div></div>
      <div className="match-inputs"><label><span>경기명</span><input value={draft.title} disabled={matchLoading} onChange={(event) => props.onDraftChange({ ...draft, title: event.target.value, status: 'draft' })} /></label><label><span>경기 날짜</span><input type="date" value={draft.matchDate} onChange={(event) => props.onDraftChange({ ...draft, matchDate: event.target.value, status: 'draft' })} /></label></div>
      {matchError && <div className="match-load-error"><CircleAlert size={15} /> {matchError}</div>}
    </section>

    <section className="section-block">
      <div className="section-heading"><div><p className="eyebrow">REGULAR PLAYERS</p><h2>정규 멤버 <span>{attendingIds.size}/{players.length}</span></h2></div><div className="text-actions"><button onClick={props.onSelectAll}>전체 선택</button><i /><button onClick={props.onClear}>선택 해제</button></div></div>
      {loading ? <LoadingState /> : error ? <ErrorState message={error} onReload={props.onReload} /> : <div className="attendance-grid">{players.map((player) => {
        const selected = attendingIds.has(player.id)
        return <button className={selected ? 'attendance-card attendance-card--selected' : 'attendance-card'} key={player.id} onClick={() => props.onToggle(player.id)} aria-pressed={selected}>
          <span className="jersey-badge">{player.jersey_number ?? '–'}</span><span className="attendance-card__name"><strong>{player.name}</strong><small>종합 {overallScore(player).toFixed(1)}</small></span><span className="check-circle">{selected && <Check size={16} strokeWidth={3} />}</span>
        </button>
      })}</div>}
    </section>

    <section className="section-block">
      <div className="section-heading"><div><p className="eyebrow">GUEST PLAYERS</p><h2>게스트 <span>{guests.length}명</span></h2></div><button className="button button--small button--outline" onClick={props.onAddGuest}><UserRoundPlus size={16} /> 게스트 추가</button></div>
      {guests.length === 0 ? <button className="empty-guest" onClick={props.onAddGuest}><Plus size={22} /><span><strong>게스트가 있나요?</strong><small>이름과 임시 능력치를 입력해 바로 편성할 수 있어요.</small></span></button> : <div className="guest-list">{guests.map((guest) => <div className="guest-row" key={guest.id}><span className="jersey-badge jersey-badge--guest">G</span><div><strong>{guest.name}</strong><small>종합 {overallScore(guest).toFixed(1)} · 게스트</small></div><button className="icon-button icon-button--danger" onClick={() => props.onRemoveGuest(guest.id)} aria-label={`${guest.name} 삭제`}><Trash2 size={17} /></button></div>)}</div>}
    </section>
    {assignments.length > 0 && <SavedTeamPreview assignments={assignments} teamCount={draft.options.teamCount} isSaved={draft.status === 'confirmed'} onViewTeams={props.onViewTeams} />}
    <div className="sticky-action"><div><span>현재 참석</span><strong>{attendingCount}명</strong></div><button className="button button--primary button--large" onClick={props.onContinue} disabled={attendingCount < 4}>팀 편성으로 <ArrowRight size={18} /></button></div>
  </>
}

function SavedTeamPreview({ assignments, teamCount, isSaved, onViewTeams }: { assignments: TeamAssignment[]; teamCount: 2 | 3; isSaved: boolean; onViewTeams: () => void }) {
  return <section className="saved-team-preview">
    <div className="section-heading"><div><p className="eyebrow">{isSaved ? 'SAVED TEAMS' : 'TEAM PREVIEW'}</p><h2>{isSaved ? '저장된 팀 편성' : '편성 미리보기'} <span>{assignments.length}명</span></h2></div><button className="button button--small button--outline" onClick={onViewTeams}>{isSaved ? '상세 보기·수정' : '팀 편성 계속'} <ArrowRight size={15} /></button></div>
    <div className={`saved-team-grid saved-team-grid--${teamCount}`}>
      {Array.from({ length: teamCount }, (_, index) => {
        const team = index + 1
        const members = assignments.filter((assignment) => assignment.team === team).sort((left, right) => left.rotationOrder - right.rotationOrder)
        return <article className={`saved-team saved-team--${team}`} key={team}><header><span>TEAM {team}</span><strong>{TEAM_NAMES[index]}</strong><em>{members.length}명</em></header><div>{members.map(({ participant, rotationOrder }) => <span key={participant.id}><b>{String.fromCharCode(64 + team)}{rotationOrder}</b>{participant.name}</span>)}</div></article>
      })}
    </div>
  </section>
}

interface TeamsViewProps {
  participants: Participant[]
  assignments: TeamAssignment[]
  draft: MatchDraft
  saving: boolean
  deleting: boolean
  onDraftChange: (draft: MatchDraft) => void
  onGenerate: () => void
  onChangeTeam: (id: string, team: number) => void
  onChangeRotationOrder: (id: string, rotationOrder: number) => void
  onResetManual: () => void
  onConfirm: () => void
  onDelete: () => void
  onBack: () => void
}

function TeamsView(props: TeamsViewProps) {
  const { draft, assignments, participants } = props
  const metrics = getTeamMetrics(assignments, draft.options.teamCount)
  const manualCount = assignments.filter(({ team, autoTeam }) => team !== autoTeam).length
  const setOptions = (options: MatchDraft['options']) => props.onDraftChange({ ...draft, options, status: 'draft' })
  return <>
    <PageHeader eyebrow="TEAM BALANCER" title="팀 편성" description="편성 결과를 확인하고 팀과 로테이션 순서를 조정하세요." />
    <section className="control-panel">
      <div className="control-group"><span className="control-label">팀 개수</span><div className="segmented">{([2, 3] as const).map((count) => <button className={draft.options.teamCount === count ? 'active' : ''} key={count} onClick={() => setOptions({ ...draft.options, teamCount: count })}>{count}팀</button>)}</div></div>
      <div className="control-group control-group--wide"><span className="control-label">편성 기준</span><div className="mode-options"><button className={draft.options.balanceMode === 'overall' ? 'mode-card mode-card--active' : 'mode-card'} onClick={() => setOptions({ ...draft.options, balanceMode: 'overall' })}><ShieldCheck size={19} /><span><strong>종합 균형</strong><small>5개 능력치 전체</small></span></button><button className={draft.options.balanceMode === 'specific' ? 'mode-card mode-card--active' : 'mode-card'} onClick={() => setOptions({ ...draft.options, balanceMode: 'specific' })}><Sparkles size={19} /><span><strong>특정 능력</strong><small>선택 능력치 우선</small></span></button><button className={draft.options.balanceMode === 'random' ? 'mode-card mode-card--active' : 'mode-card'} onClick={() => setOptions({ ...draft.options, balanceMode: 'random' })}><Dices size={19} /><span><strong>랜덤</strong><small>순수 무작위</small></span></button></div></div>
      {draft.options.balanceMode === 'specific' && <div className="control-group control-group--full"><span className="control-label">우선 능력치</span><div className="ability-pills">{ABILITIES.map((ability) => <button className={draft.options.specificAbility === ability ? 'active' : ''} key={ability} onClick={() => setOptions({ ...draft.options, specificAbility: ability })}>{ABILITY_LABELS[ability]}</button>)}</div></div>}
      <div className="seed-control"><span><small>재편성 번호</small><strong>#{draft.options.seed}</strong></span><button className="icon-button" onClick={() => setOptions({ ...draft.options, seed: Math.max(1, draft.options.seed - 1) })}>−</button><button className="icon-button" onClick={() => setOptions({ ...draft.options, seed: draft.options.seed + 1 })}>＋</button><button className="button button--primary" onClick={props.onGenerate}><RefreshCw size={17} /> {assignments.length ? '다시 편성' : '자동 편성'}</button></div>
    </section>

    {participants.length < draft.options.teamCount * 2 ? <div className="empty-state"><Users size={32} /><h2>참석 인원이 부족해요</h2><p>{draft.options.teamCount}팀은 최소 {draft.options.teamCount * 2}명이 필요합니다. 현재 {participants.length}명이 선택됐어요.</p><button className="button button--outline" onClick={props.onBack}>참석자 선택으로</button></div> : assignments.length === 0 ? <div className="empty-state empty-state--pitch"><Dices size={34} /><h2>편성 준비 완료</h2><p>{participants.length}명을 {draft.options.teamCount}개 팀으로 나눕니다.<br />위 옵션을 확인하고 자동 편성을 눌러주세요.</p><button className="button button--primary" onClick={props.onGenerate}><Sparkles size={17} /> 자동 편성 시작</button></div> : <>
      <div className="result-heading"><div><p className="eyebrow">BALANCED RESULT</p><h2>편성 결과 <span>{participants.length}명</span></h2></div>{manualCount > 0 && <button className="button button--small button--ghost" onClick={props.onResetManual}><RotateCcw size={15} /> 수동 조정 {manualCount}건 취소</button>}</div>
      <section className={`teams-grid teams-grid--${draft.options.teamCount}`}>{metrics.map((metric, index) => {
        const teamAssignments = assignments.filter(({ team }) => team === metric.team).sort((left, right) => left.rotationOrder - right.rotationOrder)
        return <article className={`team-card team-card--${index + 1}`} key={metric.team}>
          <header className="team-card__header"><div><span>TEAM {metric.team}</span><h3>{TEAM_NAMES[index]}</h3></div><div className="team-score"><small>팀 종합</small><strong>{metric.overall.toFixed(2)}</strong></div></header>
          <div className="metric-strip">{ABILITIES.map((ability) => <span key={ability}><small>{ABILITY_LABELS[ability]}</small><strong>{metric.averages[ability].toFixed(1)}</strong></span>)}</div>
          <div className="team-roster">{teamAssignments.map(({ participant, autoTeam, team, rotationOrder }) => <div className={team !== autoTeam ? 'team-player team-player--manual' : 'team-player'} key={participant.id}><span className="rotation-badge">{String.fromCharCode(64 + team)}{rotationOrder}</span><div className="team-player__info"><strong>{participant.name}{isGuest(participant) && <em>GUEST</em>}</strong><small>{participant.jersey_number !== null ? `등번호 ${participant.jersey_number} · ` : ''}종합 {overallScore(participant).toFixed(1)}{team !== autoTeam && ' · 수동 이동'}</small></div><div className="assignment-controls"><label aria-label={`${participant.name} 팀 변경`}><span>팀</span><select value={team} onChange={(event) => props.onChangeTeam(participant.id, Number(event.target.value))}>{Array.from({ length: draft.options.teamCount }, (_, teamIndex) => <option value={teamIndex + 1} key={teamIndex + 1}>{String.fromCharCode(65 + teamIndex)}</option>)}</select></label><label aria-label={`${participant.name} 로테이션 순서 변경`}><span>순서</span><select value={rotationOrder} onChange={(event) => props.onChangeRotationOrder(participant.id, Number(event.target.value))}>{teamAssignments.map((_, orderIndex) => <option value={orderIndex + 1} key={orderIndex + 1}>{orderIndex + 1}</option>)}</select></label></div></div>)}</div>
          <footer>{metric.size} PLAYERS</footer>
        </article>
      })}</section>
      <section className="comparison-card"><div className="comparison-card__heading"><div><p className="eyebrow">TEAM AVERAGE</p><h2>팀 평균 비교</h2></div><span>차이가 작을수록 균형적인 편성이에요</span></div><div className="comparison-table"><div className="comparison-row comparison-row--head"><span>능력치</span>{metrics.map((metric) => <strong key={metric.team}>TEAM {metric.team}</strong>)}<em>최대 차이</em></div>{ABILITIES.map((ability) => { const values = metrics.map(({ averages }) => averages[ability]); const spread = Math.max(...values) - Math.min(...values); return <div className="comparison-row" key={ability}><span>{ABILITY_LABELS[ability]}</span>{values.map((value, index) => <strong key={metrics[index].team}>{value.toFixed(2)}</strong>)}<em className={spread <= 0.35 ? 'spread-good' : spread <= 0.7 ? 'spread-mid' : 'spread-high'}>{spread.toFixed(2)}</em></div>})}</div></section>
      <div className="confirm-bar"><div><ShieldCheck size={22} /><span><strong>{draft.status === 'confirmed' ? '편성 확정 완료' : '수동 조정 후 바로 확정할 수 있어요'}</strong><small>확정하면 현재 명단과 팀 정보가 저장됩니다.</small></span></div><span className="confirm-actions">{draft.id && <button className="button button--danger button--large" onClick={props.onDelete} disabled={props.deleting || props.saving}>{props.deleting ? <><LoaderCircle className="spin" size={18} /> 삭제 중…</> : <><Trash2 size={18} /> 저장된 팀 삭제</>}</button>}<button className="button button--primary button--large" onClick={props.onConfirm} disabled={props.saving || props.deleting}>{props.saving ? <><LoaderCircle className="spin" size={18} /> 저장 중…</> : <><Check size={18} /> {draft.status === 'confirmed' ? '변경사항 저장' : '이 편성으로 확정'}</>}</button></span></div>
    </>}
  </>
}

interface PlayersViewProps {
  players: Player[]
  loading: boolean
  error: string | null
  onReload: () => Promise<void>
  isAdmin: boolean
  onRequestAdmin: () => void
  onAdd: () => void
  onEdit: (player: Player) => void
  onArchive: (player: Player) => Promise<void>
  onRestore: (player: Player) => Promise<void>
}

function PlayersView(props: PlayersViewProps) {
  const [query, setQuery] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const filtered = props.players.filter((player) => (showInactive || player.is_active) && player.name.toLowerCase().includes(query.trim().toLowerCase()))
  const activeCount = props.players.filter(({ is_active }) => is_active).length
  const teamAverage = activeCount ? props.players.filter(({ is_active }) => is_active).reduce((sum, player) => sum + overallScore(player), 0) / activeCount : 0
  return <>
    <PageHeader eyebrow="PLAYER DATABASE" title="선수 DB" description="정규 멤버의 등번호와 5개 능력치를 관리합니다." action={<div className="header-actions">{!props.isAdmin && <button className="button button--outline" onClick={props.onRequestAdmin}><LockKeyhole size={16} /> 관리자</button>}<button className="button button--primary" onClick={props.onAdd}><Plus size={17} /> 새 선수</button></div>} />
    <div className="stat-grid"><article><span className="stat-icon"><Users size={21} /></span><div><small>활성 선수</small><strong>{activeCount}<em>명</em></strong></div></article><article><span className="stat-icon stat-icon--orange"><Sparkles size={21} /></span><div><small>평균 종합</small><strong>{teamAverage.toFixed(2)}</strong></div></article><article><span className="stat-icon stat-icon--navy"><Trophy size={21} /></span><div><small>등록 등번호</small><strong>{props.players.filter(({ is_active, jersey_number }) => is_active && jersey_number !== null).length}<em>개</em></strong></div></article></div>
    <div className="toolbar"><label className="search-field"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="선수 이름 검색" /></label><label className="switch"><input type="checkbox" checked={showInactive} onChange={(event) => setShowInactive(event.target.checked)} /><span /> 비활성 포함</label></div>
    {props.loading ? <LoadingState /> : props.error ? <ErrorState message={props.error} onReload={props.onReload} /> : <div className="player-database">{filtered.map((player) => <article className={!player.is_active ? 'database-card database-card--inactive' : 'database-card'} key={player.id}><header><span className="jersey-large">{player.jersey_number ?? '–'}</span><div><h3>{player.name}</h3><p>{player.is_active ? 'ACTIVE PLAYER' : 'INACTIVE'}</p></div><span className="overall-badge"><small>종합</small><strong>{overallScore(player).toFixed(1)}</strong></span></header><AbilityBars participant={player} /><footer><button onClick={() => props.onEdit(player)}><Pencil size={15} /> 수정</button>{player.is_active ? <button className="danger-link" onClick={() => void props.onArchive(player)}><Trash2 size={15} /> 비활성화</button> : <button onClick={() => void props.onRestore(player)}><RotateCcw size={15} /> 활성화</button>}</footer></article>)}</div>}
    {!props.loading && !props.error && filtered.length === 0 && <div className="empty-state"><Search size={30} /><h2>검색 결과가 없습니다</h2><p>다른 이름으로 검색해보세요.</p></div>}
  </>
}

function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <header className="page-header"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div>{action}</header>
}

function LoadingState() {
  return <div className="loading-state"><LoaderCircle className="spin" size={28} /><span>선수 명단을 불러오는 중…</span></div>
}

function ErrorState({ message, onReload }: { message: string; onReload: () => Promise<void> }) {
  return <div className="error-state"><CircleAlert size={28} /><div><strong>데이터를 불러오지 못했습니다</strong><p>{message}</p></div><button className="button button--outline" onClick={() => void onReload()}>다시 시도</button></div>
}

export default App
