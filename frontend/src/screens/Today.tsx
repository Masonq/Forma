import { placePhoto } from '../lib/media'
import { ExThumb } from '../components/Thumb'
import { useEffect, useMemo, useState } from 'react'
import { Icon, Logo, PLACE_ICON } from '../components/Icon'
import { EQUIPMENT } from '../data/skills'
import { Sheet, navigate } from '../components/ui'
import { dayKey, fmtNum, startOfWeek, toUnit, wdayShort, weekday } from '../lib/format'
import { useT } from '../lib/i18n'
import { activeWorkout, useStore } from '../lib/store'
import { estimateMinutes, exById, generate, musclesOf, placeFor, streak } from '../lib/training'
import { ctx, startEmpty, startWorkout } from '../lib/workout'
import type { Place } from '../lib/types'
import { isIOS, isStandalone, pushState } from '../lib/sync'

export default function Today() {
  const { t, p, l, lang } = useT()
  const s = useStore()
  const active = activeWorkout(s)
  const [placeOverride, setPlaceOverride] = useState<string | null>(null)
  const [placeSheet, setPlaceSheet] = useState(false)
  const [push, setPush] = useState<string>('')
  useEffect(() => { pushState().then(setPush).catch(() => {}) }, [])
  const startOpen = location.search.includes('start=1')
  const now = Date.now()
  const wd = weekday(now)
  const planned = s.profile.days.includes(wd)
  const place: Place = s.places.find((x) => x.id === placeOverride) ?? placeFor(ctx(), now)

  const plan = useMemo(() => generate(ctx(), now, place), [place.id, place.updatedAt, s.profile.updatedAt, s.workouts.length])
  const minutes = estimateMinutes(plan.items)
  const muscles = musclesOf(plan.items, s.custom)

  const done = s.workouts.filter((w) => w.status === 'done')
  const doneDays = new Set(done.map((w) => dayKey(w.startedAt)))
  const wk = startOfWeek(now)
  const st = streak(s.workouts, s.profile.days, now)

  // Главная цифра: последний рекорд или новая ступень
  const highlight = useMemo(() => {
    const recent = [...done].sort((a, b) => b.startedAt - a.startedAt).slice(0, 8)
    for (const w of recent) {
      const su = w.summary?.stepUps[0]
      if (su) { const ex = exById(su.to); return { big: ex ? l(ex.name) : '', caption: t('sum_step_up'), icon: 'layers' } }
      const r = w.summary?.records.find((x) => x.kind === 'weight' && x.prev)
      if (r) {
        const ex = exById(r.exerciseId, s.custom)
        const delta = toUnit(r.value - (r.prev ?? 0), s.profile.units)
        return { big: `+${fmtNum(delta, lang, 2)} ${t(s.profile.units)}`, caption: ex ? l(ex.name) : '', icon: 'arrowUp' }
      }
      const rr = w.summary?.records.find((x) => x.kind === 'reps' && x.prev)
      if (rr) {
        const ex = exById(rr.exerciseId, s.custom)
        return { big: `+${rr.value - (rr.prev ?? 0)} ${t('reps')}`, caption: ex ? l(ex.name) : '', icon: 'arrowUp' }
      }
    }
    return null
  }, [done.length, lang])

  const title = active ? t(active.title) : t(plan.title)

  // Неделя: состояние каждого дня из плана
  const planDays = [...s.profile.days].sort((a, b) => a - b)
  const dayState = (d: number) => {
    const isDone = doneDays.has(dayKey(wk + d * 86400000))
    if (isDone) return 'done'
    if (d === wd) return 'today'
    return d < wd ? 'missed' : 'plan'
  }
  const weekWs = done.filter((w) => w.startedAt >= wk)
  const weekDone = planDays.filter((d) => dayState(d) === 'done').length
  const weekMin = Math.round(weekWs.reduce((a, w) => a + ((w.endedAt ?? w.startedAt) - w.startedAt), 0) / 60000)
  const weekVol = weekWs.reduce((a, w) => a + (w.summary?.volume ?? 0), 0)
  const weekSets = weekWs.reduce((a, w) => a + (w.summary?.sets ?? 0), 0)
  const records30 = done.filter((w) => w.startedAt >= now - 30 * 86400000).reduce((a, w) => a + (w.summary?.records.length ?? 0), 0)
  const nextDay = planned && !doneDays.has(dayKey(now)) ? wd : (planDays.find((d) => d > wd) ?? planDays[0])
  const nextLabel = nextDay === undefined ? t('week_none') : nextDay === wd ? t('week_today') : wdayShort(lang, nextDay)
  const prevRecords = done.filter((w) => w.startedAt >= now - 60 * 86400000 && w.startedAt < now - 30 * 86400000).reduce((a, w) => a + (w.summary?.records.length ?? 0), 0)
  const recDelta = records30 - prevRecords
  const last30 = done.filter((w) => w.startedAt >= now - 30 * 86400000).length
  const hour = new Date(now).getHours()
  const part = hour < 5 ? 'night' : hour < 12 ? 'morning' : hour < 18 ? 'day' : 'evening'
  const greeting = s.profile.name ? t('greet_' + part + '_n', { name: s.profile.name.trim().split(' ')[0] }) : t('greet_' + part)
  const dateLine = new Date(now).toLocaleDateString(lang === 'sr' ? 'sr-Latn' : lang, { weekday: 'long', day: 'numeric', month: 'long' })
  const daysTo = nextDay === undefined ? null : (nextDay >= wd ? nextDay - wd : nextDay + 7 - wd)
  const untilNext = daysTo === null || daysTo === 0 ? '' : daysTo === 1 ? t('until_tomorrow') : t('until_days', { n: daysTo }) + ' ' + p(daysTo, 'days_n')
  // «Нужно тебе»: короткие дела, каждое ведёт туда, где его сделать
  const lastMeas = Math.max(0, ...s.measurements.filter((m) => !m.deleted).map((m) => m.date))
  const needs: { key: string; icon: string; color: string; go: () => void }[] = []
  if (!s.profile.name) needs.push({ key: 'name', icon: 'edit', color: 'var(--accent)', go: () => navigate('/profile') })
  if (isIOS() && !isStandalone()) needs.push({ key: 'install', icon: 'download', color: 'var(--blue)', go: () => navigate('/profile') })
  if (push === 'off') needs.push({ key: 'push', icon: 'bell', color: 'var(--accent)', go: () => navigate('/profile') })
  if (now - lastMeas > 14 * 86400000) needs.push({ key: 'measure', icon: 'ruler', color: 'var(--green)', go: () => navigate('/body') })
  const nextTs = nextDay === undefined ? null : wk + (nextDay >= wd ? nextDay : nextDay + 7) * 86400000
  const nextLong = nextTs === null ? t('week_none') : nextDay === wd ? t('week_today') : new Date(nextTs).toLocaleDateString(lang === 'sr' ? 'sr-Latn' : lang, { weekday: 'short', day: 'numeric', month: 'short' })

  return (
    <div className="page today-page">
      <header className="top glass">
        <div className="top-row">
          <span className="mobile-only"><Logo /></span>
          <div className="top-actions">
            <button className="place-switch" onClick={() => setPlaceSheet(true)} aria-haspopup="dialog">
              <Icon name={PLACE_ICON[place.kind]} size={18} />
              <span className="ellipsis">{place.name}</span>
              <Icon name="chevD" size={16} className="chev" />
            </button>
            <button className="iconbtn glass-btn mobile-only" onClick={() => navigate('/library')} aria-label={t('lib_search')}><Icon name="search" size={20} /></button>
          </div>
        </div>
        <div className="pipe" aria-label={t('today_week')}>
          {planDays.map((d, i) => (
            <span key={d} className="pst">
              {i > 0 && <span className="arr" aria-hidden="true">›</span>}
              <span className={`pdot ${dayState(d)}`}>{dayState(d) === 'done' ? <Icon name="check" size={11} stroke={3.4} /> : null}</span>
              {wdayShort(lang, d)}
            </span>
          ))}
          <span className="nx num"><Icon name="timer" size={14} />{nextLabel}</span>
        </div>
      </header>

      <div className="greet">
        <div className="greet-date">{dateLine}</div>
        <h1 className="h1 today-h1">{greeting}</h1>
      </div>

      <div className="desk-2" style={{ marginTop: 14 }}>
        <div>
          <div className={`hero ${placePhoto(place.kind) ? 'has-photo' : ''}`}>
            {placePhoto(place.kind) && <img className="hero-bg" src={placePhoto(place.kind)!} alt="" aria-hidden="true" />}
            {!active && !planned && untilNext && <span className="hero-chip num"><Icon name="timer" size={14} />{untilNext}</span>}
            <div className="hero-top">
            <div className="hero-body">
              <div className="label-row"><Icon name={active ? 'timer' : planned ? 'bolt' : 'moon'} size={16} />{active ? t('today_continue') : planned ? t('today_workout') : t('today_rest_day')}</div>
              <div className="hero-title">{title}</div>
              <div className="meta">
                <span><Icon name="timer" size={16} />{minutes} {t('min')}</span>
                <span><Icon name="grid" size={16} />{plan.items.length} {p(plan.items.length, 'today_exercises')}</span>
              </div>
              {muscles.length > 0 && <div className="hero-muscles">{muscles.slice(0, 5).map((m) => t('m_' + m)).join(', ')}</div>}
            </div>
            </div>
            {!planned && !active && <p className="small muted" style={{ position: 'relative', margin: '12px 0 0', maxWidth: '34ch' }}>{t('today_rest_d')}</p>}
            <button className="btn primary" onClick={() => (active ? navigate('/workout') : startWorkout(place, plan.items, plan.title))}>
              <Icon name="play" size={18} fill stroke={0} />{t(active ? 'today_continue' : 'today_start')}
            </button>
          </div>

          <div className="air card section">
            <div className="air-top">
              <div>
                <div className="air-label">{t('today_week')}</div>
                <div className="air-big num">{weekDone}<span> / {planDays.length}</span></div>
                <div className="small muted">{p(planDays.length, 'week_plan_n')}</div>
              </div>
              <div className="air-next">
                <div className="air-label">{t('week_next')}</div>
                <div className="air-next-v">{nextLong}</div>
              </div>
            </div>
            <div className="air-bar" role="img" aria-label={`${weekDone} / ${planDays.length}`}>
              {planDays.map((d) => <i key={d} className={dayState(d)} />)}
            </div>
            <div className="air-stats">
              <div><b className="num">{weekMin}</b><span>{t('min')}</span></div>
              <div><b className="num">{fmtNum(toUnit(weekVol, s.profile.units), lang, 0)}</b><span>{t('week_volume', { u: t(s.profile.units) })}</span></div>
              <div><b className="num">{weekSets}</b><span>{p(weekSets, 'week_sets')}</span></div>
            </div>
          </div>

          <div className="kpis section">
            <div className="kpi card">
              <span className="ki" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}><Icon name="flame" size={18} /></span>
              <b className="num">{st.count}</b><span>{p(st.count, 'today_streak')}</span>
              {st.frozen && <span className="faint">{t('today_streak_freeze')}</span>}
            </div>
            <div className="kpi card">
              <span className="ki" style={{ background: 'var(--green-soft)', color: 'var(--green)' }}><Icon name="trophy" size={18} /></span>
              <div className="kpi-v"><b className="num">{records30}</b>{recDelta !== 0 && <Delta v={recDelta} />}</div><span>{p(records30, 'kpi_records')}</span>
            </div>
            <div className="kpi card">
              <span className="ki" style={{ background: 'var(--blue-soft)', color: 'var(--blue)' }}><Icon name="grid" size={18} /></span>
              <div className="kpi-v"><b className="num">{done.length}</b>{last30 > 0 && <Delta v={last30} label={t('kpi_30d')} />}</div><span>{p(done.length, 'kpi_total')}</span>
            </div>
            <button className="kpi card press" onClick={() => navigate('/progress')}>
              <span className="ki" style={{ background: 'var(--red-soft)', color: 'var(--red)' }}><Icon name={highlight?.icon ?? 'arrowUp'} size={18} stroke={2.2} /></span>
              {highlight ? <><b className="num ellipsis">{highlight.big}</b><span className="ellipsis">{highlight.caption}</span></> : <span>{t('today_highlight_none')}</span>}
            </button>
          </div>

          {needs.length > 0 && (
            <div className="section">
              <div className="section-head"><div className="h3">{t('needs_title')}</div><span className="count-pill num">{needs.length}</span></div>
              <div className="list">
                {needs.slice(0, 4).map((n) => (
                  <div className="li need" key={n.key}>
                    <div className="li-ic" style={{ color: n.color }}><Icon name={n.icon} size={20} /></div>
                    <div className="li-main"><div className="li-title">{t('need_' + n.key)}</div><div className="li-sub">{t('need_' + n.key + '_d')}</div></div>
                    <button className="btn sm" onClick={n.go}>{t('need_do')}</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="section">
          <div className="section-head"><div className="h3">{t('nav_library')}</div><span className="small muted">{place.name}</span></div>
          <div className="list">
            {plan.items.map((it) => {
              const ex = exById(it.exerciseId, s.custom)
              if (!ex) return null
              const work = it.sets.filter((x) => x.kind === 'work')
              const lo = it.repLow, hi = it.repHigh
              const scheme = ex.mode === 't' ? `${work.length} × ${work[0]?.seconds ?? hi} ${t('sec')}` : `${work.length} × ${lo && hi && lo !== hi ? `${lo}–${hi}` : hi ?? ''}`
              return (
                <button key={it.id} className="li" onClick={() => navigate(`/exercise/${ex.id}`)}>
                  <ExThumb ex={ex} />
                  <div className="li-main"><div className="li-title">{l(ex.name)}</div><div className="li-sub">{ex.primary.map((m) => t('m_' + m)).join(', ')}</div></div>
                  <div className="li-val num">{scheme}</div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <PlaceSheet open={placeSheet} onClose={() => setPlaceSheet(false)} current={place.id} onPick={(id) => { setPlaceOverride(id); setPlaceSheet(false) }} />
      <StartSheet open={startOpen} place={place} onClose={() => navigate('/', true)} />
    </div>
  )
}

export function PlaceSheet({ open, onClose, current, onPick }: { open: boolean; onClose: () => void; current: string; onPick: (id: string) => void }) {
  const { t, l } = useT()
  const places = useStore((s) => s.places)
  return (
    <Sheet open={open} onClose={onClose} title={t('place_switch')}>
      <div className="stack">
        {places.map((pl) => (
          <button key={pl.id} className={`opt ${pl.id === current ? 'on' : ''}`} onClick={() => onPick(pl.id)}>
            <div className="opt-ic"><Icon name={PLACE_ICON[pl.kind]} /></div>
            <div className="grow"><div className="opt-t">{pl.name}</div><div className="opt-d ellipsis">{pl.equip.length ? pl.equip.slice(0, 3).map((e) => l(EQUIPMENT.find((x) => x.id === e)!.name)).join(', ') + (pl.equip.length > 3 ? ` +${pl.equip.length - 3}` : '') : t('lib_bodyweight')}{pl.quiet ? `, ${t('quiet').toLowerCase()}` : ''}</div></div>
            <div className="check">{pl.id === current && <Icon name="check" size={16} stroke={2.4} />}</div>
          </button>
        ))}
      </div>
      <button className="btn line" style={{ marginTop: 14 }} onClick={() => { onClose(); navigate('/places') }}><Icon name="edit" size={18} />{t('place_manage')}</button>
    </Sheet>
  )
}

function StartSheet({ open, onClose, place }: { open: boolean; onClose: () => void; place: Place }) {
  const { t } = useT()
  const places = useStore((s) => s.places)
  const [pid, setPid] = useState(place.id)
  const chosen = places.find((x) => x.id === pid) ?? place
  return (
    <Sheet open={open} onClose={onClose} title={t('place_switch')}>
      <div className="chips" style={{ marginBottom: 16 }}>
        {places.map((pl) => (
          <button key={pl.id} className={`chip ${pl.id === chosen.id ? 'on' : ''}`} onClick={() => setPid(pl.id)}><Icon name={PLACE_ICON[pl.kind]} size={16} />{pl.name}</button>
        ))}
      </div>
      <div className="stack">
        <button className="btn primary" onClick={() => { onClose(); setTimeout(() => startWorkout(chosen), 0) }}><Icon name="play" size={18} fill stroke={0} />{t('today_start')}</button>
        <button className="btn" onClick={() => { onClose(); setTimeout(() => startEmpty(chosen), 0) }}><Icon name="plus" size={20} />{t('wo_add_ex')}</button>
      </div>
    </Sheet>
  )
}

function Delta({ v, label }: { v: number; label?: string }) {
  return <span className={`delta num ${v > 0 ? 'up' : 'down'}`}><Icon name="arrowUp" size={11} stroke={2.6} style={v < 0 ? { transform: 'rotate(180deg)' } : undefined} />{v > 0 ? '+' : '−'}{Math.abs(v)}{label ? ` ${label}` : ''}</span>
}
