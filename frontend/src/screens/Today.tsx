import { ExThumb } from '../components/Thumb'
import { useMemo, useState } from 'react'
import { Icon, Logo, PLACE_ICON } from '../components/Icon'
import { EQUIPMENT } from '../data/skills'
import { Sheet, navigate } from '../components/ui'
import { dayKey, fmtNum, startOfWeek, toUnit, wdayShort, weekday } from '../lib/format'
import { useT } from '../lib/i18n'
import { activeWorkout, useStore } from '../lib/store'
import { estimateMinutes, exById, generate, musclesOf, placeFor, streak } from '../lib/training'
import { ctx, startEmpty, startWorkout } from '../lib/workout'
import type { Place } from '../lib/types'

export default function Today() {
  const { t, p, l, lang } = useT()
  const s = useStore()
  const active = activeWorkout(s)
  const [placeOverride, setPlaceOverride] = useState<string | null>(null)
  const [placeSheet, setPlaceSheet] = useState(false)
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

  return (
    <div className="page">
      <div className="topbar mobile-only">
        <Logo />
        <button className="iconbtn" onClick={() => navigate('/library')} aria-label={t('lib_search')}><Icon name="search" size={20} /></button>
      </div>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
        <h1 className="h1">{t('today_title')}</h1>
        <button className="place-chip" onClick={() => setPlaceSheet(true)} aria-haspopup="dialog">
          <Icon name={PLACE_ICON[place.kind]} size={18} />{place.name}<Icon name="chevD" size={16} />
        </button>
      </div>

      <div className="desk-2" style={{ marginTop: 18 }}>
        <div>
          <div className="hero">
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

          <div className="section">
            <div className="section-head"><div className="h3">{t('today_week')}</div></div>
            <div className="week">
              {[0, 1, 2, 3, 4, 5, 6].map((d) => {
                const ts = wk + d * 86400000
                const isDone = doneDays.has(dayKey(ts))
                const isPlan = s.profile.days.includes(d)
                const isToday = d === wd
                const missed = isPlan && !isDone && d < wd
                return (
                  <div key={d} className={`wd ${isToday ? 'cur' : ''}`}>
                    <span>{wdayShort(lang, d)}</span>
                    <span className={`dot ${isDone ? 'done' : ''} ${isPlan ? 'plan' : ''} ${isToday ? 'today' : ''} ${missed ? 'missed' : ''}`}>
                      {isDone ? <Icon name="check" size={16} stroke={2.6} /> : new Date(ts).getDate()}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="grid2 section">
            <div className="card tight">
              <div className="row" style={{ gap: 10 }}>
                <span style={{ color: st.count ? 'var(--accent)' : 'var(--faint)' }}><Icon name="flame" size={24} /></span>
                <div className="stat-big num">{st.count}</div>
              </div>
              <div className="small muted" style={{ marginTop: 8 }}>{p(st.count, 'today_streak')}</div>
              {st.frozen && <div className="small faint" style={{ marginTop: 4 }}>{t('today_streak_freeze')}</div>}
            </div>
            <button className="card tight press" style={{ textAlign: 'left' }} onClick={() => navigate('/progress')}>
              {highlight ? (
                <>
                  <div className="row" style={{ gap: 8 }}><span className="up"><Icon name={highlight.icon} size={22} stroke={2.2} /></span><div className="stat-big num" style={{ fontSize: 24 }}>{highlight.big}</div></div>
                  <div className="small muted ellipsis" style={{ marginTop: 8 }}>{highlight.caption}</div>
                </>
              ) : (
                <>
                  <span className="faint"><Icon name="trophy" size={24} /></span>
                  <div className="small muted" style={{ marginTop: 8 }}>{t('today_highlight_none')}</div>
                </>
              )}
            </button>
          </div>
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
