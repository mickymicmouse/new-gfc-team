import { ABILITIES, ABILITY_LABELS, type Participant } from '../types'

interface AbilityBarsProps {
  participant: Participant
  compact?: boolean
}

export function AbilityBars({ participant, compact = false }: AbilityBarsProps) {
  return (
    <div className={compact ? 'ability-grid ability-grid--compact' : 'ability-grid'}>
      {ABILITIES.map((ability) => (
        <div className="ability" key={ability}>
          <span className="ability__label">{ABILITY_LABELS[ability]}</span>
          <span className="ability__track" aria-label={`${ABILITY_LABELS[ability]} ${participant[ability]}점`}>
            <span style={{ width: `${participant[ability] * 20}%` }} />
          </span>
          <strong>{participant[ability]}</strong>
        </div>
      ))}
    </div>
  )
}
