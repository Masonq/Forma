import { exPhoto } from '../lib/media'
import { ExThumb } from '../components/Thumb'
import { useEffect, useMemo, useRef, useState } from 'react'
import { EXERCISES } from '../data/exercises'
import { Icon, PLACE_ICON } from '../components/Icon'
import { Barbell, Clock, Sheet, navigate, platesFor } from '../components/ui'
import { fmtClock, fmtDate, fmtNum, fromUnit, toUnit, weightStep } from '../lib/format'
import { useT } from '../lib/i18n'
import { activeWorkout, useStore } from '../lib/store'
import { alternatives, availableAt, exById, historyOf } from '../lib/training'
import * as W from '../lib/workout'
import type { SetEntry, WorkoutItem } from '../lib/types'
import { PlaceSheet } from './Today'

function useNow(ms = 1000) {
  const [n, setN] = useState(Date.now())
  useEffect(() => { const i = setInterval(() => setN(Date.now()), ms); return () => clearInterval(i) }, [ms])
  return n
}

export default function WorkoutScreen() {
  const { t, l, lang } = useT()
  const s = useStore()
  const w = activeWorkout(s)
  const now = useNow(500)
  const [edit, setEdit] = useState<{ item: string; set: string } | null>(null)
  const [hold, setHold] = useState<{ item: string; set: string } | null>(null)
  const [menu, setMenu] = useState(false)
  const [exMenu, setExMenu] = useState<string | null>(null)
  const [replace, setReplace] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [placeOpen, setPlaceOpen] = useState(false)
  const [plates, setPlates] = useState<number | null>(null)
  const [confirm, setConfirm] = useState<'finish' | 'discard' | null>(null)
  const firedFor = useRef<number>(0)

  const rest = s.rest
  const restLeft = rest ? Math.max(0, (rest.endsAt - now) / 1000) : 0
  useEffect(() => {
    if (!rest || restLeft > 0 || firedFor.current === rest.endsAt) return
    firedFor.current = rest.endsAt
    if (s.profile.sound) W.beep()
    navigator.vibrate?.(200)
    s.showToast(t('wo_rest_done'))
    s.setRest(null)
  }, [restLeft, rest])

  useEffect(() => { if (!w) navigate('/', true) }, [w])
  if (!w) return null

  const place = s.places.find((p) => p.id === w.placeId) ?? s.places[0]
  const cur = W.current(w)
  const elapsed = Math.floor((now - w.startedAt) / 1000)
  const units = s.profile.units
  const doneCount = w.items.reduce((a, it) => a + it.sets.filter((x) => x.done).length, 0)

  const editing = edit ? w.items.find((i) => i.id === edit.item) : undefined
  const editingSet = editing?.sets.find((x) => x.id === edit?.set)

  const onTick = (it: WorkoutItem, set: SetEntry) => {
    W.unlockAudio()
    const ex = exById(it.exerciseId, s.custom)
    if (!set.done && ex?.mode === 'wr' && !set.weight) { setEdit({ item: it.id, set: set.id }); return }
    if (!set.done && ex?.mode === 't') { setHold({ item: it.id, set: set.id }); return }
    W.logSet(it.id, set.id)
  }

  return (
    <div className="page no-tabs" style={{ paddingBottom: 'calc(var(--sab) + 220px)' }}>
      <div className="wo-head">
        <div className="topbar" style={{ marginBottom: 0 }}>
          <button className="iconbtn ghost" onClick={() => navigate('/')} aria-label={t('back')}><Icon name="back" /></button>
          <div className="title">{t(w.title)}</div>
          <button className="iconbtn ghost" onClick={() => setMenu(true)} aria-label={t('wo_more')}><Icon name="more" /></button>
        </div>
        <div className="elapsed num">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Icon name={PLACE_ICON[place.kind]} size={14} />{place.name}</span>
          <span style={{ margin: '0 8px' }}>/</span>{fmtClock(elapsed)}
        </div>
      </div>

      <div className="stack" style={{ marginTop: 16 }}>
        {w.items.length === 0 && <div className="card empty">{t('wo_empty')}</div>}
        {w.items.map((it, idx) => {
          const ex = exById(it.exerciseId, s.custom)
          if (!ex) return null
          const prev = historyOf(ex.id, s.workouts)[0]
          const ssIdx = it.superset ? w.items.filter((x) => x.superset === it.superset).indexOf(it) + 1 : 0
          const ssN = it.superset ? w.items.filter((x) => x.superset === it.superset).length : 0
          let workN = 0
          return (
            <div key={it.id} className={`card ex-card ${cur?.item.id === it.id ? 'active' : ''} ${it.superset ? 'ss' : ''}`}>
              {cur?.item.id === it.id && exPhoto(it.exerciseId) && <div className="ex-banner"><img src={exPhoto(it.exerciseId)!} alt="" /></div>}
              <div className="ex-top">
                <button className="grow" style={{ textAlign: 'left' }} onClick={() => navigate(`/exercise/${ex.id}`)}>
                  {it.superset && <div className="ss-label"><Icon name="link" size={14} />{t('wo_superset')} {ssIdx}/{ssN}</div>}
                  <div className="ex-name">{l(ex.name)}</div>
                  <div className="ex-sub">
                    <span>{ex.primary.map((m) => t('m_' + m)).join(', ')}</span>
                    {it.repHigh && <span className="tag num">{t('wo_target')}: {ex.mode === 't' ? `${it.repHigh} ${t('sec')}` : it.repLow && it.repLow !== it.repHigh ? `${it.repLow}–${it.repHigh}` : it.repHigh}</span>}
                    {it.note?.startsWith('up:') && <span className="tag" style={{ color: 'var(--green)', background: 'var(--green-soft)' }}>{t('wo_suggest_up', { w: `${fmtNum(toUnit(+it.note.slice(3), units), lang, 1)} ${t(units)}` })}</span>}
                  </div>
                </button>
                <button className="iconbtn ghost" onClick={() => setExMenu(it.id)} aria-label={t('wo_more')}><Icon name="more" /></button>
              </div>
              <div className="sets">
                {it.sets.map((set) => {
                  const isW = set.kind === 'warmup'
                  if (!isW) workN++
                  const isCur = cur?.set.id === set.id
                  return (
                    <div key={set.id} className={`set ${set.done ? 'done' : ''} ${isCur ? 'cur' : ''}`}>
                      <div className={`idx num ${isW ? 'w' : ''}`}>{isW ? t('wo_warmup_short') : workN}</div>
                      <div className="vals">
                        {ex.mode === 'wr' && (
                          <>
                            <button className={`valbtn num ${set.weight ? '' : 'is-empty'}`} onClick={() => setEdit({ item: it.id, set: set.id })}>
                              {set.weight ? fmtNum(toUnit(set.weight, units), lang, 2) : '—'}<small>{t(units)}</small>
                            </button>
                            <span className="x">×</span>
                          </>
                        )}
                        {ex.mode !== 't' ? (
                          <button className="valbtn num" onClick={() => setEdit({ item: it.id, set: set.id })}>{set.reps ?? 0}<small>{t('reps')}</small></button>
                        ) : (
                          <button className="valbtn num" onClick={() => setEdit({ item: it.id, set: set.id })}>{set.seconds ?? 0}<small>{t('sec')}</small></button>
                        )}
                        {set.rpe ? <span className="tag num" style={{ marginLeft: 2 }}>RPE {set.rpe}</span> : null}
                      </div>
                      <button className="tick" onClick={() => onTick(it, set)} aria-label={t('wo_mark')} aria-pressed={set.done}>
                        <Icon name="check" size={22} stroke={2.6} />
                      </button>
                    </div>
                  )
                })}
              </div>
              {prev && (
                <div className="prev-line num">{t('wo_prev')} ({fmtDate(prev.at, lang)}): {prev.sets.map((x) => (ex.mode === 't' ? `${x.seconds}${t('sec')}` : x.weight ? `${fmtNum(toUnit(x.weight, units), lang, 2)}×${x.reps}` : `${x.reps}`)).join(', ')}</div>
              )}
              <div className="ex-actions">
                <button className="chip" onClick={() => W.addSet(it.id)}><Icon name="plus" size={16} />{t('wo_add_set')}</button>
                <button className="chip" onClick={() => setReplace(it.id)}><Icon name="swap" size={16} />{t('wo_replace')}</button>
                {ex.mode === 'wr' && ex.equip.flat().includes('barbell') && (
                  <button className="chip" onClick={() => setPlates((cur?.item.id === it.id ? cur.set.weight : undefined) ?? it.sets.find((x) => x.weight)?.weight ?? 60)}><Icon name="plate" size={16} />{t('wo_plates')}</button>
                )}
                {idx < w.items.length - 1 && !it.superset && <button className="chip" onClick={() => W.toggleSuperset(it.id)}><Icon name="link" size={16} />{t('wo_superset')}</button>}
              </div>
            </div>
          )
        })}
        <button className="btn line" onClick={() => setAdding(true)}><Icon name="plus" size={20} />{t('wo_add_ex')}</button>
        <button className="btn" onClick={() => setConfirm('finish')} disabled={doneCount === 0}><Icon name="check" size={20} />{t('wo_finish')}</button>
      </div>

      {/* Низ экрана: либо отдых, либо большая кнопка подхода */}
      {rest && restLeft > 0 ? (
        <RestBar left={restLeft} total={rest.total} />
      ) : (
        <div className="restbar">
          {cur ? (
            <>
              <div className="rest-next" style={{ marginBottom: 12 }}>
                <span className="ellipsis">{l(exById(cur.item.exerciseId, s.custom)?.name ?? ['', '', ''])}</span>
                <b className="num">{W.setLabel(cur.item, cur.set, lang, units)}</b>
              </div>
              <button className="btn primary" onClick={() => onTick(cur.item, cur.set)}><Icon name="check" size={22} stroke={2.6} />{t('wo_mark')}</button>
            </>
          ) : (
            <>
              <div className="rest-next" style={{ marginBottom: 12, justifyContent: 'center' }}>{w.items.length ? t('wo_all_done') : t('wo_empty')}</div>
              {w.items.length ? <button className="btn green" onClick={() => W.finishWorkout()}><Icon name="check" size={22} stroke={2.6} />{t('wo_finish')}</button>
                : <button className="btn primary" onClick={() => setAdding(true)}><Icon name="plus" size={20} />{t('wo_add_ex')}</button>}
            </>
          )}
        </div>
      )}

      {editing && editingSet && (
        <SetEditor item={editing} set={editingSet} onClose={() => setEdit(null)} onPlates={(kg) => setPlates(kg)} />
      )}
      {hold && (() => {
        const it = w.items.find((i) => i.id === hold.item)
        const set = it?.sets.find((x) => x.id === hold.set)
        return it && set ? <HoldSheet target={set.seconds ?? 30} onClose={() => setHold(null)} onDone={(sec) => { W.updateSet(it.id, set.id, { seconds: sec }); W.logSet(it.id, set.id); setHold(null) }} /> : null
      })()}

      <Sheet open={menu} onClose={() => setMenu(false)} title={t('wo_title')}>
        <div className="list">
          <button className="li" onClick={() => { setMenu(false); setPlaceOpen(true) }}><div className="li-ic"><Icon name="pin" size={20} /></div><div className="li-main"><div className="li-title">{t('wo_place_change')}</div><div className="li-sub">{place.name}</div></div><Icon name="chevR" className="chev" /></button>
          <button className="li" onClick={() => { setMenu(false); setPlates(60) }}><div className="li-ic"><Icon name="plate" size={20} /></div><div className="li-main"><div className="li-title">{t('wo_plates')}</div></div><Icon name="chevR" className="chev" /></button>
          <button className="li" onClick={() => { setMenu(false); setConfirm('finish') }}><div className="li-ic"><Icon name="check" size={20} /></div><div className="li-main"><div className="li-title">{t('wo_finish')}</div></div></button>
          <button className="li" onClick={() => { setMenu(false); setConfirm('discard') }}><div className="li-ic" style={{ color: 'var(--red)' }}><Icon name="trash" size={20} /></div><div className="li-main"><div className="li-title" style={{ color: 'var(--red)' }}>{t('wo_discard')}</div></div></button>
        </div>
      </Sheet>

      <Sheet open={!!exMenu} onClose={() => setExMenu(null)} title={exMenu ? l(exById(w.items.find((i) => i.id === exMenu)?.exerciseId ?? '', s.custom)?.name ?? ['', '', '']) : ''}>
        {exMenu && (() => {
          const it = w.items.find((i) => i.id === exMenu)!
          const i = w.items.indexOf(it)
          return (
            <div className="list">
              <button className="li" onClick={() => { W.addSet(it.id, 'warmup'); setExMenu(null) }}><div className="li-ic"><Icon name="flame" size={20} /></div><div className="li-main"><div className="li-title">{t('wo_add_warmup')}</div></div></button>
              <button className="li" onClick={() => { setExMenu(null); setReplace(it.id) }}><div className="li-ic"><Icon name="swap" size={20} /></div><div className="li-main"><div className="li-title">{t('wo_replace')}</div></div></button>
              {(it.superset || i < w.items.length - 1) && (
                <button className="li" onClick={() => { W.toggleSuperset(it.id); setExMenu(null) }}><div className="li-ic"><Icon name="link" size={20} /></div><div className="li-main"><div className="li-title">{t(it.superset ? 'wo_superset_break' : 'wo_superset_with_next')}</div></div></button>
              )}
              {it.sets.length > 1 && !it.sets[it.sets.length - 1].done && (
                <button className="li" onClick={() => { W.removeSet(it.id, it.sets[it.sets.length - 1].id); setExMenu(null) }}><div className="li-ic"><Icon name="minus" size={20} /></div><div className="li-main"><div className="li-title">{t('delete')}: {t('wo_set').toLowerCase()} {it.sets.length}</div></div></button>
              )}
              <button className="li" onClick={() => { W.removeExercise(it.id); setExMenu(null) }}><div className="li-ic" style={{ color: 'var(--red)' }}><Icon name="trash" size={20} /></div><div className="li-main"><div className="li-title" style={{ color: 'var(--red)' }}>{t('wo_remove_ex')}</div></div></button>
            </div>
          )
        })()}
      </Sheet>

      {replace && (() => {
        const it = w.items.find((i) => i.id === replace)
        const ex = it ? exById(it.exerciseId, s.custom) : undefined
        const alts = ex ? alternatives(ex.id, place, w.items.map((x) => x.exerciseId)) : []
        return (
          <Sheet open onClose={() => setReplace(null)} title={t('wo_replace_title', { ex: ex ? l(ex.name) : '' })}>
            <p className="sub" style={{ marginTop: -6, marginBottom: 12 }}>{t('wo_replace_sub', { place: place.name })}</p>
            <ExerciseList ids={alts.map((a) => a.id)} onPick={(id) => { W.replaceExercise(replace, id); setReplace(null) }} />
          </Sheet>
        )
      })()}

      {adding && (
        <Sheet open onClose={() => setAdding(false)} title={t('wo_add_ex')}>
          <PickExercise placeId={place.id} onPick={(id) => { W.addExercise(id); setAdding(false) }} />
        </Sheet>
      )}

      <PlaceSheet open={placeOpen} onClose={() => setPlaceOpen(false)} current={place.id} onPick={(id) => {
        const p = s.places.find((x) => x.id === id)
        if (p) { W.changePlace(p); s.showToast(t('wo_place_changed', { place: p.name })) }
        setPlaceOpen(false)
      }} />

      {plates !== null && <PlateSheet initial={plates} onClose={() => setPlates(null)} />}

      <Sheet open={!!confirm} onClose={() => setConfirm(null)} title={confirm === 'discard' ? t('wo_discard') : t('wo_finish_confirm')}>
        <p className="sub" style={{ marginTop: 0 }}>{confirm === 'discard' ? t('wo_discard_confirm') : t('wo_finish_unlogged')}</p>
        <div className="stack" style={{ marginTop: 16 }}>
          {confirm === 'discard'
            ? <button className="btn danger" onClick={() => { setConfirm(null); W.discardWorkout() }}><Icon name="trash" size={20} />{t('wo_discard')}</button>
            : <button className="btn green" onClick={() => { setConfirm(null); W.finishWorkout() }}><Icon name="check" size={20} />{t('wo_finish')}</button>}
          <button className="btn" onClick={() => setConfirm(null)}>{t('cancel')}</button>
        </div>
      </Sheet>
    </div>
  )
}

function RestBar({ left, total }: { left: number; total: number }) {
  const { t, l, lang } = useT()
  const s = useStore()
  const w = activeWorkout(s)
  const it = w?.items.find((i) => i.id === s.rest?.itemId)
  const set = it?.sets.find((x) => x.id === s.rest?.setId)
  const ex = it ? exById(it.exerciseId, s.custom) : undefined
  return (
    <div className="restbar" role="timer" aria-live="off">
      <div className="rest-row">
        <button className="adj num" onClick={() => W.adjustRest(-15)}>−15 {t('sec')}</button>
        <div className="rest-clock">
          <Clock text={fmtClock(left)} size={44} />
          <div className="lbl"><Icon name="timer" size={14} />{t('wo_rest')}</div>
        </div>
        <button className="adj num" onClick={() => W.adjustRest(15)}>+15 {t('sec')}</button>
      </div>
      <div className="rest-progress"><i style={{ width: `${Math.max(0, Math.min(100, (left / total) * 100))}%` }} /></div>
      <div className="row" style={{ gap: 10 }}>
        <div className="grow" style={{ minWidth: 0 }}>
          <div className="small muted">{t('wo_next_set')}</div>
          <div className="ellipsis" style={{ fontWeight: 600 }}>{ex ? l(ex.name) : ''}{it && set ? <span className="muted num" style={{ marginLeft: 8 }}>{W.setLabel(it, set, lang, s.profile.units)}</span> : null}</div>
        </div>
        <button className="btn sm" onClick={() => W.stopRest()}>{t('wo_skip')}</button>
      </div>
    </div>
  )
}

function SetEditor({ item, set, onClose, onPlates }: { item: WorkoutItem; set: SetEntry; onClose: () => void; onPlates: (kg: number) => void }) {
  const { t, l, lang } = useT()
  const s = useStore()
  const ex = exById(item.exerciseId, s.custom)!
  const units = s.profile.units
  const [weight, setWeight] = useState(set.weight !== undefined ? fmtNum(toUnit(set.weight, units), 'en', 2) : '')
  const [reps, setReps] = useState(String(set.reps ?? item.repLow ?? 8))
  const [sec, setSec] = useState(String(set.seconds ?? 30))
  const [rpe, setRpe] = useState<number | undefined>(set.rpe)
  const step = weightStep(units)
  const wNum = parseFloat(weight.replace(',', '.'))
  const save = (markDone: boolean) => {
    const patch: Partial<SetEntry> = { rpe }
    if (ex.mode === 'wr') patch.weight = isNaN(wNum) ? undefined : Math.round(fromUnit(wNum, units) * 100) / 100
    if (ex.mode !== 't') patch.reps = Math.max(0, parseInt(reps || '0', 10))
    else patch.seconds = Math.max(0, parseInt(sec || '0', 10))
    W.updateSet(item.id, set.id, patch)
    onClose()
    if (markDone && !set.done) setTimeout(() => W.logSet(item.id, set.id), 0)
  }
  const bump = (v: string, d: number, min = 0) => {
    const n = parseFloat(v.replace(',', '.'))
    return fmtNum(Math.max(min, (isNaN(n) ? 0 : n) + d), 'en', 2).replace(/,/g, '')
  }
  return (
    <Sheet open onClose={onClose} title={l(ex.name)}>
      {ex.mode === 'wr' && (
        <>
          <div className="label">{t('weight')}, {t(units)}</div>
          <div className="stepper">
            <button onClick={() => setWeight(bump(weight, -step))} aria-label="-"><Icon name="minus" /></button>
            <div className="v"><input inputMode="decimal" value={weight} placeholder="0" onChange={(e) => setWeight(e.target.value.replace(/[^0-9.,]/g, ''))} /></div>
            <button onClick={() => setWeight(bump(weight, step))} aria-label="+"><Icon name="plus" /></button>
          </div>
          <div className="quick">
            {[-10, -5, 5, 10].map((d) => <button key={d} className="chip num" onClick={() => setWeight(bump(weight, units === 'kg' ? d : d * 2))}>{d > 0 ? '+' : '−'}{Math.abs(units === 'kg' ? d : d * 2)}</button>)}
            {ex.equip.flat().includes('barbell') && <button className="chip" onClick={() => onPlates(isNaN(wNum) ? 60 : fromUnit(wNum, units))}><Icon name="plate" size={16} />{t('wo_plates')}</button>}
          </div>
        </>
      )}
      {ex.mode !== 't' ? (
        <>
          <div className="label" style={{ marginTop: 18 }}>{t('reps_full')}</div>
          <div className="stepper">
            <button onClick={() => setReps(String(Math.max(0, (parseInt(reps || '0', 10)) - 1)))} aria-label="-"><Icon name="minus" /></button>
            <div className="v"><input inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value.replace(/\D/g, ''))} /></div>
            <button onClick={() => setReps(String((parseInt(reps || '0', 10)) + 1))} aria-label="+"><Icon name="plus" /></button>
          </div>
        </>
      ) : (
        <>
          <div className="label" style={{ marginTop: 6 }}>{t('wo_seconds')}</div>
          <div className="stepper">
            <button onClick={() => setSec(String(Math.max(0, parseInt(sec || '0', 10) - 5)))} aria-label="-"><Icon name="minus" /></button>
            <div className="v"><input inputMode="numeric" value={sec} onChange={(e) => setSec(e.target.value.replace(/\D/g, ''))} /></div>
            <button onClick={() => setSec(String(parseInt(sec || '0', 10) + 5))} aria-label="+"><Icon name="plus" /></button>
          </div>
        </>
      )}
      <div className="label" style={{ marginTop: 18 }}>{t('wo_rpe')}</div>
      <div className="small faint" style={{ margin: '-4px 4px 0' }}>{t('wo_rpe_d')}</div>
      <div className="rpe-row">
        {[5, 6, 7, 8, 9, 10].map((v) => <button key={v} className={`num ${rpe === v ? 'on' : ''}`} onClick={() => setRpe(rpe === v ? undefined : v)}>{v}</button>)}
      </div>
      <div className="stack" style={{ marginTop: 20 }}>
        {!set.done && <button className="btn primary" disabled={ex.mode === 'wr' && !(wNum > 0)} onClick={() => save(true)}><Icon name="check" size={22} stroke={2.6} />{t('wo_mark')}</button>}
        <button className="btn" onClick={() => save(false)}>{t('save')}</button>
      </div>
      <div style={{ height: 4 }} aria-hidden>{lang && ''}</div>
    </Sheet>
  )
}

function HoldSheet({ target, onClose, onDone }: { target: number; onClose: () => void; onDone: (sec: number) => void }) {
  const { t } = useT()
  const [start, setStart] = useState<number | null>(null)
  const now = useNow(200)
  const sec = start ? Math.floor((now - start) / 1000) : 0
  const fired = useRef(false)
  useEffect(() => {
    if (start && sec >= target && !fired.current) { fired.current = true; W.beep(); navigator.vibrate?.(200) }
  }, [sec])
  return (
    <Sheet open onClose={onClose} title={`${t('wo_target')}: ${target} ${t('sec')}`}>
      <div style={{ textAlign: 'center', margin: '8px 0 18px' }}>
        <Clock text={fmtClock(start ? sec : target)} size={64} />
        <div className="rest-progress" style={{ marginTop: 18 }}><i style={{ width: `${Math.min(100, (sec / target) * 100)}%`, background: sec >= target ? 'var(--green)' : 'var(--accent)' }} /></div>
      </div>
      {start ? (
        <button className="btn green" onClick={() => onDone(sec)}><Icon name="check" size={22} stroke={2.6} />{t('test_timer_stop')}, {sec} {t('sec')}</button>
      ) : (
        <div className="stack">
          <button className="btn primary" onClick={() => { W.unlockAudio(); setStart(Date.now()) }}><Icon name="play" size={18} fill stroke={0} />{t('wo_hold_start')}</button>
          <button className="btn" onClick={() => onDone(target)}>{t('wo_mark')}, {target} {t('sec')}</button>
        </div>
      )}
    </Sheet>
  )
}

export function ExerciseList({ ids, onPick }: { ids: string[]; onPick: (id: string) => void }) {
  const { t, l } = useT()
  const custom = useStore((s) => s.custom)
  if (!ids.length) return <div className="empty">{t('lib_none')}</div>
  return (
    <div className="list">
      {ids.map((id) => {
        const ex = exById(id, custom)
        if (!ex) return null
        return (
          <button key={id} className="li" onClick={() => onPick(id)}>
            <ExThumb ex={ex} />
            <div className="li-main"><div className="li-title">{l(ex.name)}</div><div className="li-sub">{ex.primary.map((m) => t('m_' + m)).join(', ')}</div></div>
            <Icon name="plus" className="chev" />
          </button>
        )
      })}
    </div>
  )
}


function PickExercise({ placeId, onPick }: { placeId: string; onPick: (id: string) => void }) {
  const { t, l } = useT()
  const s = useStore()
  const place = s.places.find((p) => p.id === placeId)
  const [q, setQ] = useState('')
  const [onlyHere, setOnlyHere] = useState(true)
  const ids = useMemo(() => {
    const qq = q.trim().toLowerCase()
    const list = [...EXERCISES.map((e) => e.id), ...s.custom.map((c) => c.id)]
    return list.filter((id) => {
      const ex = exById(id, s.custom)!
      if (onlyHere && place && !ex.custom && !availableAt(ex, place)) return false
      return !qq || ex.name.some((n) => n.toLowerCase().includes(qq))
    }).sort((a, b) => l(exById(a, s.custom)!.name).localeCompare(l(exById(b, s.custom)!.name)))
  }, [q, onlyHere, place?.id])
  return (
    <>
      <input className="field" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('lib_search')} style={{ marginBottom: 10 }} />
      {place && <div className="chips" style={{ marginBottom: 12 }}><button className={`chip ${onlyHere ? 'on' : ''}`} onClick={() => setOnlyHere(!onlyHere)}><Icon name={PLACE_ICON[place.kind]} size={16} />{t('lib_available', { place: place.name })}</button></div>}
      <ExerciseList ids={ids} onPick={onPick} />
    </>
  )
}

export function PlateSheet({ initial, onClose }: { initial: number; onClose: () => void }) {
  const { t, lang } = useT()
  const units = useStore((s) => s.profile.units)
  const [kg, setKg] = useState(Math.round(initial / 2.5) * 2.5 || 60)
  const [bar, setBar] = useState(20)
  const r = platesFor(kg, bar)
  const groups: { kg: number; n: number; color: string }[] = []
  for (const p of r.plates) { const g = groups.find((x) => x.kg === p.kg); if (g) g.n++; else groups.push({ kg: p.kg, n: 1, color: p.color }) }
  return (
    <Sheet open onClose={onClose} title={t('wo_plates')}>
      <div className="stepper">
        <button onClick={() => setKg(Math.max(bar, kg - 2.5))} aria-label="-"><Icon name="minus" /></button>
        <div className="v"><div className="disp num" style={{ fontSize: 40, fontWeight: 600 }}>{fmtNum(toUnit(kg, units), lang, 2)}</div><small>{t(units)}</small></div>
        <button onClick={() => setKg(kg + 2.5)} aria-label="+"><Icon name="plus" /></button>
      </div>
      <div style={{ margin: '14px 0 6px' }}><Barbell plates={r.plates} /></div>
      {Math.abs(r.achieved - kg) > 0.01 && <div className="small" style={{ color: 'var(--accent)', textAlign: 'center' }}>{t('wo_plates_cant', { w: `${fmtNum(r.achieved, lang)} ${t('kg')}` })}</div>}
      <div className="label" style={{ marginTop: 12 }}>{t('wo_plates_side')}</div>
      <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
        {groups.length ? groups.map((g) => (
          <span key={g.kg} className="tag num" style={{ color: 'var(--text)', gap: 6 }}><i style={{ width: 10, height: 10, borderRadius: 3, background: g.color, display: 'inline-block' }} />{fmtNum(g.kg, lang, 2)} {t('kg')} × {g.n}</span>
        )) : <span className="muted small">—</span>}
      </div>
      <div className="label" style={{ marginTop: 16 }}>{t('wo_plates_bar')}</div>
      <div className="chips">{[20, 15, 10].map((b) => <button key={b} className={`chip num ${bar === b ? 'on' : ''}`} onClick={() => setBar(b)}>{b} {t('kg')}</button>)}</div>
    </Sheet>
  )
}
