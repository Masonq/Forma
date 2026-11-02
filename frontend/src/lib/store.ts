import { create } from 'zustand'
import type { Lang } from '../data/exercises'
import * as db from './db'
import { uid } from './format'
import type { CustomExercise, Measurement, Place, Profile, SyncKind, Workout } from './types'

function detectLang(): Lang {
  const l = (navigator.language || 'ru').toLowerCase()
  if (l.startsWith('sr') || l.startsWith('hr') || l.startsWith('bs')) return 'sr'
  if (l.startsWith('ru') || l.startsWith('uk') || l.startsWith('be')) return 'ru'
  return 'en'
}

export function defaultProfile(): Profile {
  return {
    id: 'me', updatedAt: 0, name: '', lang: detectLang(), units: 'kg', goal: 'shape', level: 'new',
    onboarded: false, restDefault: 0, sound: true, days: [0, 2, 4], dayPlace: {}, defaultPlace: '',
    skill: { push: 0, squat: 0, core: 0, pull: 0 }, skillPasses: { push: 0, squat: 0, core: 0, pull: 0 },
    seed: Math.floor(Math.random() * 1000), createdAt: Date.now(),
  }
}

export interface RestState { endsAt: number; total: number; itemId: string; setId: string }
export interface Toast { id: number; text: string; tone?: 'ok' | 'warn' }

interface S {
  ready: boolean
  profile: Profile
  places: Place[]
  workouts: Workout[]
  measurements: Measurement[]
  custom: CustomExercise[]
  rest: RestState | null
  toast: Toast | null
  synced: boolean
  init(): Promise<void>
  setProfile(p: Partial<Profile>): void
  savePlace(p: Place): void
  deletePlace(id: string): void
  saveWorkout(w: Workout): void
  deleteWorkout(id: string): void
  saveMeasurement(m: Measurement): void
  deleteMeasurement(id: string): void
  saveCustom(c: CustomExercise): void
  setRest(r: RestState | null): void
  showToast(text: string, tone?: Toast['tone']): void
  setSynced(v: boolean): void
  applyRemote(kind: SyncKind, recs: any[]): void
}

let onChange: (() => void) | null = null
export const setChangeListener = (fn: () => void) => { onChange = fn }

function persist(kind: SyncKind, rec: { id: string }) {
  db.put(kind, rec).then(() => onChange?.())
}

const touch = <T extends { updatedAt: number }>(x: T): T => ({ ...x, updatedAt: Date.now() })
const upsert = <T extends { id: string }>(arr: T[], x: T) => {
  const i = arr.findIndex((a) => a.id === x.id)
  if (i < 0) return [...arr, x]
  const c = arr.slice(); c[i] = x; return c
}

export const useStore = create<S>((set, get) => ({
  ready: false,
  profile: defaultProfile(),
  places: [],
  workouts: [],
  measurements: [],
  custom: [],
  rest: null,
  toast: null,
  synced: true,

  async init() {
    const [profiles, places, workouts, measurements, custom, rest] = await Promise.all([
      db.loadAll('profile'), db.loadAll('place'), db.loadAll('workout'), db.loadAll('measurement'), db.loadAll('exercise'),
      db.meta<RestState>('rest'),
    ])
    const profile = { ...defaultProfile(), ...(profiles[0] ?? {}) }
    set({
      ready: true, profile,
      places: places.filter((p) => !p.deleted).sort((a, b) => a.order - b.order),
      workouts: workouts.filter((w) => !w.deleted),
      measurements: measurements.filter((m) => !m.deleted),
      custom: custom.filter((c) => !c.deleted),
      rest: rest && rest.endsAt > Date.now() - 60000 ? rest : null,
    })
  },

  setProfile(p) {
    const profile = touch({ ...get().profile, ...p })
    set({ profile })
    persist('profile', profile)
  },

  savePlace(p) {
    const x = touch(p)
    set({ places: upsert(get().places, x).sort((a, b) => a.order - b.order) })
    persist('place', x)
  },

  deletePlace(id) {
    const p = get().places.find((x) => x.id === id)
    if (!p) return
    const x = touch({ ...p, deleted: true })
    set({ places: get().places.filter((a) => a.id !== id) })
    persist('place', x)
  },

  saveWorkout(w) {
    const x = touch(w)
    set({ workouts: upsert(get().workouts, x) })
    persist('workout', x)
  },

  deleteWorkout(id) {
    const w = get().workouts.find((x) => x.id === id)
    if (!w) return
    const x = touch({ ...w, deleted: true })
    set({ workouts: get().workouts.filter((a) => a.id !== id) })
    persist('workout', x)
  },

  saveMeasurement(m) {
    const x = touch(m)
    set({ measurements: upsert(get().measurements, x) })
    persist('measurement', x)
  },

  deleteMeasurement(id) {
    const m = get().measurements.find((x) => x.id === id)
    if (!m) return
    const x = touch({ ...m, deleted: true })
    set({ measurements: get().measurements.filter((a) => a.id !== id) })
    persist('measurement', x)
  },

  saveCustom(c) {
    const x = touch(c)
    set({ custom: upsert(get().custom, x) })
    persist('exercise', x)
  },

  setRest(r) {
    set({ rest: r })
    db.setMeta('rest', r)
  },

  showToast(text, tone) {
    const id = Date.now()
    set({ toast: { id, text, tone } })
    setTimeout(() => { if (get().toast?.id === id) set({ toast: null }) }, 3200)
  },

  setSynced(v) { set({ synced: v }) },

  applyRemote(kind, recs) {
    if (!recs.length) return
    const st = get()
    if (kind === 'profile') {
      const r = recs[0]
      if (r.updatedAt > st.profile.updatedAt) set({ profile: { ...defaultProfile(), ...r } })
      return
    }
    const key = ({ place: 'places', workout: 'workouts', measurement: 'measurements', exercise: 'custom' } as const)[kind]
    let arr: any[] = (st as any)[key]
    for (const r of recs) {
      const cur = arr.find((a) => a.id === r.id)
      if (cur && cur.updatedAt >= r.updatedAt) continue
      arr = r.deleted ? arr.filter((a) => a.id !== r.id) : upsert(arr, r)
    }
    if (kind === 'place') arr = arr.sort((a, b) => a.order - b.order)
    set({ [key]: arr } as any)
  },
}))

export const activeWorkout = (s: { workouts: Workout[] }) => s.workouts.find((w) => w.status === 'active' && !w.deleted)
export const newId = uid
