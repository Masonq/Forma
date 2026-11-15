import { useState } from 'react'
import type { Lang } from '../data/exercises'
import { tr } from '../lib/i18n'
import { login, recover } from '../lib/sync'
import { Icon } from './Icon'
import { Sheet } from './ui'

// Вход в существующий аккаунт: по почте или по ключу восстановления.
export function AccountSheet({ open, onClose, lang }: { open: boolean; onClose: () => void; lang: Lang }) {
  const t = (k: string) => tr(lang, k)
  const [tab, setTab] = useState<'email' | 'key'>('email')
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [key, setKey] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const doLogin = async () => {
    setBusy(true); setErr('')
    const e = await login(email.trim(), pass)
    setBusy(false)
    if (!e) { onClose(); return }
    setErr(t(e.includes('401') ? 'ac_err_login' : 'ac_err_net'))
  }
  const doKey = async () => {
    setBusy(true); setErr('')
    const ok = await recover(key)
    setBusy(false)
    if (ok) onClose(); else setErr(t('pf_key_wrong'))
  }

  return (
    <Sheet open={open} onClose={onClose} title={t('ac_login')}>
      <p className="sub" style={{ marginTop: 0 }}>{t('ac_login_d')}</p>
      <div className="seg" style={{ marginTop: 12 }}>
        <button className={tab === 'email' ? 'on' : ''} onClick={() => { setTab('email'); setErr('') }}>{t('ac_or_email')}</button>
        <button className={tab === 'key' ? 'on' : ''} onClick={() => { setTab('key'); setErr('') }}>{t('ac_or_key')}</button>
      </div>
      {tab === 'email' ? (
        <>
          <input className="field" style={{ marginTop: 14 }} type="email" value={email} onChange={(e) => { setEmail(e.target.value); setErr('') }} placeholder={t('ac_email')} autoComplete="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} inputMode="email" />
          <input className="field" style={{ marginTop: 10 }} type="password" value={pass} onChange={(e) => { setPass(e.target.value); setErr('') }} placeholder={t('ac_password')} autoComplete="current-password" />
          {err && <div className="small" style={{ color: 'var(--red)', marginTop: 8 }}>{err}</div>}
          <button className="btn primary" style={{ marginTop: 14 }} disabled={busy || !email.includes('@') || pass.length < 8} onClick={doLogin}><Icon name="profile" size={20} />{t('ac_login')}</button>
        </>
      ) : (
        <>
          <input className="field" style={{ marginTop: 14, textTransform: 'uppercase', letterSpacing: '.06em' }} value={key} onChange={(e) => { setKey(e.target.value); setErr('') }} placeholder="FORMA-XXXX-XXXX-XXXX" autoCapitalize="characters" autoCorrect="off" spellCheck={false} />
          {err && <div className="small" style={{ color: 'var(--red)', marginTop: 8 }}>{err}</div>}
          <button className="btn primary" style={{ marginTop: 14 }} disabled={busy || key.trim().length < 10} onClick={doKey}><Icon name="key" size={20} />{t('ac_login')}</button>
        </>
      )}
    </Sheet>
  )
}
