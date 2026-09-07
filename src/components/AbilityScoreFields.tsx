import { useState } from 'react'
import {
  ABILITIES,
  ABILITY_LABELS,
  formatScore,
  type Ability,
  type AbilityScores,
} from '../types'

interface AbilityScoreFieldsProps {
  legend: string
  scores: AbilityScores
  onChange: (scores: AbilityScores) => void
}

const scoreDrafts = (scores: AbilityScores): Record<Ability, string> => ({
  defense: formatScore(scores.defense),
  passing: formatScore(scores.passing),
  shooting: formatScore(scores.shooting),
  control: formatScore(scores.control),
  activity: formatScore(scores.activity),
})

const normalizeScore = (value: number) =>
  Math.round(Math.min(5, Math.max(1, value)) * 100) / 100

export function AbilityScoreFields({ legend, scores, onChange }: AbilityScoreFieldsProps) {
  const [drafts, setDrafts] = useState(() => scoreDrafts(scores))

  const updateScore = (ability: Ability, value: number) => {
    const next = normalizeScore(value)
    onChange({ ...scores, [ability]: next })
    setDrafts((current) => ({ ...current, [ability]: formatScore(next) }))
  }

  const commitDraft = (ability: Ability) => {
    const parsed = Number(drafts[ability])
    if (!Number.isFinite(parsed)) {
      setDrafts((current) => ({ ...current, [ability]: formatScore(scores[ability]) }))
      return
    }
    updateScore(ability, parsed)
  }

  return (
    <fieldset className="score-fields">
      <legend>{legend}</legend>
      {ABILITIES.map((ability) => (
        <div className="score-field" key={ability}>
          <span>{ABILITY_LABELS[ability]}</span>
          <input
            type="range"
            min="1"
            max="5"
            step="0.01"
            value={scores[ability]}
            aria-label={`${ABILITY_LABELS[ability]} 슬라이더`}
            onChange={(event) => updateScore(ability, Number(event.target.value))}
          />
          <input
            className="score-number-input"
            type="number"
            inputMode="decimal"
            min="1"
            max="5"
            step="0.01"
            value={drafts[ability]}
            aria-label={`${ABILITY_LABELS[ability]} 숫자 입력`}
            onFocus={(event) => event.currentTarget.select()}
            onChange={(event) => setDrafts((current) => ({ ...current, [ability]: event.target.value }))}
            onBlur={() => commitDraft(ability)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                event.currentTarget.blur()
              }
            }}
          />
        </div>
      ))}
    </fieldset>
  )
}
