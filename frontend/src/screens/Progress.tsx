import { Anatomy } from '../components/Anatomy'
import { useMemo, useState } from 'react'
import type { Muscle } from '../data/exercises'
import { Icon } from '../components/Icon'
import { BarChart, Empty, LineChart, Seg, navigate } from '../components/ui'
import { dayKey, fmtDate, fmtDuration, fmtNum, fmtW, monthFull, monthShort, startOfDay, startOfWeek, toUnit, wdayShort } from '../lib/format'
import { useT } from '../lib/i18n'
import { useStore } from '../lib/store'
import { bestOf, exById, historyOf, muscleSetsSince, setVolume } from '../lib/training'
import { BodyContent } from './Body'

const ALL_MUSCLES: Muscle[] = ['chest', 'shoulders', 'triceps', 'biceps', 'lats', 'traps', 'abs', 'glutes', 'quads', 'hamstrings', 'calves', 'lowerback', 'obliques', 'forearms']

export default function Progress() {
  const { t } = useT()
  const [tab, setTab] = useState<'strength' | 'volume' | 'body'>('strength')
  return (
    <div className="page">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 6 }}>
        <h1 className="h1">{t('pr_title')}</h1>
        <button className="iconbtn" onClick={() => navigate('/library')} aria-label={t('nav_library')}><Icon name="book" size={20} /></button>
      </div>
      <div style={{ marginTop: 16 }}>
        <Seg value={tab} onChange={setTab} options={[{ v: 'strength', label: t('pr_strength') }, { v: 'volume', label: t('pr_volume') }, { v: 'body', label: t('pr_body') }]} />
      </div>
      {tab === 'strength' && <Strength />}
      {tab === 'volume' && <Volume />}
      {tab === 'body' && <BodyContent />}
    </div>
  )
}

function Strength() {
  const { t, l, lang } = useT()
  const s = useStore()
  const units = s.profile.units
  const done = s.workouts.filter((w) => w.status === 'done')
  const freq = useMemo(() => {
    const m = new Map<string, number>()
    for (const w of done) for (const it of w.items) if (it.sets.some((x) => x.done && x.kind === 'work')) m.set(it.exerciseId, (m.get(it.exerciseId) ?? 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id).filter((id) => exById(id, s.custom))
  }, [done.length])
  const [sel, setSel] = useState<string | null>(null)
  const exId = sel ?? freq[0]

  if (!done.length) return <div className="card" style={{ marginTop: 16 }}><Empty icon="progress" text={t('pr_empty')} action={<button className="btn primary" onClick={() => navigate('/?start=1')}>{t('today_start')}</button>} /></div>

  const ex = exId ? exById(exId, s.custom) : undefined
  const hist = exId ? historyOf(exId, s.workouts).slice(0, 16).reverse() : []
  const metric = (sets: typeof hist[0]['sets']) => ex?.mode === 'wr' ? Math.max(...sets.map((x) => x.weight ?? 0)) : ex?.mode === 't' ? Math.max(...sets.map((x) => x.seconds ?? 0)) : Math.max(...sets.map((x) => x.reps ?? 0))
  const pts = hist.map((h) => (ex?.mode === 'wr' ? toUnit(metric(h.sets), units) : metric(h.sets)))
  const labels = hist.map((h) => { const d = new Date(h.at); return `${d.getDate()} ${monthShort(lang, d.getMonth()).toLowerCase()}` })
  const unit = ex?.mode === 'wr' ? t(units) : ex?.mode === 't' ? t('sec') : t('reps')
  const last = pts[pts.length - 1] ?? 0
  const monthAgo = hist.filter((h) => h.at < Date.now() - 30 * 86400000)
  const base = monthAgo.length ? (ex?.mode === 'wr' ? toUnit(metric(monthAgo[monthAgo.length - 1].sets), units) : metric(monthAgo[monthAgo.length - 1].sets)) : pts[0]
  const delta = last - (base ?? last)
  const best = exId ? bestOf(exId, s.workouts) : undefined

  return (
    <div className="desk-2" style={{ marginTop: 16 }}>
      <div>
        <div className="chips">
          {freq.slice(0, 12).map((id) => <button key={id} className={`chip ${id === exId ? 'on' : ''}`} onClick={() => setSel(id)}>{l(exById(id, s.custom)!.name)}</button>)}
        </div>
        {ex && (
          <div className="card" style={{ marginTop: 12 }}>
            <div className="small muted">{l(ex.name)}</div>
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 6 }}>
              <div className="stat-big num" style={{ fontSize: 40 }}>{fmtNum(last, lang, 2)}<small>{unit}</small></div>
              {delta > 0 && <div className="up num" style={{ fontWeight: 650, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="arrowUp" size={16} stroke={2.4} />+{fmtNum(delta, lang, 2)} {unit}</div>}
            </div>
            {ex.mode === 'wr' && best && best.e1rm > 0 && <div className="small muted" style={{ marginTop: 4 }}>{t('rec_e1rm')}: <span className="num">{fmtW(best.e1rm, units, lang)}</span></div>}
            <div style={{ marginTop: 14 }}>
              {pts.length > 1 ? <LineChart points={pts} labels={labels} fmt={(v) => fmtNum(v, lang, 0)} /> : <div className="small faint" style={{ padding: '18px 0' }}>{t('pr_empty')}</div>}
            </div>
          </div>
        )}

        <div className="section">
          <div className="section-head"><div className="h3">{t('pr_records')}</div></div>
          <div className="list">
            {freq.slice(0, 8).map((id) => {
              const e = exById(id, s.custom)!
              const b = bestOf(id, s.workouts)
              const val = e.mode === 'wr' ? fmtW(b.weight, units, lang) : e.mode === 't' ? `${b.time} ${t('sec')}` : `${b.reps} ${t('reps')}`
              return (
                <button key={id} className="li" onClick={() => navigate(`/exercise/${id}`)}>
                  <div className="li-ic" style={{ color: 'var(--accent)' }}><Icon name="trophy" size={20} /></div>
                  <div className="li-main"><div className="li-title ellipsis">{l(e.name)}</div></div>
                  <div className="li-val num" style={{ color: 'var(--text)', fontWeight: 600 }}>{val}</div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
      <div>
        <MusclesWeek />
        <Calendar />
      </div>
    </div>
  )
}

function MusclesWeek() {
  const { t } = useT()
  const s = useStore()
  const since = startOfDay(Date.now()) - 6 * 86400000
  const sets = muscleSetsSince(s.workouts, since, s.custom)
  const trained = ALL_MUSCLES.filter((m) => (sets[m] ?? 0) > 0).sort((a, b) => (sets[b] ?? 0) - (sets[a] ?? 0))
  const skipped = ALL_MUSCLES.filter((m) => !(sets[m] ?? 0))
  return (
    <div className="section">
      <div className="section-head"><div className="h3">{t('pr_muscles_week')}</div></div>
      <div className="card">
        <Anatomy levels={Object.fromEntries(Object.entries(sets).map(([m, n]) => [m, Math.min(1, (n as number) / 10)]))} />
        <div className="small muted" style={{ margin: '14px 0 10px' }}>{t('pr_muscles_d')}</div>
        {trained.slice(0, 6).map((m) => (
          <div key={m} className="mbar">
            <span className="ellipsis">{t('m_' + m)}</span>
            <span className="track"><i style={{ width: `${Math.min(100, ((sets[m] ?? 0) / 10) * 100)}%`, background: (sets[m] ?? 0) >= 10 ? 'var(--green)' : 'var(--red)' }} /></span>
            <span className="v num">{fmtNumInt(sets[m] ?? 0)}</span>
          </div>
        ))}
        {skipped.length > 0 && <div className="small faint" style={{ marginTop: 10 }}>{t('pr_skipped')}: {skipped.map((m) => t('m_' + m).toLowerCase()).join(', ')}</div>}
      </div>
    </div>
  )
}
const fmtNumInt = (n: number) => String(Math.round(n))

function Calendar() {
  const { t, l, lang } = useT()
  const s = useStore()
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).getTime() })
  const [sel, setSel] = useState<string | null>(null)
  const d0 = new Date(month)
  const first = (d0.getDay() + 6) % 7
  const daysIn = new Date(d0.getFullYear(), d0.getMonth() + 1, 0).getDate()
  const byDay = new Map<string, typeof s.workouts>()
  for (const w of s.workouts) if (w.status === 'done') { const k = dayKey(w.startedAt); byDay.set(k, [...(byDay.get(k) ?? []), w]) }
  const todayK = dayKey(Date.now())
  const shift = (n: number) => { const d = new Date(month); d.setMonth(d.getMonth() + n); setMonth(d.getTime()); setSel(null) }
  const list = sel ? byDay.get(sel) ?? [] : []
  return (
    <div className="section">
      <div className="section-head"><div className="h3">{t('pr_history')}</div></div>
      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
          <button className="iconbtn ghost" onClick={() => shift(-1)} aria-label={t('back')}><Icon name="back" size={20} /></button>
          <div style={{ fontWeight: 600 }}>{monthFull(lang, d0.getMonth())} {d0.getFullYear()}</div>
          <button className="iconbtn ghost" onClick={() => shift(1)} aria-label={t('next')}><Icon name="chevR" size={20} /></button>
        </div>
        <div className="cal">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => <div key={'h' + i} className="wh">{wdayShort(lang, i)}</div>)}
          {Array.from({ length: first }).map((_, i) => <div key={'e' + i} />)}
          {Array.from({ length: daysIn }).map((_, i) => {
            const k = dayKey(new Date(d0.getFullYear(), d0.getMonth(), i + 1).getTime())
            return <button key={k} className={`cd num ${byDay.has(k) ? 'has' : ''} ${k === todayK ? 'today' : ''} ${sel === k ? 'sel' : ''}`} onClick={() => setSel(sel === k ? null : k)}>{i + 1}</button>
          })}
        </div>
        {sel && (
          <div style={{ marginTop: 14 }}>
            {list.length === 0 ? <div className="small muted">{t('pr_no_workouts_day')}</div> : list.map((w) => {
              const v = setVolume(w)
              return (
                <button key={w.id} className="li" style={{ padding: 0, borderTop: '1px solid var(--line)' }} onClick={() => w.summary && navigate(`/summary/${w.id}`)}>
                  <div className="li-main">
                    <div className="li-title">{w.title.includes('_') ? t(w.title) : w.title}</div>
                    <div className="li-sub inline-meta"><span>{fmtDate(w.startedAt, lang)}</span><span>{fmtDuration((w.endedAt ?? w.startedAt) - w.startedAt, lang)}</span><span>{v.sets} {t('sum_sets').toLowerCase()}</span></div>
                    <div className="li-sub ellipsis">{w.items.map((it) => { const e = exById(it.exerciseId, s.custom); return e ? l(e.name) : '' }).join(', ')}</div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function Volume() {
  const { t, lang } = useT()
  const s = useStore()
  const units = s.profile.units
  const weeks = 8
  const w0 = startOfWeek(Date.now()) - (weeks - 1) * 7 * 86400000
  const vol = Array(weeks).fill(0), cnt = Array(weeks).fill(0)
  for (const w of s.workouts) {
    if (w.status !== 'done' || w.startedAt < w0) continue
    const i = Math.floor((w.startedAt - w0) / (7 * 86400000))
    if (i < 0 || i >= weeks) continue
    vol[i] += toUnit(setVolume(w).volume, units)
    cnt[i] += 1
  }
  const labels = Array.from({ length: weeks }, (_, i) => { const d = new Date(w0 + i * 7 * 86400000); return `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}` })
  if (!s.workouts.some((w) => w.status === 'done')) return <div className="card" style={{ marginTop: 16 }}><Empty icon="progress" text={t('pr_empty')} /></div>
  return (
    <div className="desk-2" style={{ marginTop: 16 }}>
      <div className="card">
        <div className="h3">{t('pr_weekly_volume')}</div>
        <div className="small muted" style={{ marginTop: 2 }}>{t(units)}</div>
        <div style={{ marginTop: 12 }}><BarChart values={vol} labels={labels} fmt={(v) => (v >= 1000 ? `${fmtNum(v / 1000, lang, 1)}k` : fmtNum(v, lang, 0))} /></div>
      </div>
      <div className="card">
        <div className="h3">{t('pr_workouts_week')}</div>
        <div style={{ marginTop: 30 }}><BarChart values={cnt} labels={labels} color="var(--green)" fmt={(v) => String(v)} /></div>
      </div>
    </div>
  )
}
