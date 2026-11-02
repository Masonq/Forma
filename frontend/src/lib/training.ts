import { EXERCISES, EX_BY_ID, type Exercise, type Pattern, type Muscle } from '../data/exercises'
import { BRANCHES, BRANCH_OF, PASSES_TO_UNLOCK, type BranchId } from '../data/skills'
import { e1rm, uid, weekday } from './format'
import type { CustomExercise, Goal, Place, Profile, RecordHit, SetEntry, Workout, WorkoutItem, WorkoutSummary } from './types'

// ——— Доступность ———
export function availableAt(ex: Exercise, place: Place): boolean {
  if (place.quiet && !ex.quiet) return false
  if (place.small && !ex.small) return false
  if (ex.equip.some((g) => !g.some((e) => place.equip.includes(e)))) return false
  return true
}

export function exById(id: string, custom: CustomExercise[] = []): Exercise | undefined {
  const e = EX_BY_ID[id]
  if (e) return e
  const c = custom.find((x) => x.id === id)
  if (!c) return undefined
  return {
    id: c.id, name: [c.name, c.name, c.name], primary: c.primary, secondary: [], equip: [], mode: c.mode,
    pattern: c.pattern, prio: 0, quiet: true, small: true, level: 2, steps: [], custom: true,
  }
}

// ——— Схема недели ———
type Split = 'full_a' | 'full_b' | 'upper' | 'lower'
const TEMPLATES: Record<Split, Pattern[]> = {
  full_a: ['squat', 'push_h', 'pull_v', 'hinge', 'core'],
  full_b: ['lunge', 'push_v', 'pull_h', 'hinge', 'core'],
  upper: ['push_h', 'pull_v', 'push_v', 'pull_h', 'biceps', 'triceps'],
  lower: ['squat', 'hinge', 'lunge', 'calves', 'core'],
}
const FALLBACK: Partial<Record<Pattern, Pattern[]>> = {
  pull_v: ['pull_h'], pull_h: ['pull_v'], push_v: ['push_h'], lunge: ['squat'], squat: ['lunge'],
  biceps: ['pull_h'], triceps: ['push_h'], calves: ['squat'], delts: ['push_v'],
}

export function splitFor(profile: Profile, ts: number): Split {
  const days = [...profile.days].sort()
  const wd = weekday(ts)
  let idx = days.indexOf(wd)
  if (idx < 0) idx = days.filter((d) => d < wd).length
  if (days.length >= 4) return idx % 2 === 0 ? 'upper' : 'lower'
  return idx % 2 === 0 ? 'full_a' : 'full_b'
}
export const splitTitleKey = (s: Split) => (s.startsWith('full') ? 'split_full' : s === 'upper' ? 'split_upper' : 'split_lower')

interface Dose { sets: number; low: number; high: number; rest: number }
function dose(goal: Goal, main: boolean, level: Profile['level']): Dose {
  const base: Record<Goal, [Dose, Dose]> = {
    strength: [{ sets: 5, low: 3, high: 5, rest: 180 }, { sets: 3, low: 8, high: 10, rest: 90 }],
    mass: [{ sets: 4, low: 8, high: 12, rest: 120 }, { sets: 3, low: 10, high: 12, rest: 75 }],
    cut: [{ sets: 3, low: 10, high: 15, rest: 60 }, { sets: 3, low: 12, high: 15, rest: 45 }],
    shape: [{ sets: 3, low: 8, high: 12, rest: 90 }, { sets: 3, low: 10, high: 12, rest: 60 }],
    health: [{ sets: 3, low: 10, high: 12, rest: 75 }, { sets: 2, low: 10, high: 12, rest: 60 }],
  }
  const d = { ...base[goal][main ? 0 : 1] }
  if (level === 'new') d.sets = Math.max(2, d.sets - 1)
  return d
}

// ——— История ———
export interface ExHistoryRow { workoutId: string; at: number; sets: SetEntry[] }
export function historyOf(exId: string, workouts: Workout[]): ExHistoryRow[] {
  const rows: ExHistoryRow[] = []
  for (const w of workouts) {
    if (w.status !== 'done' || w.deleted) continue
    for (const it of w.items) {
      if (it.exerciseId !== exId) continue
      const sets = it.sets.filter((s) => s.done && s.kind === 'work')
      if (sets.length) rows.push({ workoutId: w.id, at: w.startedAt, sets })
    }
  }
  return rows.sort((a, b) => b.at - a.at)
}

function weightIncrement(ex: Exercise): number {
  const eq = ex.equip.flat()
  if (eq.includes('barbell')) return 2.5
  if (eq.includes('kettlebell')) return 4
  if (eq.includes('dumbbell')) return 2
  return 2.5
}

// ——— Генератор ———
export interface Ctx { profile: Profile; places: Place[]; workouts: Workout[]; custom: CustomExercise[] }

function skillPick(branch: BranchId, ctx: Ctx, place: Place): Exercise | undefined {
  const b = BRANCHES.find((x) => x.id === branch)!
  const lvl = ctx.profile.skill[branch] ?? 0
  for (let i = Math.min(lvl, b.steps.length - 1); i >= 0; i--) {
    const ex = EX_BY_ID[b.steps[i].ex]
    if (ex && availableAt(ex, place)) return ex
  }
  return undefined
}

function pickFor(pattern: Pattern, ctx: Ctx, place: Place, used: Set<string>, seed: number): Exercise | undefined {
  const tryPattern = (p: Pattern) => {
    const cands = EXERCISES.filter((e) => e.pattern === p && availableAt(e, place) && !used.has(e.id))
      .sort((a, b) => b.prio - a.prio)
    if (!cands.length) return undefined
    let top = cands[0]
    // небольшая вариативность среди равных по силе вариантов
    const close = cands.filter((c) => top.prio - c.prio <= 6 && !BRANCH_OF[c.id])
    if (close.length > 1) top = close[seed % close.length]
    const br = BRANCH_OF[top.id]
    if (br) {
      const s = skillPick(br.branch, ctx, place)
      if (s && !used.has(s.id)) return s
    }
    return top
  }
  return tryPattern(pattern) ?? (FALLBACK[pattern] ?? []).map(tryPattern).find(Boolean)
}

export function buildItem(ex: Exercise, ctx: Ctx, main: boolean): WorkoutItem {
  const p = ctx.profile
  const d = dose(p.goal, main && ex.mode === 'wr', p.level)
  const rest = p.restDefault || d.rest
  const br = BRANCH_OF[ex.id]
  const item: WorkoutItem = { id: uid(), exerciseId: ex.id, rest, sets: [] }
  if (br) {
    const step = BRANCHES.find((b) => b.id === br.branch)!.steps[br.index]
    const n = 3
    const low = ex.mode === 't' ? Math.max(15, Math.round(step.goal * 0.5)) : Math.max(3, Math.round(step.goal * 0.6))
    item.repLow = low
    item.repHigh = step.goal
    const prev = historyOf(ex.id, ctx.workouts)[0]
    for (let i = 0; i < n; i++) {
      const prevSet = prev?.sets[i]
      if (ex.mode === 't') item.sets.push({ id: uid(), kind: 'work', seconds: prevSet?.seconds ?? low, done: false })
      else item.sets.push({ id: uid(), kind: 'work', reps: prevSet?.reps ?? low, done: false })
    }
    item.rest = p.restDefault || 60
    return item
  }
  item.repLow = d.low
  item.repHigh = d.high
  const hist = historyOf(ex.id, ctx.workouts)[0]
  let weight: number | undefined
  if (ex.mode === 'wr' && hist) {
    weight = Math.max(...hist.sets.map((s) => s.weight ?? 0)) || undefined
    const allTop = hist.sets.length >= d.sets && hist.sets.every((s) => (s.reps ?? 0) >= d.high)
    if (weight && allTop) {
      const inc = weightIncrement(ex)
      weight += inc
      item.note = `up:${inc}`
    }
  }
  if (ex.mode === 'wr' && main && weight && ex.equip.flat().includes('barbell')) {
    item.sets.push({ id: uid(), kind: 'warmup', weight: Math.round((weight * 0.5) / 2.5) * 2.5, reps: 8, done: false })
    item.sets.push({ id: uid(), kind: 'warmup', weight: Math.round((weight * 0.75) / 2.5) * 2.5, reps: 4, done: false })
  }
  for (let i = 0; i < d.sets; i++) {
    const prevSet = hist?.sets[i]
    if (ex.mode === 't') item.sets.push({ id: uid(), kind: 'work', seconds: prevSet?.seconds ?? 30, done: false })
    else if (ex.mode === 'r') item.sets.push({ id: uid(), kind: 'work', reps: prevSet?.reps ?? d.low, done: false })
    else item.sets.push({ id: uid(), kind: 'work', weight, reps: d.low, done: false })
  }
  return item
}

export function placeFor(ctx: Ctx, ts: number): Place {
  const pid = ctx.profile.dayPlace[String(weekday(ts))] ?? ctx.profile.defaultPlace
  return ctx.places.find((p) => p.id === pid && !p.deleted) ?? ctx.places.find((p) => !p.deleted)!
}

export function generate(ctx: Ctx, ts: number, place: Place, seedShift = 0): { title: string; split: Split; items: WorkoutItem[] } {
  const split = splitFor(ctx.profile, ts)
  let patterns = [...TEMPLATES[split]]
  if (ctx.profile.goal === 'health') patterns = patterns.slice(0, 4)
  if (ctx.profile.level === 'pro' && split.startsWith('full')) patterns.push(split === 'full_a' ? 'biceps' : 'triceps')
  if (ctx.profile.goal === 'cut') patterns.push('cardio')
  const used = new Set<string>()
  const items: WorkoutItem[] = []
  const seed = ctx.profile.seed + seedShift + Math.floor(ts / 86400000 / 7)
  patterns.forEach((p, i) => {
    const ex = pickFor(p, ctx, place, used, seed + i)
    if (!ex) return
    used.add(ex.id)
    items.push(buildItem(ex, ctx, i < 2))
  })
  return { title: splitTitleKey(split), split, items }
}

export function estimateMinutes(items: WorkoutItem[]): number {
  let sec = 300
  for (const it of items) for (const s of it.sets) sec += (s.seconds ?? 40) + (s.kind === 'warmup' ? 60 : it.rest)
  return Math.round(sec / 60 / 5) * 5
}

export function alternatives(exId: string, place: Place, exclude: string[] = []): Exercise[] {
  const ex = EX_BY_ID[exId]
  if (!ex) return EXERCISES.filter((e) => availableAt(e, place)).slice(0, 20)
  return EXERCISES.filter((e) => e.id !== exId && !exclude.includes(e.id) && availableAt(e, place) &&
    (e.pattern === ex.pattern || e.primary.some((m) => ex.primary.includes(m))))
    .sort((a, b) => Number(b.pattern === ex.pattern) - Number(a.pattern === ex.pattern) || b.prio - a.prio)
}

export function musclesOf(items: WorkoutItem[], custom: CustomExercise[] = []): Muscle[] {
  const s = new Set<Muscle>()
  for (const it of items) exById(it.exerciseId, custom)?.primary.forEach((m) => s.add(m))
  return [...s]
}

// ——— Рекорды ———
export interface Best { weight: number; e1rm: number; reps: number; time: number; volume: number }
export function bestOf(exId: string, workouts: Workout[], excludeId?: string): Best {
  const b: Best = { weight: 0, e1rm: 0, reps: 0, time: 0, volume: 0 }
  for (const w of workouts) {
    if (w.status !== 'done' || w.deleted || w.id === excludeId) continue
    for (const it of w.items) {
      if (it.exerciseId !== exId) continue
      let vol = 0
      for (const s of it.sets) {
        if (!s.done || s.kind !== 'work') continue
        const wt = s.weight ?? 0, r = s.reps ?? 0
        b.weight = Math.max(b.weight, wt)
        if (wt && r) b.e1rm = Math.max(b.e1rm, e1rm(wt, r))
        b.reps = Math.max(b.reps, r)
        b.time = Math.max(b.time, s.seconds ?? 0)
        vol += wt * r
      }
      b.volume = Math.max(b.volume, vol)
    }
  }
  return b
}

export function setVolume(w: Workout) {
  let v = 0, n = 0
  for (const it of w.items) for (const s of it.sets) if (s.done && s.kind === 'work') { v += (s.weight ?? 0) * (s.reps ?? 0); n++ }
  return { volume: v, sets: n }
}

export function summarize(w: Workout, ctx: Ctx): { summary: WorkoutSummary; profilePatch: Partial<Profile> } {
  const records: RecordHit[] = []
  const others = ctx.workouts.filter((x) => x.id !== w.id)
  for (const it of w.items) {
    const done = it.sets.filter((s) => s.done && s.kind === 'work')
    if (!done.length) continue
    const ex = exById(it.exerciseId, ctx.custom)
    if (!ex) continue
    const prev = bestOf(it.exerciseId, others)
    const hadHistory = historyOf(it.exerciseId, others).length > 0
    if (!hadHistory) continue // первая попытка — это старт, а не рекорд
    const cur = bestOf(it.exerciseId, [{ ...w, status: 'done' }])
    if (ex.mode === 'wr') {
      if (cur.weight > prev.weight) records.push({ exerciseId: ex.id, kind: 'weight', value: cur.weight, prev: prev.weight })
      else if (cur.e1rm > prev.e1rm + 0.01) records.push({ exerciseId: ex.id, kind: 'e1rm', value: cur.e1rm, prev: prev.e1rm })
    } else if (ex.mode === 'r') {
      if (cur.reps > prev.reps) records.push({ exerciseId: ex.id, kind: 'reps', value: cur.reps, prev: prev.reps })
    } else if (cur.time > prev.time) records.push({ exerciseId: ex.id, kind: 'time', value: cur.time, prev: prev.time })
  }
  // ступени навыков
  const skill = { ...ctx.profile.skill }
  const passes = { ...ctx.profile.skillPasses }
  const stepUps: WorkoutSummary['stepUps'] = []
  const stepProgress: WorkoutSummary['stepProgress'] = []
  for (const it of w.items) {
    const br = BRANCH_OF[it.exerciseId]
    if (!br || br.index !== skill[br.branch]) continue
    const branch = BRANCHES.find((b) => b.id === br.branch)!
    const goal = branch.steps[br.index].goal
    const work = it.sets.filter((s) => s.done && s.kind === 'work')
    const ex = EX_BY_ID[it.exerciseId]
    const ok = work.length >= 3 && work.every((s) => (ex.mode === 't' ? s.seconds ?? 0 : s.reps ?? 0) >= goal)
    if (!ok) continue
    passes[br.branch] = (passes[br.branch] ?? 0) + 1
    if (passes[br.branch] >= PASSES_TO_UNLOCK && br.index < branch.steps.length - 1) {
      skill[br.branch] = br.index + 1
      passes[br.branch] = 0
      stepUps.push({ branch: br.branch, from: it.exerciseId, to: branch.steps[br.index + 1].ex })
    } else stepProgress.push({ branch: br.branch, ex: it.exerciseId, passes: passes[br.branch] })
  }
  const { volume, sets } = setVolume(w)
  return { summary: { records, stepUps, stepProgress, volume, sets }, profilePatch: { skill, skillPasses: passes } }
}

// ——— Серия ———
// Считаем тренировки подряд: дни вне плана не мешают, один пропущенный плановый день в неделю «замораживается».
export function streak(workouts: Workout[], planDays: number[], now = Date.now()): { count: number; frozen: boolean } {
  const done = workouts.filter((w) => w.status === 'done' && !w.deleted)
  if (!done.length) return { count: 0, frozen: false }
  const days = new Set(done.map((w) => new Date(w.startedAt).toDateString()))
  const first = Math.min(...done.map((w) => w.startedAt))
  let count = 0
  let frozen = false
  const usedFreeze = new Set<number>()
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  let today = true
  while (d.getTime() >= first - 86400000) {
    const key = d.toDateString()
    const wd = (d.getDay() + 6) % 7
    if (days.has(key)) count++
    else if (!today && planDays.includes(wd)) {
      const wk = Math.floor((d.getTime() - wd * 86400000) / (7 * 86400000))
      if (usedFreeze.has(wk)) break
      usedFreeze.add(wk)
      if (count === 0 || wk === Math.floor((now - ((new Date(now).getDay() + 6) % 7) * 86400000) / (7 * 86400000))) frozen = true
    }
    today = false
    d.setDate(d.getDate() - 1)
  }
  return { count, frozen }
}

export function muscleSetsSince(workouts: Workout[], since: number, custom: CustomExercise[] = []): Record<Muscle, number> {
  const r = {} as Record<Muscle, number>
  for (const w of workouts) {
    if (w.status !== 'done' || w.deleted || w.startedAt < since) continue
    for (const it of w.items) {
      const ex = exById(it.exerciseId, custom)
      if (!ex) continue
      const n = it.sets.filter((s) => s.done && s.kind === 'work').length
      for (const m of ex.primary) r[m] = (r[m] ?? 0) + n
      for (const m of ex.secondary) r[m] = (r[m] ?? 0) + n * 0.5
    }
  }
  return r
}
