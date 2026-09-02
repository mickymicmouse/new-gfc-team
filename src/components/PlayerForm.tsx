import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import {
  ABILITIES,
  ABILITY_LABELS,
  type AbilityScores,
  type Player,
} from '../types'

export type PlayerFormValue = Omit<Player, 'id' | 'created_at' | 'updated_at'>

interface PlayerFormProps {
  player?: Player
  onClose: () => void
  onSubmit: (value: PlayerFormValue) => Promise<void>
}

const initialScores: AbilityScores = {
  defense: 3,
  passing: 3,
  shooting: 3,
  control: 3,
  activity: 3,
}

export function PlayerForm({ player, onClose, onSubmit }: PlayerFormProps) {
  const [name, setName] = useState(player?.name ?? '')
  const [jerseyNumber, setJerseyNumber] = useState(player?.jersey_number?.toString() ?? '')
  const [scores, setScores] = useState<AbilityScores>(player ?? initialScores)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [onClose])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      await onSubmit({
        name: name.trim(),
        jersey_number: jerseyNumber === '' ? null : Number(jerseyNumber),
        is_active: player?.is_active ?? true,
        ...scores,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal" role="dialog" aria-modal="true" aria-label="선수 정보" onMouseDown={(event) => event.stopPropagation()}>
        <header className="modal__header">
          <div>
            <p className="eyebrow">PLAYER DATABASE</p>
            <h2>{player ? '선수 정보 수정' : '새 선수 등록'}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="닫기"><X size={20} /></button>
        </header>

        <form onSubmit={submit}>
          <div className="form-row">
            <label>
              <span>이름</span>
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="선수 이름" autoFocus required />
            </label>
            <label className="jersey-input">
              <span>등번호</span>
              <input type="number" min="0" max="999" value={jerseyNumber} onChange={(event) => setJerseyNumber(event.target.value)} placeholder="-" />
            </label>
          </div>

          <fieldset className="score-fields">
            <legend>능력치</legend>
            {ABILITIES.map((ability) => (
              <label key={ability}>
                <span>{ABILITY_LABELS[ability]}</span>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="0.1"
                  value={scores[ability]}
                  onChange={(event) => setScores((current) => ({ ...current, [ability]: Number(event.target.value) }))}
                />
                <strong>{scores[ability].toFixed(1)}</strong>
              </label>
            ))}
          </fieldset>

          <footer className="modal__footer">
            <button className="button button--ghost" type="button" onClick={onClose}>취소</button>
            <button className="button button--primary" type="submit" disabled={saving || !name.trim()}>{saving ? '저장 중…' : '저장'}</button>
          </footer>
        </form>
      </section>
    </div>
  )
}
