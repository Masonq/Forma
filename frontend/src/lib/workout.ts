import { navigate } from '../components/ui'
import { pick, tr } from './i18n'
import { fmtNum, uid } from './format'
import { activeWorkout, useStore } from './store'
import { cancelRestPush, scheduleRestPush } from './sync'
import { alternatives, buildItem, exById, generate, summarize, type Ctx } from './training'
import type { Place, SetEntry, Workout, WorkoutItem } from './types'

export const ctx = (): Ctx => {
  const s = useStore.getState()
  return { profile: s.profile, places: s.places, workouts: s.workouts, custom: s.custom }
}

export function startWorkout(place: Place, items?: WorkoutItem[], title?: string) {
  const st = useStore.getState()
  const cur = activeWorkout(st)
  if (cur) { navigate('/workout'); return }
  const gen = items ? { items, title: title ?? 'split_full' } : generate(ctx(), Date.now(), place)
  const w: Workout = {
    id: uid(), updatedAt: Date.now(), status: 'active', title: gen.title, placeId: place.id,
    startedAt: Date.now(), items: gen.items.map((it) => ({ ...it, id: uid(), sets: it.sets.map((s) => ({ ...s, id: uid(), done: false })) })),
    source: items ? 'plan' : 'plan',
  }
  st.saveWorkout(w)
  navigate('/workout')
}

export function startEmpty(place: Place) {
  const st = useStore.getState()
  if (activeWorkout(st)) { navigate('/workout'); return }
  st.saveWorkout({ id: uid(), updatedAt: Date.now(), status: 'active', title: 'wo_title', placeId: place.id, startedAt: Date.now(), items: [], source: 'empty' })
  navigate('/workout')
}

// Порядок выполнения: внутри суперсета — по кругу
export function sequence(w: Workout): { item: WorkoutItem; set: SetEntry }[] {
  const out: { item: WorkoutItem; set: SetEntry }[] = []
  const seen = new Set<string>()
  for (const it of w.items) {
    if (seen.has(it.id)) continue
    const group = it.superset ? w.items.filter((x) => x.superset === it.superset) : [it]
    group.forEach((g) => seen.add(g.id))
    const n = Math.max(...group.map((g) => g.sets.length))
    for (let i = 0; i < n; i++) for (const g of group) if (g.sets[i]) out.push({ item: g, set: g.sets[i] })
  }
  return out
}

export function current(w: Workout) {
  return sequence(w).find((x) => !x.set.done)
}

export function setLabel(item: WorkoutItem, set: SetEntry, lang: 'ru' | 'en' | 'sr', units: 'kg' | 'lb') {
  const ex = exById(item.exerciseId, useStore.getState().custom)
  if (!ex) return ''
  if (ex.mode === 't') return `${set.seconds ?? 0} ${tr(lang, 'sec')}`
  const reps = `${set.reps ?? 0}`
  if (ex.mode === 'r' || !set.weight) return `${reps} ${tr(lang, 'reps')}`
  const w = units === 'kg' ? set.weight : set.weight * 2.20462
  return `${fmtNum(w, lang, 2)} ${tr(lang, units)} × ${reps}`
}

function patchWorkout(fn: (w: Workout) => Workout) {
  const st = useStore.getState()
  const w = activeWorkout(st)
  if (!w) return
  st.saveWorkout(fn(structuredClone(w)))
}

export function updateSet(itemId: string, setId: string, patch: Partial<SetEntry>) {
  patchWorkout((w) => {
    const it = w.items.find((i) => i.id === itemId)
    const s = it?.sets.find((x) => x.id === setId)
    if (s) Object.assign(s, patch)
    // перенос веса/повторов на следующие неотмеченные подходы этого упражнения
    if (it && s && !s.done && (patch.weight !== undefined || patch.reps !== undefined || patch.seconds !== undefined)) {
      const idx = it.sets.indexOf(s)
      for (const n of it.sets.slice(idx + 1)) {
        if (n.done || n.kind !== s.kind) continue
        if (patch.weight !== undefined) n.weight = patch.weight
        if (patch.reps !== undefined && n.reps === undefined) n.reps = patch.reps
        if (patch.seconds !== undefined && n.seconds === undefined) n.seconds = patch.seconds
      }
    }
    return w
  })
}

export function logSet(itemId: string, setId: string) {
  const st = useStore.getState()
  const w = activeWorkout(st)
  if (!w) return
  const it = w.items.find((i) => i.id === itemId)
  const s = it?.sets.find((x) => x.id === setId)
  if (!it || !s) return
  if (s.done) { updateSet(itemId, setId, { done: false, doneAt: undefined }); return }
  updateSet(itemId, setId, { done: true, doneAt: Date.now() })
  const after = activeWorkout(useStore.getState())!
  const next = current(after)
  if (!next) { stopRest(); return }
  // в суперсете между упражнениями круга не отдыхаем
  const sameRound = it.superset && next.item.superset === it.superset && next.item.id !== it.id
  if (sameRound) { stopRest(); return }
  startRest(s.kind === 'warmup' ? Math.min(60, it.rest) : it.rest, next.item.id, next.set.id)
}

export function startRest(seconds: number, itemId: string, setId: string) {
  const st = useStore.getState()
  const endsAt = Date.now() + seconds * 1000
  st.setRest({ endsAt, total: seconds, itemId, setId })
  const w = activeWorkout(st)
  const item = w?.items.find((i) => i.id === itemId)
  const set = item?.sets.find((x) => x.id === setId)
  const lang = st.profile.lang
  if (item && set) {
    const ex = exById(item.exerciseId, st.custom)
    const body = tr(lang, 'wo_rest_done_b', { next: `${ex ? pick(lang, ex.name) : ''} — ${setLabel(item, set, lang, st.profile.units)}` })
    scheduleRestPush(endsAt, tr(lang, 'wo_rest_done'), body)
  }
}

export function adjustRest(delta: number) {
  const st = useStore.getState()
  const r = st.rest
  if (!r) return
  const endsAt = Math.max(Date.now() + 1000, r.endsAt + delta * 1000)
  st.setRest({ ...r, endsAt, total: Math.max(r.total, Math.round((endsAt - Date.now()) / 1000)) })
  const lang = st.profile.lang
  scheduleRestPush(endsAt, tr(lang, 'wo_rest_done'), '')
}

export function stopRest() {
  const st = useStore.getState()
  if (st.rest) { st.setRest(null); cancelRestPush() }
}

export function addSet(itemId: string, kind: SetEntry['kind'] = 'work') {
  patchWorkout((w) => {
    const it = w.items.find((i) => i.id === itemId)
    if (!it) return w
    const same = [...it.sets].reverse().find((s) => s.kind === kind) ?? it.sets[it.sets.length - 1]
    const ns: SetEntry = { id: uid(), kind, weight: same?.weight, reps: same?.reps, seconds: same?.seconds, done: false }
    if (kind === 'warmup') {
      const firstWork = it.sets.findIndex((s) => s.kind === 'work')
      ns.weight = same?.weight ? Math.round((same.weight * 0.5) / 2.5) * 2.5 : undefined
      ns.reps = 8
      it.sets.splice(firstWork < 0 ? 0 : firstWork, 0, ns)
    } else it.sets.push(ns)
    return w
  })
}

export function removeSet(itemId: string, setId: string) {
  patchWorkout((w) => {
    const it = w.items.find((i) => i.id === itemId)
    if (it) it.sets = it.sets.filter((s) => s.id !== setId)
    return w
  })
}

export function addExercise(exId: string) {
  const ex = exById(exId, useStore.getState().custom)
  if (!ex) return
  patchWorkout((w) => { w.items.push(buildItem(ex, ctx(), false)); return w })
}

export function replaceExercise(itemId: string, exId: string) {
  const ex = exById(exId, useStore.getState().custom)
  if (!ex) return
  patchWorkout((w) => {
    const i = w.items.findIndex((x) => x.id === itemId)
    if (i < 0) return w
    const old = w.items[i]
    const ni = buildItem(ex, ctx(), i < 2)
    const done = old.sets.filter((s) => s.done)
    if (done.length) {
      // отмеченные подходы остаются у старого упражнения
      old.sets = done
      w.items.splice(i + 1, 0, { ...ni, superset: old.superset })
    } else w.items[i] = { ...ni, superset: old.superset }
    return w
  })
}

export function removeExercise(itemId: string) {
  patchWorkout((w) => { w.items = w.items.filter((i) => i.id !== itemId); return w })
}

export function toggleSuperset(itemId: string) {
  patchWorkout((w) => {
    const i = w.items.findIndex((x) => x.id === itemId)
    const it = w.items[i]
    if (!it) return w
    if (it.superset) {
      const g = it.superset
      it.superset = undefined
      const rest = w.items.filter((x) => x.superset === g)
      if (rest.length < 2) rest.forEach((x) => (x.superset = undefined))
    } else {
      const next = w.items[i + 1]
      if (!next) return w
      const g = next.superset ?? uid()
      it.superset = g
      next.superset = g
    }
    return w
  })
}

export function changePlace(place: Place) {
  const c = ctx()
  patchWorkout((w) => {
    w.placeId = place.id
    const used = new Set(w.items.map((i) => i.exerciseId))
    w.items = w.items.map((it, idx) => {
      if (it.sets.some((s) => s.done)) return it
      const ex = exById(it.exerciseId, c.custom)
      if (!ex || ex.custom) return it
      const alt = [ex, ...alternatives(ex.id, place, [...used])].find((a) => a.equip.every((g) => g.some((e) => place.equip.includes(e))) && (!place.quiet || a.quiet) && (!place.small || a.small))
      if (!alt || alt.id === ex.id) return it
      used.add(alt.id)
      return { ...buildItem(alt, c, idx < 2), superset: it.superset }
    })
    return w
  })
}

export function finishWorkout(): string | undefined {
  const st = useStore.getState()
  const w = activeWorkout(st)
  if (!w) return
  stopRest()
  const cleaned: Workout = {
    ...structuredClone(w),
    items: w.items.map((it) => ({ ...it, sets: it.sets.filter((s) => s.done) })).filter((it) => it.sets.length),
  }
  if (!cleaned.items.length) { st.deleteWorkout(w.id); navigate('/', true); return }
  const { summary, profilePatch } = summarize(cleaned, ctx())
  st.saveWorkout({ ...cleaned, status: 'done', endedAt: Date.now(), summary })
  st.setProfile(profilePatch)
  navigate(`/summary/${w.id}`, true)
  return w.id
}

export function discardWorkout() {
  const st = useStore.getState()
  const w = activeWorkout(st)
  if (!w) return
  stopRest()
  st.deleteWorkout(w.id)
  navigate('/', true)
}

// короткий сигнал без файлов
let actx: AudioContext | null = null
export function beep() {
  try {
    actx ??= new AudioContext()
    const t = actx.currentTime
    for (let i = 0; i < 3; i++) {
      const o = actx.createOscillator(), g = actx.createGain()
      o.frequency.value = i === 2 ? 1320 : 880
      g.gain.setValueAtTime(0.0001, t + i * 0.22)
      g.gain.exponentialRampToValueAtTime(0.25, t + i * 0.22 + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.22 + 0.18)
      o.connect(g).connect(actx.destination)
      o.start(t + i * 0.22)
      o.stop(t + i * 0.22 + 0.2)
    }
  } catch { /* звук недоступен */ }
}
export function unlockAudio() {
  try { actx ??= new AudioContext(); if (actx.state === 'suspended') actx.resume() } catch { /* */ }
}
