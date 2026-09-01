import { useState } from 'react'
import { Eye, EyeOff, KeyRound, LoaderCircle, X } from 'lucide-react'

interface AdminLoginProps {
  onClose: () => void
  onUnlock: (pin: string) => Promise<boolean>
}

export function AdminLogin({ onClose, onUnlock }: AdminLoginProps) {
  const [pin, setPin] = useState('')
  const [visible, setVisible] = useState(false)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!pin.trim()) return
    setChecking(true)
    setError(null)
    try {
      const valid = await onUnlock(pin.trim())
      if (valid) onClose()
      else setError('관리자 PIN이 올바르지 않습니다.')
    } catch {
      setError('PIN을 확인하지 못했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="modal modal--admin" role="dialog" aria-modal="true" aria-label="관리자 잠금 해제" onMouseDown={(event) => event.stopPropagation()}>
        <header className="modal__header">
          <div className="title-with-icon"><span className="title-icon title-icon--green"><KeyRound size={20} /></span><div><p className="eyebrow">ADMIN MODE</p><h2>관리자 잠금 해제</h2></div></div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="닫기"><X size={20} /></button>
        </header>
        <form onSubmit={submit}>
          <p className="admin-help">선수 정보 수정과 편성 확정은 관리자만 가능합니다. PIN은 이 브라우저에 저장되지 않습니다.</p>
          <label className="pin-field">
            <span>관리자 PIN</span>
            <div>
              <input type={visible ? 'text' : 'password'} value={pin} onChange={(event) => setPin(event.target.value)} placeholder="PIN 입력" autoFocus autoComplete="off" />
              <button type="button" onClick={() => setVisible((current) => !current)} aria-label={visible ? 'PIN 숨기기' : 'PIN 보기'}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>
          </label>
          {error && <p className="form-error">{error}</p>}
          <footer className="modal__footer"><button className="button button--ghost" type="button" onClick={onClose}>취소</button><button className="button button--primary" type="submit" disabled={checking || !pin.trim()}>{checking ? <><LoaderCircle className="spin" size={17} /> 확인 중…</> : '관리자 모드 시작'}</button></footer>
        </form>
      </section>
    </div>
  )
}
