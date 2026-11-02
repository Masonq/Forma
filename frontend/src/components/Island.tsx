import { useEffect, useRef, useState } from 'react'
import { Icon } from './Icon'
import { navigate } from './ui'
import { fmtClock } from '../lib/format'
import { useT } from '../lib/i18n'
import { activeWorkout, useStore } from '../lib/store'
import { exById } from '../lib/training'
import * as W from '../lib/workout'

// «Остров» идущей тренировки: виден на любом экране, раскрывается в мини-панель
export function WorkoutIsland() {
  const { t, l, lang } = useT()
  const s = useStore()
  const w = activeWorkout(s)
  const [open, setOpen] = useState(false)
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(i) }, [])
  const fired = useRef(0)
  // Отдых закончился, пока ты на другом экране: тот же сигнал, что и на экране тренировки
  useEffect(() => {
    const r = s.rest
    if (!r || now < r.endsAt || fired.current === r.endsAt) return
    fired.current = r.endsAt
    if (s.profile.sound) W.beep()
    s.showToast(t('wo_rest_done'))
    setOpen(true)
  }, [now, s.rest])
  if (!w) return null
  const cur = W.current(w)
  const rest = s.rest && s.rest.endsAt > now ? Math.ceil((s.rest.endsAt - now) / 1000) : 0
  const ex = cur ? exById(cur.item.exerciseId, s.custom) : undefined
  const work = cur ? cur.item.sets.filter((x) => x.kind !== 'warmup') : []
  const idx = cur ? work.findIndex((x) => x.id === cur.set.id) + 1 : 0
  const elapsed = fmtClock(Math.floor((now - w.startedAt) / 1000))
  const needsInput = !!(cur && ex && ((ex.mode === 'wr' && !cur.set.weight) || ex.mode === 't'))

  const mark = () => {
    if (!cur) return
    W.unlockAudio()
    if (needsInput) { navigate('/workout'); return }
    W.logSet(cur.item.id, cur.set.id)
  }

  return (
    <div className={`island ${open ? 'open' : ''} ${rest ? 'resting' : ''}`} role="region" aria-label={t('isl_label')}>
      <button className="isl-bar" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="isl-dot" aria-hidden="true" />
        <span className="isl-t ellipsis">{rest ? t('wo_rest') : ex ? l(ex.name) : t('wo_all_done')}</span>
        <span className="isl-v num">{rest ? fmtClock(rest) : idx ? `${idx}/${work.length}` : elapsed}</span>
        <Icon name="chevD" size={16} className="isl-chev" style={{ transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>
      {open && (
        <div className="isl-panel">
          <div className="isl-row">
            <div className="min0">
              <div className="small muted">{rest ? t('isl_next') : t('isl_now')}</div>
              <div className="isl-ex ellipsis">{ex ? l(ex.name) : t('wo_all_done')}</div>
              {cur && <div className="isl-set num">{W.setLabel(cur.item, cur.set, lang, s.profile.units)}</div>}
            </div>
            <div className="isl-time num"><small>{t('isl_elapsed')}</small>{elapsed}</div>
          </div>
          {rest > 0 && (
            <div className="isl-rest">
              <button className="adj num" onClick={() => W.adjustRest(-15)}>−15 с</button>
              <div className="rest-progress grow"><i style={{ width: `${Math.max(0, Math.min(100, (rest / (s.rest!.total || 1)) * 100))}%` }} /></div>
              <button className="adj num" onClick={() => W.adjustRest(15)}>+15 с</button>
            </div>
          )}
          <div className="isl-actions">
            {cur && !rest && <button className="btn primary" onClick={mark}><Icon name="check" size={20} stroke={2.6} />{needsInput ? t('isl_enter') : t('wo_mark')}</button>}
            {rest > 0 && <button className="btn" onClick={() => W.stopRest()}>{t('isl_skip')}</button>}
            <button className="btn" onClick={() => { setOpen(false); navigate('/workout') }}>{t('isl_open')}</button>
          </div>
        </div>
      )}
    </div>
  )
}
