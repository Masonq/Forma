import { EXERCISES } from '../data/exercises'
import { uid } from './format'
import { exById } from './training'
import type { CustomExercise, SetEntry, Workout, WorkoutItem } from './types'

function parseCSV(text: string): string[][] {
  const firstLine = text.split(/\r?\n/, 1)[0]
  const sep = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ','
  const rows: string[][] = []
  let row: string[] = [], cell = '', q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++ } else q = false }
      else cell += c
    } else if (c === '"') q = true
    else if (c === sep) { row.push(cell); cell = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(cell); cell = ''
      if (row.some((x) => x !== '')) rows.push(row)
      row = []
    } else cell += c
  }
  row.push(cell)
  if (row.some((x) => x !== '')) rows.push(row)
  return rows
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '')
const ALIASES: Record<string, string> = {
  benchpressbarbell: 'bench_press', benchpress: 'bench_press', benchpressdumbbell: 'db_bench',
  squatbarbell: 'back_squat', backsquat: 'back_squat', squat: 'squat', airsquat: 'squat',
  deadliftbarbell: 'deadlift', deadlift: 'deadlift', romaniandeadliftbarbell: 'rdl', romaniandeadliftdumbbell: 'db_rdl',
  pullup: 'pullup', pullups: 'pullup', chinup: 'chinup', latpulldowncable: 'lat_pulldown', latpulldown: 'lat_pulldown',
  bentoverrowbarbell: 'barbell_row', barbellrow: 'barbell_row', dumbbellrow: 'db_row', bentoverrowdumbbell: 'db_row',
  seatedcablerow: 'cable_row', seatedrowcable: 'cable_row', overheadpressbarbell: 'ohp', overheadpress: 'ohp',
  shoulderpressdumbbell: 'db_shoulder_press', seatedshoulderpressdumbbell: 'db_shoulder_press',
  legpress: 'leg_press', legpressmachine: 'leg_press', lateralraisedumbbell: 'lateral_raise', lateralraise: 'lateral_raise',
  bicepcurldumbbell: 'db_curl', bicepscurldumbbell: 'db_curl', bicepcurlbarbell: 'barbell_curl', bicepscurlbarbell: 'barbell_curl',
  tricepspushdown: 'tricep_pushdown', tricepspushdowncable: 'tricep_pushdown', triceppushdown: 'tricep_pushdown',
  pushup: 'pushup', pushups: 'pushup', plank: 'plank', gobletsquat: 'goblet_squat', gobletsquatkettlebell: 'goblet_squat',
  lungedumbbell: 'db_lunge', hipthrust: 'hip_thrust', hipthrustbarbell: 'hip_thrust', glutebridge: 'glute_bridge',
  calfraise: 'calf_raise', standingcalfraise: 'calf_raise', hanginglegraise: 'hanging_leg_raise', dip: 'dips', chestdip: 'dips',
  tricepsdip: 'dips', kettlebellswing: 'kb_swing', burpee: 'burpee', running: 'run', run: 'run',
  chestpressmachine: 'machine_chest_press', cablefly: 'cable_fly', chestflydumbbell: 'db_fly',
}
for (const e of EXERCISES) ALIASES[norm(e.name[1])] ??= e.id

function parseDate(s: string): number {
  if (!s) return NaN
  const iso = Date.parse(s.replace(' ', 'T'))
  if (!isNaN(iso)) return iso
  const p = Date.parse(s.replace(',', ''))
  return p
}

const num = (s?: string) => {
  if (s == null || s === '') return undefined
  const n = parseFloat(s.replace(',', '.'))
  return isNaN(n) ? undefined : n
}

export interface ImportResult { workouts: Workout[]; custom: CustomExercise[] }

export function importCSV(text: string, existingCustom: CustomExercise[], placeId: string): ImportResult | null {
  const rows = parseCSV(text.replace(/^\uFEFF/, ''))
  if (rows.length < 2) return null
  const h = rows[0].map((x) => x.trim().toLowerCase())
  const col = (...names: string[]) => names.map((n) => h.indexOf(n)).find((i) => i >= 0) ?? -1
  const hevy = h.includes('exercise_title')
  const cDate = hevy ? col('start_time') : col('date')
  const cEnd = col('end_time')
  const cDur = col('duration')
  const cTitle = hevy ? col('title') : col('workout name')
  const cEx = hevy ? col('exercise_title') : col('exercise name')
  const cSetType = col('set_type', 'set order')
  const cW = hevy ? col('weight_kg') : col('weight')
  const cR = col('reps')
  const cS = hevy ? col('duration_seconds') : col('seconds')
  const cRpe = col('rpe')
  const cSuper = col('superset_id')
  if (cDate < 0 || cEx < 0) return null

  const custom = [...existingCustom]
  const findEx = (name: string, sample: { w?: number; s?: number }) => {
    const k = norm(name)
    if (ALIASES[k]) return ALIASES[k]
    const base = norm(name.replace(/\(.*?\)/g, ''))
    if (ALIASES[base]) return ALIASES[base]
    let c = custom.find((x) => norm(x.name) === k)
    if (!c) {
      c = { id: uid(), updatedAt: Date.now(), name, mode: sample.w ? 'wr' : sample.s ? 't' : 'r', primary: [], pattern: 'cardio' }
      custom.push(c)
    }
    return c.id
  }

  const byWorkout = new Map<string, Workout>()
  for (const r of rows.slice(1)) {
    const start = parseDate(r[cDate])
    if (isNaN(start)) continue
    const title = (cTitle >= 0 ? r[cTitle] : '') || 'Workout'
    const key = `${start}|${title}`
    let w = byWorkout.get(key)
    if (!w) {
      let end: number | undefined
      if (cEnd >= 0) end = parseDate(r[cEnd])
      else if (cDur >= 0) {
        const d = r[cDur]
        const hm = d.match(/(\d+)\s*h/), mm = d.match(/(\d+)\s*m/), sec = num(d)
        end = start + ((hm ? +hm[1] * 60 : 0) + (mm ? +mm[1] : 0)) * 60000 || (sec ? start + sec * 1000 : undefined)
      }
      w = { id: uid(), updatedAt: Date.now(), status: 'done', title, placeId, startedAt: start, endedAt: end && !isNaN(end) ? end : start + 3600000, items: [], source: 'import' }
      byWorkout.set(key, w)
    }
    const weight = num(r[cW]), reps = num(r[cR]), seconds = num(r[cS])
    const exId = findEx(r[cEx], { w: weight, s: seconds })
    const superset = cSuper >= 0 && r[cSuper] ? `${key}:${r[cSuper]}` : undefined
    let it: WorkoutItem | undefined = w.items[w.items.length - 1]
    if (!it || it.exerciseId !== exId) {
      it = { id: uid(), exerciseId: exId, rest: 90, sets: [], superset }
      w.items.push(it)
    }
    const st = (cSetType >= 0 ? r[cSetType] : '').toLowerCase()
    const set: SetEntry = {
      id: uid(), kind: st === 'warmup' || st === 'w' ? 'warmup' : 'work', done: true, doneAt: start,
      weight: weight || undefined, reps: reps || undefined, seconds: seconds || undefined, rpe: num(cRpe >= 0 ? r[cRpe] : undefined),
    }
    it.sets.push(set)
  }
  const workouts = [...byWorkout.values()].filter((w) => w.items.length)
  return { workouts, custom: custom.filter((c) => !existingCustom.includes(c)) }
}

export function exportCSV(workouts: Workout[], custom: CustomExercise[]): string {
  const head = ['Date', 'Workout Name', 'Duration', 'Exercise Name', 'Set Order', 'Weight', 'Reps', 'Distance', 'Seconds', 'Notes', 'Workout Notes', 'RPE']
  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [head.join(',')]
  const pad = (n: number) => String(n).padStart(2, '0')
  for (const w of [...workouts].filter((x) => x.status === 'done').sort((a, b) => a.startedAt - b.startedAt)) {
    const d = new Date(w.startedAt)
    const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    const durMin = Math.round(((w.endedAt ?? w.startedAt) - w.startedAt) / 60000)
    const dur = `${Math.floor(durMin / 60)}h ${durMin % 60}m`
    for (const it of w.items) {
      const ex = exById(it.exerciseId, custom)
      let order = 0
      for (const s of it.sets) {
        if (!s.done) continue
        const so = s.kind === 'warmup' ? 'W' : String(++order)
        lines.push([date, w.title, dur, ex?.name[1] ?? it.exerciseId, so, s.weight ?? '', s.reps ?? '', '', s.seconds ?? '', it.note?.startsWith('up:') ? '' : it.note ?? '', '', s.rpe ?? ''].map(esc).join(','))
      }
    }
  }
  return lines.join('\n')
}
