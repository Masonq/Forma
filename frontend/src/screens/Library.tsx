import { ExThumb } from '../components/Thumb'
import { exPhoto } from '../lib/media'
import { useMemo, useState } from 'react'
import { EXERCISES, type Muscle } from '../data/exercises'
import { BRANCHES, BRANCH_OF, EQUIPMENT } from '../data/skills'
import { Icon, PLACE_ICON } from '../components/Icon'
import { goBack, navigate } from '../components/ui'
import { fmtDate, fmtNum, fmtW, toUnit } from '../lib/format'
import { useT } from '../lib/i18n'
import { useStore } from '../lib/store'
import { availableAt, bestOf, exById, historyOf } from '../lib/training'

const GROUPS: { k: string; m: Muscle[] }[] = [
  { k: 'm_chest', m: ['chest'] }, { k: 'm_lats', m: ['lats', 'traps'] }, { k: 'm_shoulders', m: ['shoulders'] },
  { k: 'm_biceps', m: ['biceps', 'forearms'] }, { k: 'm_triceps', m: ['triceps'] }, { k: 'm_abs', m: ['abs', 'obliques'] },
  { k: 'm_quads', m: ['quads'] }, { k: 'm_glutes', m: ['glutes', 'hamstrings'] }, { k: 'm_calves', m: ['calves'] },
]

export default function Library() {
  const { t, l } = useT()
  const s = useStore()
  const [q, setQ] = useState('')
  const [g, setG] = useState<number | null>(null)
  const [placeId, setPlaceId] = useState<string | null>(null)
  const place = s.places.find((p) => p.id === placeId)
  const list = useMemo(() => {
    const qq = q.trim().toLowerCase()
    return EXERCISES.filter((e) => {
      if (place && !availableAt(e, place)) return false
      if (g !== null && !e.primary.some((m) => GROUPS[g].m.includes(m))) return false
      return !qq || e.name.some((n) => n.toLowerCase().includes(qq))
    }).sort((a, b) => l(a.name).localeCompare(l(b.name)))
  }, [q, g, placeId, s.profile.lang])

  return (
    <div className="page">
      <div className="topbar">
        <button className="iconbtn ghost" onClick={() => goBack('/progress')} aria-label={t('back')}><Icon name="back" /></button>
        <div className="title">{t('lib_title')}</div>
        <span style={{ width: 44 }} />
      </div>
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: 16, top: 17, color: 'var(--faint)' }}><Icon name="search" size={20} /></span>
        <input className="field" style={{ paddingLeft: 46 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('lib_search')} type="search" />
      </div>
      <div className="chips" style={{ marginTop: 12 }}>
        <button className={`chip ${placeId === null ? 'on' : ''}`} onClick={() => setPlaceId(null)}>{t('all')}</button>
        {s.places.map((p) => <button key={p.id} className={`chip ${placeId === p.id ? 'on' : ''}`} onClick={() => setPlaceId(p.id)}><Icon name={PLACE_ICON[p.kind]} size={16} />{p.name}</button>)}
      </div>
      <div className="chips" style={{ marginTop: 8 }}>
        {GROUPS.map((gr, i) => <button key={gr.k} className={`chip outline ${g === i ? 'on' : ''}`} onClick={() => setG(g === i ? null : i)}>{t(gr.k)}</button>)}
      </div>
      <div className="list" style={{ marginTop: 14 }}>
        {list.length === 0 && <div className="empty">{t('lib_none')}</div>}
        {list.map((e) => (
          <button key={e.id} className="li" onClick={() => navigate(`/exercise/${e.id}`)}>
            <ExThumb ex={e} />
            <div className="li-main">
              <div className="li-title">{l(e.name)}</div>
              <div className="li-sub">{e.primary.map((m) => t('m_' + m)).join(', ')}{e.equip.length === 0 ? `, ${t('lib_bodyweight').toLowerCase()}` : ''}</div>
            </div>
            <Icon name="chevR" className="chev" />
          </button>
        ))}
      </div>
    </div>
  )
}

export function ExerciseDetail({ id }: { id: string }) {
  const { t, l, lang } = useT()
  const s = useStore()
  const ex = exById(id, s.custom)
  if (!ex) return <div className="page"><div className="empty">{t('lib_none')}</div></div>
  const units = s.profile.units
  const hist = historyOf(ex.id, s.workouts).slice(0, 6)
  const best = bestOf(ex.id, s.workouts)
  const br = BRANCH_OF[ex.id]
  const levels: Partial<Record<Muscle, number>> = {}
  ex.secondary.forEach((m) => (levels[m] = 0.35))
  ex.primary.forEach((m) => (levels[m] = 1))
  const needs = ex.equip.map((grp) => grp.map((e) => l(EQUIPMENT.find((x) => x.id === e)!.name)).join(' / '))

  return (
    <div className="page narrow">
      <div className="topbar">
        <button className="iconbtn ghost" onClick={() => goBack('/library')} aria-label={t('back')}><Icon name="back" /></button>
        <div className="title" />
        <span style={{ width: 44 }} />
      </div>
      <h1 className="h1" style={{ fontSize: 28 }}>{l(ex.name)}</h1>
      <div className="row" style={{ flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
        {ex.primary.map((m) => <span key={m} className="tag" style={{ color: 'var(--text)' }}>{t('m_' + m)}</span>)}
        {ex.quiet && <span className="tag"><Icon name="moon" size={13} />&nbsp;{t('lib_quiet')}</span>}
        {ex.custom && <span className="tag">{t('lib_custom')}</span>}
      </div>
      {br && (
        <button className="banner" style={{ marginTop: 14, width: '100%', textAlign: 'left' }} onClick={() => navigate('/skills')}>
          <Icon name="layers" size={18} />
          <span className="grow">{t('lib_in_tree', { n: br.index + 1, branch: l(BRANCHES.find((b) => b.id === br.branch)!.name) })}</span>
          <Icon name="chevR" size={16} />
        </button>
      )}
      {exPhoto(ex.id) && <div className="ex-photo"><img src={exPhoto(ex.id)!} alt="" /></div>}
      <div className="muscle-chips" style={{ marginTop: 16 }}>
        {ex.primary.map((m) => <span key={m}><i />{t('m_' + m)}</span>)}
        {ex.secondary.map((m) => <span key={m} className="sec"><i />{t('m_' + m)}</span>)}
      </div>
      {ex.caution && <div className="banner" style={{ marginTop: 12, color: 'var(--accent)', background: 'var(--accent-soft)' }}><Icon name="info" size={18} />{l(ex.caution)}</div>}
      {ex.steps.length > 0 && (
        <div className="section">
          <div className="section-head"><div className="h3">{t('lib_technique')}</div></div>
          <div className="list">
            {ex.steps.map((st, i) => (
              <div className="li" key={i}><div className="li-ic num" style={{ fontWeight: 700 }}>{i + 1}</div><div className="li-main"><div style={{ fontSize: 15 }}>{l(st)}</div></div></div>
            ))}
          </div>
        </div>
      )}
      <div className="section">
        <div className="section-head"><div className="h3">{t('lib_equipment')}</div></div>
        <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>{needs.length ? needs.map((n) => <span key={n} className="chip">{n}</span>) : <span className="chip">{t('lib_bodyweight')}</span>}</div>
      </div>
      <div className="section">
        <div className="section-head"><div className="h3">{t('lib_history')}</div>
          {hist.length > 0 && <span className="small muted num">{ex.mode === 'wr' ? fmtW(best.weight, units, lang) : ex.mode === 't' ? `${best.time} ${t('sec')}` : `${best.reps} ${t('reps')}`}</span>}
        </div>
        {hist.length === 0 ? <div className="card small muted">{t('lib_no_history')}</div> : (
          <div className="list">
            {hist.map((h) => (
              <div className="li" key={h.workoutId}>
                <div className="li-main"><div className="li-title">{fmtDate(h.at, lang)}</div>
                  <div className="li-sub num">{h.sets.map((x) => ex.mode === 't' ? `${x.seconds} ${t('sec')}` : x.weight ? `${fmtNum(toUnit(x.weight, units), lang, 2)} × ${x.reps}` : `${x.reps}`).join(', ')}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
