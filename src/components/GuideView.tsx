import {
  ArrowRight,
  CalendarDays,
  Check,
  Database,
  Dices,
  Info,
  KeyRound,
  ListOrdered,
  LockKeyhole,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRoundPlus,
  Users,
} from 'lucide-react'

interface GuideViewProps {
  isAdmin: boolean
  onStart: () => void
  onOpenPlayers: () => void
  onRequestAdmin: () => void
}

const quickSteps = [
  {
    icon: CalendarDays,
    title: '경기 날짜 선택',
    description: '이번 주 탭에서 경기 날짜를 고릅니다. 이미 저장된 날짜라면 참석자와 팀이 자동으로 나타납니다.',
  },
  {
    icon: UserRoundPlus,
    title: '참석자·게스트 등록',
    description: '정규 멤버를 누르고, 필요한 경우 게스트 이름과 임시 능력치를 추가합니다.',
  },
  {
    icon: Dices,
    title: '팀 자동 편성',
    description: '팀 개수와 편성 기준을 정한 다음 자동 편성을 실행합니다. 재편성 번호로 다른 조합도 만들 수 있습니다.',
  },
  {
    icon: Save,
    title: '순서 조정 후 저장',
    description: '팀과 A1·B1 같은 로테이션 순서를 확인하고 관리자가 최종 편성을 저장합니다.',
  },
]

const permissions = [
  ['저장된 경기 조회', true, true],
  ['참석자·게스트 선택', true, true],
  ['자동 편성·결과 미리보기', true, true],
  ['팀 편성 저장·삭제', false, true],
  ['선수 등록·능력치 수정', false, true],
] as const

const balanceModes = [
  { icon: ShieldCheck, title: '종합 균형', description: '수비·패스·슈팅·컨트롤·활동량을 함께 비교해 팀 차이를 줄입니다.' },
  { icon: Sparkles, title: '특정 능력', description: '선택한 능력치를 더 중요하게 반영하면서 전체 균형도 함께 맞춥니다.' },
  { icon: Dices, title: '랜덤', description: '능력치 계산 없이 참석자를 무작위로 나눕니다.' },
]

export function GuideView({ isAdmin, onStart, onOpenPlayers, onRequestAdmin }: GuideViewProps) {
  return <>
    <header className="guide-hero">
      <div className="guide-hero__copy">
        <p className="eyebrow">GFC USER GUIDE</p>
        <h1>처음이어도<br />한 경기이면 충분해요.</h1>
        <p>참석자 선택부터 균형 편성, 로테이션 저장까지 실제 사용 순서대로 정리했습니다.</p>
        <div className="guide-hero__actions">
          <button className="button button--primary button--large" onClick={onStart}>이번 주 시작하기 <ArrowRight size={18} /></button>
          {!isAdmin && <button className="button button--outline button--large" onClick={onRequestAdmin}><LockKeyhole size={17} /> 관리자 모드</button>}
        </div>
      </div>
      <div className="guide-hero__board" aria-label="앱 사용 흐름 요약">
        <span className="guide-board__tag">MATCH DAY FLOW</span>
        <div><strong>01</strong><span>참석 체크</span></div>
        <i />
        <div><strong>02</strong><span>균형 편성</span></div>
        <i />
        <div><strong>03</strong><span>순서 저장</span></div>
      </div>
    </header>

    <section className="guide-section">
      <div className="guide-heading"><div><p className="eyebrow">QUICK START</p><h2>한 경기 만드는 순서</h2></div><span>위에서 아래로 따라 하면 됩니다</span></div>
      <div className="guide-steps">
        {quickSteps.map(({ icon: Icon, title, description }, index) => <article key={title}>
          <div className="guide-step__top"><span className="guide-step__number">0{index + 1}</span><span className="guide-step__icon"><Icon size={20} /></span></div>
          <h3>{title}</h3><p>{description}</p>
        </article>)}
      </div>
      <aside className="guide-notice"><Info size={18} /><p><strong>저장 전 날짜를 바꾸면 현재 작업은 초기화됩니다.</strong> 최종 편성은 관리자 모드에서 저장한 뒤 날짜를 이동하세요.</p></aside>
    </section>

    <section className="guide-section guide-section--split">
      <article className="guide-panel">
        <div className="guide-panel__title"><span className="guide-panel__icon"><Users size={21} /></span><div><p className="eyebrow">ACCESS</p><h2>보기 모드와 관리자 모드</h2></div></div>
        <p className="guide-panel__lead">누구나 명단을 확인하고 편성을 시험할 수 있지만, 실제 DB 변경은 관리자만 할 수 있습니다.</p>
        <div className="permission-table">
          <div className="permission-row permission-row--head"><span>기능</span><strong>보기</strong><strong>관리자</strong></div>
          {permissions.map(([label, viewer, admin]) => <div className="permission-row" key={label}><span>{label}</span><strong className={viewer ? 'allowed' : 'denied'}>{viewer ? <Check size={15} /> : '–'}</strong><strong className={admin ? 'allowed' : 'denied'}>{admin ? <Check size={15} /> : '–'}</strong></div>)}
        </div>
        <div className={isAdmin ? 'admin-status admin-status--active' : 'admin-status'}><KeyRound size={17} /><span><strong>{isAdmin ? '현재 관리자 모드입니다' : 'PIN은 브라우저에 저장되지 않습니다'}</strong><small>{isAdmin ? '선수 정보와 팀 편성을 저장할 수 있어요.' : '새로고침하면 다시 입력해야 하며, PIN은 웹 담당자에게 문의해 주세요.'}</small></span></div>
      </article>

      <article className="guide-panel">
        <div className="guide-panel__title"><span className="guide-panel__icon guide-panel__icon--orange"><ListOrdered size={21} /></span><div><p className="eyebrow">ROTATION</p><h2>A1·B1은 로테이션 순서</h2></div></div>
        <p className="guide-panel__lead">앞의 영문은 팀, 숫자는 경기에서 사용할 순번입니다. 능력치 순위가 아닙니다.</p>
        <div className="rotation-example">
          <div><span>A1</span><strong>첫 번째</strong></div><ArrowRight size={16} /><div><span>A2</span><strong>두 번째</strong></div><ArrowRight size={16} /><div><span>A3</span><strong>세 번째</strong></div>
        </div>
        <ul className="guide-list">
          <li><strong>순서 변경</strong><span>선수 오른쪽의 순서 선택창을 바꾸면 나머지 번호가 자동으로 당겨지거나 밀립니다.</span></li>
          <li><strong>팀 변경</strong><span>다른 팀으로 옮긴 선수는 이동한 팀의 마지막 순번에 들어갑니다.</span></li>
          <li><strong>저장</strong><span>변경사항 저장을 눌러야 새로고침 후에도 순서가 유지됩니다.</span></li>
        </ul>
      </article>
    </section>

    <section className="guide-section">
      <div className="guide-heading"><div><p className="eyebrow">BALANCE OPTIONS</p><h2>편성 기준 이해하기</h2></div><span>경기 성격에 맞게 선택하세요</span></div>
      <div className="balance-guide">
        {balanceModes.map(({ icon: Icon, title, description }) => <article key={title}><span><Icon size={20} /></span><div><h3>{title}</h3><p>{description}</p></div></article>)}
      </div>
      <aside className="guide-tip"><Dices size={19} /><div><strong>재편성 번호는 조합 번호입니다.</strong><p>참석자와 옵션이 같을 때 같은 번호를 선택하면 같은 결과를 다시 만들 수 있습니다.</p></div></aside>
    </section>

    <section className="guide-section guide-section--split">
      <article className="guide-panel">
        <div className="guide-panel__title"><span className="guide-panel__icon"><Database size={21} /></span><div><p className="eyebrow">PLAYER DB</p><h2>선수 정보 관리</h2></div></div>
        <ol className="guide-ordered">
          <li><span>1</span><p><strong>선수 DB 열기</strong>현재 멤버와 종합 능력치를 조회합니다.</p></li>
          <li><span>2</span><p><strong>관리자 모드 시작</strong>새 선수 등록이나 기존 선수 수정을 누르면 PIN 입력창이 열립니다.</p></li>
          <li><span>3</span><p><strong>능력치 입력</strong>수비·패스·슈팅·컨트롤·활동량을 1.0~5.0 사이에서 0.1 단위로 조정합니다.</p></li>
          <li><span>4</span><p><strong>비활성화 활용</strong>탈퇴·장기 불참 선수는 삭제 대신 비활성화해 기록을 유지합니다.</p></li>
        </ol>
        <button className="button button--outline" onClick={onOpenPlayers}>선수 DB 열기 <ArrowRight size={16} /></button>
      </article>

      <article className="guide-panel guide-panel--danger">
        <div className="guide-panel__title"><span className="guide-panel__icon guide-panel__icon--danger"><Trash2 size={21} /></span><div><p className="eyebrow">SAVED MATCH</p><h2>저장 경기 수정·삭제</h2></div></div>
        <ol className="guide-ordered">
          <li><span>1</span><p><strong>날짜로 불러오기</strong>이번 주 탭에서 저장 당시 경기 날짜를 선택합니다.</p></li>
          <li><span>2</span><p><strong>상세 보기·수정</strong>저장된 팀 아래 버튼을 눌러 팀과 로테이션 순서를 변경합니다.</p></li>
          <li><span>3</span><p><strong>변경사항 저장</strong>관리자 모드에서 저장하면 같은 날짜의 기존 내용이 업데이트됩니다.</p></li>
          <li><span>!</span><p><strong>삭제는 복구할 수 없습니다</strong>저장된 팀 삭제는 해당 날짜의 참석자·게스트·팀 편성을 함께 지웁니다.</p></li>
        </ol>
      </article>
    </section>

    <section className="guide-finish">
      <div><p className="eyebrow">READY TO PLAY</p><h2>이제 이번 주 명단을 만들어볼까요?</h2><p>일반 멤버가 초안을 만들고, 마지막 저장만 관리자가 맡아도 됩니다.</p></div>
      <button className="button button--primary button--large" onClick={onStart}>이번 주로 이동 <ArrowRight size={18} /></button>
    </section>
  </>
}
