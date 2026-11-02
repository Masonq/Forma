import { Icon } from '../components/Icon'
import { ParticleText } from '../components/Particles'
import { navigate } from '../components/ui'
import { PASSES_TO_UNLOCK } from '../data/skills'
import { fmtDuration, fmtNum, fmtW, toUnit } from '../lib/format'
import { useT } from '../lib/i18n'
import { useStore } from '../lib/store'
import { exById } from '../lib/training'

function Hex({ color }: { color: string }) {
  return (
    <svg className="hex" width="120" height="132" viewBox="0 0 120 132" aria-hidden="true">
      <path d="M60 4l50 28v68l-50 28-50-28V32z" fill={color} opacity=".18" />
      <path d="M60 16l40 22.5v55L60 116 20 93.5v-55z" fill={color} />
      <path d="M60 40v46M42 58l18-18 18 18" stroke="#fff" strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function Summary({ id }: { id: string }) {
  const { t, l, lang } = useT()
  const s = useStore()
  const w = s.workouts.find((x) => x.id === id)
  if (!w || !w.summary) {
    return <div className="page no-tabs"><div className="empty">{t('pr_empty')}<button className="btn primary" onClick={() => navigate('/', true)}>{t('done')}</button></div></div>
  }
  const sm = w.summary
  const units = s.profile.units
  const top = sm.records[0]
  const topEx = top ? exById(top.exerciseId, s.custom) : undefined
  const burstText = top
    ? (top.kind === 'weight' && top.prev ? `+${fmtNum(toUnit(top.value - top.prev, units), lang, 2)} ${t(units)}` : top.kind === 'reps' && top.prev ? `+${top.value - top.prev}` : t('sum_record_short'))
    : t('sum_step_short')
  const recVal = (kind: string, v: number) =>
    kind === 'weight' || kind === 'e1rm' || kind === 'volume' ? fmtW(v, units, lang) : kind === 'time' ? `${v} ${t('sec')}` : `${v} ${t('reps')}`

  return (
    <div className="page no-tabs narrow">
      <div className="topbar">
        <button className="iconbtn ghost" onClick={() => navigate('/', true)} aria-label={t('close')}><Icon name="close" /></button>
        <div className="title">{t('sum_title')}</div>
        <span style={{ width: 44 }} />
      </div>

      {top || sm.stepUps.length ? (
        <div style={{ textAlign: 'center' }}>
          <div className="record-fx">
            <ParticleText text={burstText} height={140} />
            <div className="record-fx-hex"><Hex color="var(--green)" /></div>
          </div>
          <h1 className="h1" style={{ fontSize: 30 }}>{top ? t('sum_record') : t('sum_step_up')}</h1>
          {top && topEx && (
            <>
              <div className="disp num" style={{ fontSize: 28, fontWeight: 600, marginTop: 8 }}>{recVal(top.kind, top.value)}</div>
              <div className="muted" style={{ marginTop: 6 }}>{l(topEx.name)}</div>
            </>
          )}
          {!top && sm.stepUps[0] && <div className="muted" style={{ marginTop: 8 }}>{l(exById(sm.stepUps[0].to)!.name)}</div>}
        </div>
      ) : (
        <div style={{ textAlign: 'center', margin: '12px 0 4px' }}>
          <div style={{ display: 'grid', placeItems: 'center', color: 'var(--green)' }}><Icon name="check" size={56} stroke={2.4} /></div>
          <h1 className="h1" style={{ fontSize: 30 }}>{t('sum_title')}</h1>
        </div>
      )}

      <div className="list" style={{ marginTop: 24 }}>
        <div className="li"><div className="li-ic"><Icon name="timer" size={20} /></div><div className="li-main"><div className="li-title num">{fmtDuration((w.endedAt ?? w.startedAt) - w.startedAt, lang)}</div><div className="li-sub">{t('sum_duration')}</div></div></div>
        {sm.volume > 0 && <div className="li"><div className="li-ic"><Icon name="barbell" size={20} /></div><div className="li-main"><div className="li-title num">{fmtNum(toUnit(sm.volume, units), lang, 0)} {t(units)}</div><div className="li-sub">{t('sum_volume')}</div></div></div>}
        <div className="li"><div className="li-ic"><Icon name="grid" size={20} /></div><div className="li-main"><div className="li-title num">{sm.sets}</div><div className="li-sub">{t('sum_sets')}</div></div></div>
      </div>

      {sm.records.length > 0 && (
        <div className="section">
          <div className="section-head"><div className="h3">{t('sum_records')}</div></div>
          <div className="list">
            {sm.records.map((r, i) => {
              const ex = exById(r.exerciseId, s.custom)
              return (
                <div className="li" key={i}>
                  <div className="li-ic" style={{ color: 'var(--green)' }}><Icon name="trophy" size={20} /></div>
                  <div className="li-main"><div className="li-title">{ex ? l(ex.name) : ''}</div><div className="li-sub">{t('rec_' + r.kind)}</div></div>
                  <div className="li-val num" style={{ color: 'var(--text)' }}>{recVal(r.kind, r.value)}{r.prev ? <div className="small faint">{recVal(r.kind, r.prev)}</div> : null}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {(sm.stepUps.length > 0 || sm.stepProgress.length > 0) && (
        <div className="section">
          <div className="section-head"><div className="h3">{t('pf_skills')}</div><button className="link" onClick={() => navigate('/skills')}>{t('prog_open')}<Icon name="chevR" size={16} /></button></div>
          <div className="list">
            {sm.stepUps.map((u, i) => (
              <div className="li" key={'u' + i}><div className="li-ic" style={{ color: 'var(--accent-text)' }}><Icon name="layers" size={20} /></div><div className="li-main"><div className="li-title">{l(exById(u.to)!.name)}</div><div className="li-sub">{t('sum_step_up')}</div></div></div>
            ))}
            {sm.stepProgress.map((u, i) => (
              <div className="li" key={'p' + i}><div className="li-ic"><Icon name="layers" size={20} /></div><div className="li-main"><div className="li-sub" style={{ marginTop: 0, color: 'var(--text)', fontSize: 15 }}>{t('sum_step_progress', { ex: l(exById(u.ex)!.name), a: u.passes, b: PASSES_TO_UNLOCK })}</div></div></div>
            ))}
          </div>
        </div>
      )}

      <div className="stack" style={{ marginTop: 26 }}>
        <button className="btn primary" onClick={() => navigate('/', true)}>{t('sum_great')}</button>
      </div>
    </div>
  )
}
