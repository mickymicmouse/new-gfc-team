import { useState } from 'react'
import { UserRoundPlus, X } from 'lucide-react'
import { ABILITIES, ABILITY_LABELS, type AbilityScores, type Guest } from '../types'

interface GuestFormProps {
  onClose: () => void
  onSubmit: (guest: Guest) => void
}

export function GuestForm({ onClose, onSubmit }: GuestFormProps) {
  const [name, setName] = useState('')
  const [jerseyNumber, setJerseyNumber] = useState('')
  const [scores, setScores] = useState<AbilityScores>({ defense: 3, passing: 3, shooting: 3, control: 3, activity: 3 })

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return
    onSubmit({
      id: `guest-${crypto.randomUUID()}`,
      name: name.trim(),
      jersey_number: jerseyNumber === '' ? null : Number(jerseyNumber),
      isGuest: true,
      ...scores,
    })
    onClose()
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal" role="dialog" aria-modal="true" aria-label="게스트 추가" onMouseDown={(event) => event.stopPropagation()}>
        <header className="modal__header">
          <div className="title-with-icon"><span className="title-icon"><UserRoundPlus size={20} /></span><div><p className="eyebrow">ONE DAY PLAYER</p><h2>게스트 추가</h2></div></div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="닫기"><X size={20} /></button>
        </header>
        <form onSubmit={submit}>
          <div className="form-row">
            <label><span>이름</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="게스트 이름" autoFocus required /></label>
            <label className="jersey-input"><span>등번호</span><input type="number" min="0" max="999" value={jerseyNumber} onChange={(event) => setJerseyNumber(event.target.value)} placeholder="선택" /></label>
          </div>
          <fieldset className="score-fields">
            <legend>임시 능력치</legend>
            {ABILITIES.map((ability) => (
              <label key={ability}>
                <span>{ABILITY_LABELS[ability]}</span>
                <input type="range" min="1" max="5" value={scores[ability]} onChange={(event) => setScores((current) => ({ ...current, [ability]: Number(event.target.value) }))} />
                <strong>{scores[ability]}</strong>
              </label>
            ))}
          </fieldset>
          <footer className="modal__footer"><button className="button button--ghost" type="button" onClick={onClose}>취소</button><button className="button button--primary" type="submit" disabled={!name.trim()}>게스트 추가</button></footer>
        </form>
      </section>
    </div>
  )
}
